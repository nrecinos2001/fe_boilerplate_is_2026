import ReportForm from '@/app/components/incidencias/ReportForm';
import { getCurrentUser } from '@/lib/current-user';

export default async function NuevoReportePage() {
  const user = await getCurrentUser();

  const userUnitCode = user?.unit?.code ?? null;
  const userUnitLabel = user?.unit
    ? `${user.unit.tower} · ${user.unit.code}`
    : null;

  return (
    <div className="py-8 px-4">
      <ReportForm
        userUnit={userUnitCode}
        userEmail={user?.email ?? ''}
        userUnitLabel={userUnitLabel}
      />
    </div>
  );
}