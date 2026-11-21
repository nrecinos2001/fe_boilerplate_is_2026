import { redirect } from 'next/navigation';
import AdminIncidenciasList from '@/app/components/admin/AdminIncidenciasList';
import { getSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';

type Me = {
  id: string;
  email: string;
  role: 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD';
  unit?: { id: string; code: string; tower: string; description: string } | null;
};

async function getCurrentUser(): Promise<Me | null> {
  const token = await getSession();
  if (!token) return null;
  try {
    return await apiFetch<Me>('/auth/me');
  } catch {
    return null;
  }
}

export default async function AdminIncidenciasPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMINISTRADOR') {
    redirect('/incidencias');
  }

  return <AdminIncidenciasList adminEmail={user.email} />;
}