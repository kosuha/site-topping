'use client';

import { useActionState } from 'react';
import { useTranslation } from '@/app/i18n/useTranslation/client';
import { TeamDataWithMembers } from '@/lib/db/schema';
import { removeTeamMember } from '@/app/[lng]/(login)/actions';
import PrettyMenu from './(codes)/PrettyMenu';
import { User } from '@/lib/db/schema';

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

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">{t('title')}</h1>
      
      <PrettyMenu />
    </section>
  );
}