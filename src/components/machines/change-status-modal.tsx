"use client";

import { useState, type FormEvent } from "react";
import { changeMachineStatus } from "@/src/services/machines/machines-service";
import {
  REASON_MAX_LENGTH,
  STATUS_LABELS,
  statusOptionsFor,
  validateReason,
  type Machine,
  type MachineStatusChangeResult,
} from "@/src/types/machines";
import { StatusBadge } from "./status-badge";

type Props = {
  machine: Machine;
  onClose: () => void;
  onSaved: (result: MachineStatusChangeResult) => void;
};

/** Ventana para cambiar el estado de una máquina con su motivo (H20). */
export function ChangeStatusModal({ machine, onClose, onSaved }: Props) {
  // El selector nunca ofrece el estado actual.
  const options = statusOptionsFor(machine.status);
  const [status, setStatus] = useState(options[0]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reasonError = validateReason(reason);
    if (reasonError) {
      setError(reasonError);
      return;
    }

    setSaving(true);
    setError(null);
    const res = await changeMachineStatus(machine.id, status, reason);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(res.data);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-status-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900"
      >
        <header className="flex items-center justify-between bg-zinc-900 px-4 py-3 text-white">
          <h2 id="change-status-title" className="text-sm font-semibold">
            Cambiar estado · {machine.code} {machine.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-lg">
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-4 p-4 text-sm">
          <p className="flex items-center gap-2">
            Estado actual: <StatusBadge status={machine.status} />
          </p>

          <label className="flex flex-col gap-1 font-semibold">
            Nuevo estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="rounded-lg border border-zinc-300 px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-800"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 font-semibold">
            Motivo (5 a 200 caracteres)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REASON_MAX_LENGTH}
              rows={3}
              placeholder="Escribe el motivo…"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "change-status-error" : undefined}
              className={`rounded-lg border px-3 py-2 font-normal dark:bg-zinc-800 ${
                error ? "border-red-600" : "border-zinc-300 dark:border-zinc-700"
              }`}
            />
          </label>

          {error && (
            <p id="change-status-error" role="alert" className="text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambio"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
