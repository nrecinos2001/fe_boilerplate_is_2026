// app/(dashboard)/incidencias/page.tsx
import ReportesList from '@/app/components/incidencias/ReportesList';
import { getCurrentUser } from '@/lib/current-user';

function getDisplayName(email: string | undefined): string {
  if (!email) return 'Usuario';
  const local = email.split('@')[0] ?? '';
  return local
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function MisReportesPage() {
  const user = await getCurrentUser();
  const displayName = getDisplayName(user?.email);

  return <ReportesList displayName={displayName} />;
}