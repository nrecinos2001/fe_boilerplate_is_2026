import type { Plan } from "@/src/types/plans";
import { deactivateConfirmation } from "./plan-form-logic";

export type DeactivatePlanDialogProps = {
  plan: Plan;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmación antes de desactivar un plan (FE-3.1), sin estado propio. */
export function DeactivatePlanDialog({
  plan,
  busy,
  error,
  onConfirm,
  onCancel,
}: DeactivatePlanDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="deactivate-plan-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
        <h2 id="deactivate-plan-title" className="font-semibold">
          {deactivateConfirmation(plan)}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Las membresías ya vendidas con este plan no cambian.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {busy ? "Desactivando..." : "Desactivar"}
          </button>
        </div>
      </div>
    </div>
  );
}
