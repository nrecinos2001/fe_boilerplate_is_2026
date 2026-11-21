import { redirect } from 'next/navigation';
import VisitasPanel from '@/app/components/seguridad/visitasPanel';
import { getCurrentUser } from '@/lib/current-user';

export default async function SeguridadVisitasPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'SEGURIDAD' && user.role !== 'ADMINISTRADOR') {
    redirect('/incidencias');
  }

  return <VisitasPanel />;
}