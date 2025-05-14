'use client';

import { useActionState } from 'react';
import { useTranslation } from '@/app/i18n/useTranslation/client';
import { TeamDataWithMembers } from '@/lib/db/schema';
import { removeTeamMember } from '@/app/[lng]/(login)/actions';
import { User } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CopyIcon } from 'lucide-react';

type ActionState = {
  error?: string;
  success?: string;
};

export function Codes({ teamData, lng }: { teamData: TeamDataWithMembers, lng: string }) {
  const { t } = useTranslation(lng, 'codes', {})
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, { error: '', success: '' });

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || 'Unknown User';
  };

  const scriptCode = `<script type="module" src="https://site-topping.vercel.app/api/v1/script?id=${teamData.id}&builder=imweb"></script>`;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">{t('title')}</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('imweb')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="w-full mb-4 sm:mb-0">
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md p-2" 
                  value={scriptCode}
                  readOnly
                />
                <Button variant="outline" className="mt-2" onClick={() => {
                  navigator.clipboard.writeText(scriptCode);
                }}>
                  <CopyIcon className="w-4 h-4 mr-2" />
                  {t('copy')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}