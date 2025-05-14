import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.STORAGE_NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // supabase 테이블에서 허용 도메인 데이터 가져오기
  const { data, error } = await supabase
    .from('teams')
    .select('allowed_domains')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Script ID not found' },
        { status: 404 }
      );
    }
    console.error('데이터베이스 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from database' },
      { status: 500 }
    );
  }

  // ID에 대한 허용된 도메인 목록 확인
  const allowedOrigins: string[] = data.allowed_domains.split(',');
  const origin = request.headers.get('origin');

  // ID에 대한 매핑이 없거나 origin이 허용된 목록에 없는 경우
  if (!allowedOrigins || !origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: 'Unauthorized access for this script ID' },
      { status: 403 }
    );
  }

  // 파일 이름에 허용되지 않는 문자가 있는지 검사
  if (!/^[0-9]+$/.test(id)) {
    return NextResponse.json(
      { error: 'Invalid script id' },
      { status: 400 }
    );
  }

  try {
    const scriptsDir = path.join(process.cwd(), 'scripts');
    const filePath = path.join(scriptsDir, 'template.js');

    // normalize된 경로가 scripts 디렉토리 내에 있는지 확인
    if (!filePath.startsWith(scriptsDir)) {
      return NextResponse.json(
        { error: 'Invalid script path' },
        { status: 403 }
      );
    }

    const scriptContent = await fs.readFile(filePath, 'utf-8');
    const templateClassName = "change-class-name";
    const replacedClassName = "span.plain_name";
    let replacedScriptContent = scriptContent.replace(templateClassName, replacedClassName);

    return new NextResponse(replacedScriptContent, {
      headers: {
        'Content-Type': 'text/javascript',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('스크립트 오류:', error);
    return NextResponse.json(
      { error: 'Script not found' },
      { status: 404 }
    );
  }
}