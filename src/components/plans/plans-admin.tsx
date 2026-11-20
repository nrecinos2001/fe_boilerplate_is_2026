"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPlan,
  deactivatePlan,
  fetchPlans,
  PLAN_NAME_TAKEN_MESSAGE,
  updatePlan,
} from "@/src/services/plans/plans-service";
import type { Plan } from "@/src/types/plans";
import { DeactivatePlanDialog } from "./deactivate-plan-dialog";
import { PlanFormDialog } from "./plan-form-dialog";
import {
  EMPTY_PLAN_FORM,
  PLAN_SAVED_MESSAGE,
  planToFormValues,
  toCreatePlanInput,
  toUpdatePlanInput,
  validatePlanForm,
  type PlanFormErrors,
  type PlanFormValues,
} from "./plan-form-logic";
import { PlansTable } from "./plans-table";

type Editor = { mode: "create" } | { mode: "edit"; plan: Plan };

const TOAST_MS = 4000;

/** Administración de planes (H03 · FE-3.1). */
export function PlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [values, setValues] = useState<PlanFormValues>(EMPTY_PLAN_FORM);
  const [errors, setErrors] = useState<PlanFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [toDeactivate, setToDeactivate] = useState<Plan | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlans().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setPlans(res.data);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function openEditor(next: Editor) {
    setEditor(next);
    setValues(next.mode === "edit" ? planToFormValues(next.plan) : EMPTY_PLAN_FORM);
    setErrors({});
    setServerError(null);
  }

  function handleChange(field: keyof PlanFormValues, value: string) {
    setValues((prev) => ({
      ...prev,
      [field]: value,
      // La Clase suelta no lleva duración: se descarta lo escrito.
      ...(field === "type" && value === "DROP_IN" ? { durationDays: "" } : {}),
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }

  async function handleSubmit() {
    if (!editor) return;
    const found = validatePlanForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError(null);
    const result =
      editor.mode === "create"
        ? await createPlan(toCreatePlanInput(values))
        : await updatePlan(editor.plan.id, toUpdatePlanInput(values, editor.plan.type));
    setSaving(false);

    if (!result.ok) {
      // El nombre repetido va bajo el campo; el resto, bajo el formulario.
      if (result.error === PLAN_NAME_TAKEN_MESSAGE) setErrors({ name: result.error });
      else setServerError(result.error);
      return;
    }

    setEditor(null);
    showToast(PLAN_SAVED_MESSAGE);
    reload();
  }

  async function handleDeactivate() {
    if (!toDeactivate) return;
    setDeactivating(true);
    setDeactivateError(null);
    const result = await deactivatePlan(toDeactivate.id);
    setDeactivating(false);
    if (!result.ok) {
      setDeactivateError(result.error);
      return;
    }
    setToDeactivate(null);
    showToast(`El plan ${result.data.name} ya no se ofrece en la venta.`);
    reload();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Planes</h1>
          <p className="text-sm text-zinc-500">
            Los planes activos son los que recepción puede vender.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor({ mode: "create" })}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Nuevo plan
        </button>
      </div>

      {toast && (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {toast}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <PlansTable
          plans={plans}
          loading={loading}
          error={loadError}
          onRetry={reload}
          onEdit={(plan) => openEditor({ mode: "edit", plan })}
          onDeactivate={(plan) => {
            setDeactivateError(null);
            setToDeactivate(plan);
          }}
        />
      </div>

      {editor && (
        <PlanFormDialog
          mode={editor.mode}
          values={values}
          errors={errors}
          saving={saving}
          serverError={serverError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={() => setEditor(null)}
        />
      )}

      {toDeactivate && (
        <DeactivatePlanDialog
          plan={toDeactivate}
          busy={deactivating}
          error={deactivateError}
          onConfirm={handleDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </div>
  );
}
