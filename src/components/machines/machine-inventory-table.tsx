import { AREA_LABELS, type Machine } from "@/src/types/machines";
import { StatusBadge } from "./status-badge";

type Props = {
  machines: Machine[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onChangeStatus: (machine: Machine) => void;
  onShowHistory: (machine: Machine) => void;
};

/** Tabla del inventario de máquinas del administrador (H20). */
export function MachineInventoryTable({
  machines,
  loading,
  error,
  onRetry,
  onChangeStatus,
  onShowHistory,
}: Props) {
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
    return (
      <p className="py-10 text-center text-sm text-zinc-500">No hay máquinas en esa área.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <tr>
            <th className="px-3 py-2 font-semibold">Código</th>
            <th className="px-3 py-2 font-semibold">Nombre</th>
            <th className="px-3 py-2 font-semibold">Área</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((machine) => (
            <tr key={machine.id} className="border-b border-zinc-200 dark:border-zinc-800">
              <td className="px-3 py-2 font-mono">{machine.code}</td>
              <td className="px-3 py-2">{machine.name}</td>
              <td className="px-3 py-2">{AREA_LABELS[machine.area]}</td>
              <td className="px-3 py-2">
                <StatusBadge status={machine.status} />
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeStatus(machine)}
                    className="rounded-md border border-blue-600 px-2.5 py-1 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  >
                    Cambiar estado
                  </button>
                  <button
                    type="button"
                    onClick={() => onShowHistory(machine)}
                    className="rounded-md border border-blue-600 px-2.5 py-1 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  >
                    Historial
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
