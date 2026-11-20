import {
  AREA_LABELS,
  MACHINE_AREAS,
  type MachineAvailability,
} from "@/src/types/machines";
import { StatusBadge } from "./status-badge";

export const EMPTY_AVAILABILITY_MESSAGE = "No hay máquinas con ese criterio.";

type Props = {
  machines: MachineAvailability[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

/**
 * Lista de solo lectura de las máquinas por área, con su estado por color
 * (H21). No tiene ninguna acción para cambiar estados.
 */
export function MachineAvailabilityList({ machines, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <p role="status" className="py-10 text-center text-sm text-zinc-500">
        Cargando máquinas...
      </p>
    );
  }

  if (error) {
    return (
      <div role="alert" className="py-10 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-blue-600 px-4 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (machines.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-500">{EMPTY_AVAILABILITY_MESSAGE}</p>;
  }

  // El backend ya las manda ordenadas por área y nombre; aquí solo se agrupan.
  const groups = MACHINE_AREAS.map((area) => ({
    area,
    items: machines.filter((m) => m.area === area),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ area, items }) => (
        <section key={area} aria-label={AREA_LABELS[area]}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {AREA_LABELS[area]}
          </h2>
          <ul className="flex flex-col gap-2">
            {items.map((machine) => (
              <li
                key={`${machine.area}-${machine.name}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="min-w-0 break-words">{machine.name}</span>
                <StatusBadge status={machine.status} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
