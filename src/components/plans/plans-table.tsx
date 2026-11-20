import { PLAN_TYPE_LABELS, type Plan } from "@/src/types/plans";
import { EMPTY_PLANS_MESSAGE, formatDuration, formatPrice } from "./plan-form-logic";

export type PlansTableProps = {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onEdit: (plan: Plan) => void;
  onDeactivate: (plan: Plan) => void;
};

/** Listado de planes del administrador (FE-3.1), sin estado propio. */
export function PlansTable({ plans, loading, error, onRetry, onEdit, onDeactivate }: PlansTableProps) {
  if (loading) {
    return (
      <p role="status" className="p-6 text-center text-sm text-zinc-500">
        Cargando planes...
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-sm">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (plans.length === 0) {
    return <p className="p-6 text-center text-sm text-zinc-500">{EMPTY_PLANS_MESSAGE}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
          <tr>
            <th className="px-3 py-2 font-semibold">Nombre</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Duración</th>
            <th className="px-3 py-2 text-right font-semibold">Precio</th>
            <th className="px-3 py-2 font-semibold">Beneficios</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr
              key={plan.id}
              className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${plan.isActive ? "" : "text-zinc-400"}`}
            >
              <td className="px-3 py-2 font-medium">{plan.name}</td>
              <td className="px-3 py-2">{PLAN_TYPE_LABELS[plan.type]}</td>
              <td className="px-3 py-2">{formatDuration(plan)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatPrice(plan.price)}</td>
              <td className="max-w-[240px] truncate px-3 py-2" title={plan.benefits ?? undefined}>
                {plan.benefits ?? "—"}
              </td>
              <td className="px-3 py-2">
                {plan.isActive ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                    Activo
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Inactivo
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(plan)}
                  className="rounded-md px-2 py-1 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
                >
                  Editar
                </button>
                {plan.isActive && (
                  <button
                    type="button"
                    onClick={() => onDeactivate(plan)}
                    className="rounded-md px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
