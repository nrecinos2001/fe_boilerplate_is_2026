import { redirect } from 'next/navigation';
import PanelSeguridad from '@/app/components/seguridad/PanelSeguridad';
import { getCurrentUser } from '@/lib/current-user';

export default async function SeguridadPanelPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'SEGURIDAD' && user.role !== 'ADMINISTRADOR') {
    redirect('/incidencias');
  }

  return <PanelSeguridad />;
}