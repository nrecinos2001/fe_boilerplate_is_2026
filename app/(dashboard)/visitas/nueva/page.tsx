import PreautorizacionForm from '@/app/components/visitas/PreautorizacionForm';
import { getCurrentUser } from '@/lib/current-user';

export default async function NuevaPreautorizacionPage() {
  const user = await getCurrentUser();
  return (
    <div className="py-8 px-4">
      <PreautorizacionForm
        userUnit={user?.unit?.code ?? null}
        userEmail={user?.email ?? ''}
      />
    </div>
  );
}