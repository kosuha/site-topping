import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabase: SupabaseClient = createClient(
  process.env.STORAGE_NEXT_PUBLIC_SUPABASE_URL!,
  process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 공통: 허용된 Origin인지 확인하는 함수
async function validateOrigin(request: Request, id: string): Promise<{ clientOrigin: string | null; allowed: boolean; errorResponse?: NextResponse }> {
  const clientOrigin = request.headers.get('origin');
  if (!clientOrigin) {
    console.warn(`Request for ID '${id}' missing Origin header.`);
    // OPTIONS 요청의 경우 Origin 헤더가 없으면 브라우저가 자동으로 차단할 수 있으므로,
    // 여기서 400을 반환하기보다는 GET에서 처리하거나, OPTIONS에서는 특정 메시지를 반환할 수 있습니다.
    // GET 요청에서 Origin이 null이면 CORS 이슈가 아닐 수 있습니다(예: 동일 출처 요청, 서버 간 요청).
    // 그러나 이 API는 명백히 크로스-오리진 사용을 위한 것이므로 Origin이 중요합니다.
    return { clientOrigin: null, allowed: false, errorResponse: NextResponse.json({ error: 'Origin header is missing' }, { status: 400 }) };
  }

  const { data: teamData, error: dbError } = await supabase
    .from('teams')
    .select('allowed_domains')
    .eq('id', id)
    .single();

  if (dbError) {
    if (dbError.code === 'PGRST116') {
      console.warn(`No team found for ID '${id}' in database.`);
      return { clientOrigin, allowed: false, errorResponse: NextResponse.json({ error: 'Script ID not found or no team associated' }, { status: 404 }) };
    }
    console.error(`Database error fetching team for ID '${id}':`, dbError);
    return { clientOrigin, allowed: false, errorResponse: NextResponse.json({ error: 'Failed to fetch data from database' }, { status: 500 }) };
  }

  if (!teamData || !teamData.allowed_domains) {
    console.warn(`No allowed_domains configured for team ID '${id}'.`);
    return { clientOrigin, allowed: false, errorResponse: NextResponse.json({ error: 'No allowed domains configured for this script ID' }, { status: 403 }) };
  }

  const allowedDomainsFromDB: string[] = teamData.allowed_domains.split(',').map((s: string) => s.trim()).filter((s: string) => s);
  
  console.log(`Request for ID '${id}': Origin = '${clientOrigin}', Allowed = [${allowedDomainsFromDB.join(', ')}]`);

  if (allowedDomainsFromDB.includes(clientOrigin)) {
    return { clientOrigin, allowed: true };
  } else {
    console.warn(`Unauthorized access: Origin '${clientOrigin}' not in allowed list for ID '${id}'.`);
    return { clientOrigin, allowed: false, errorResponse: NextResponse.json({ error: `Origin '${clientOrigin}' is not allowed.` }, { status: 403 }) };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid script id format' }, { status: 400 });
  }

  const { clientOrigin, allowed, errorResponse } = await validateOrigin(request, id);

  if (!allowed || !clientOrigin) { // clientOrigin이 null일 경우도 여기서 처리
    return errorResponse || NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // clientOrigin은 이제 null이 아님이 보장됨

  try {
    const scriptsDir = path.join(process.cwd(), 'scripts');
    const filePath = path.join(scriptsDir, 'template.js'); // TODO: ID에 따라 파일 경로 동적으로 설정

    if (!filePath.startsWith(scriptsDir)) {
      console.error('Security Alert: Attempt to access path outside scripts directory:', filePath);
      return NextResponse.json({ error: 'Invalid script path' }, { status: 403 });
    }

    const scriptContent = await fs.readFile(filePath, 'utf-8');
    const templateClassName = "change-class-name"; // TODO: ID에 따라 동적으로 설정
    const replacedClassName = "span.plain_name"; // TODO: ID에 따라 동적으로 설정
    const finalScriptContent = scriptContent.replace(new RegExp(templateClassName, 'g'), replacedClassName);

    return new NextResponse(finalScriptContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/javascript',
        'Access-Control-Allow-Origin': clientOrigin, // 검증된 Origin 사용
        'Access-Control-Allow-Methods': 'GET', // GET 요청에 대한 응답이므로 GET만 명시
      },
    });
  } catch (error: any) {
    console.error(`Error serving script for ID '${id}':`, error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Script content not found on server' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to load script content' }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // OPTIONS 요청에서도 ID는 필수적일 수 있습니다 (어떤 Origin을 허용할지 결정하기 위해).
  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required for OPTIONS preflight' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid script id format for OPTIONS' }, { status: 400 });
  }

  const { clientOrigin, allowed, errorResponse } = await validateOrigin(request, id);

  if (!allowed || !clientOrigin) {
    // validateOrigin에서 Origin 헤더 누락 시 400 응답을 errorResponse로 반환할 수 있음.
    // 또는 특정 Origin이 허용 목록에 없을 때 403 응답.
    return errorResponse || NextResponse.json({ error: 'CORS preflight check failed' }, { status: 403 });
  }

  // clientOrigin은 이제 null이 아님이 보장됨
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', clientOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS'); // 클라이언트가 요청할 수 있는 메소드
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // 클라이언트 요청에 포함될 수 있는 헤더
  // headers.set('Access-Control-Max-Age', '86400'); // 프리플라이트 응답 캐시 시간 (선택 사항)

  console.log(`OPTIONS request for ID '${id}' from Origin '${clientOrigin}' allowed. Responding with 204.`);
  return new NextResponse(null, { status: 204, headers }); // 성공적인 프리플라이트는 204 No Content
}