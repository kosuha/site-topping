import { redirect } from 'next/navigation';
import { Codes } from './codes';
import { getTeamForUser, getUser } from '@/lib/db/queries';

export default async function SettingsPage({params}: {params: Promise<{lng: string}>}) {
  const user = await getUser();
  const { lng } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  const teamData = await getTeamForUser(user.id);

  if (!teamData) {
    throw new Error('Team not found');
  }

  return <Codes teamData={teamData} lng={lng} />;
}
