import {
  STATUS_LABELS,
  formatChangeDate,
  type Machine,
  type MachineStatusChange,
} from "@/src/types/machines";

export const EMPTY_HISTORY_MESSAGE = "Esta máquina no tiene cambios de estado.";

type Props = {
  machine: Machine;
  entries: MachineStatusChange[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
};

/** Historial de estados de una máquina, del más reciente al más antiguo (H20). */
export function StatusHistoryPanel({ machine, entries, loading, error, onRetry, onClose }: Props) {
  return (
    <section
      aria-label={`Historial de ${machine.code}`}
      className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <header className="flex items-center justify-between bg-zinc-900 px-4 py-3 text-white">
        <h2 className="text-sm font-semibold">
          Historial · {machine.code} {machine.name}
        </h2>
        <button type="button" onClick={onClose} aria-label="Cerrar historial" className="text-lg">
          ✕
        </button>
      </header>
      <div className="p-4">
        {loading ? (
          <p role="status" className="text-sm text-zinc-500">
            Cargando historial...
          </p>
        ) : error ? (
          <div role="alert">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-blue-700 underline dark:text-blue-300"
            >
              Reintentar
            </button>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500">{EMPTY_HISTORY_MESSAGE}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={`${entry.changedAt}-${entry.toStatus}`}
                className="border-l-4 border-blue-600 pl-3 text-sm"
              >
                <p className="font-semibold">
                  {STATUS_LABELS[entry.fromStatus]} → {STATUS_LABELS[entry.toStatus]}
                </p>
                <p>{entry.reason}</p>
                <p className="text-zinc-500">
                  {formatChangeDate(entry.changedAt)} · {entry.changedBy}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
