import { STATUS_LABELS, type MachineStatus } from "@/src/types/machines";

// Operativa en verde, En mantenimiento en amarillo y Fuera de servicio en rojo.
const STATUS_STYLES: Record<MachineStatus, string> = {
  OPERATIONAL:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  UNDER_MAINTENANCE:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  OUT_OF_SERVICE: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
};

export function StatusBadge({ status }: { status: MachineStatus }) {
  return (
    <span
      data-status={status}
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
