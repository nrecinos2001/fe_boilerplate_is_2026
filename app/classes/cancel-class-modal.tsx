"use client";

import { useState } from "react";
import { cancelClass, type CancelClassResult } from "@/src/services/classes/cancel-class-service";
import type { GymClass } from "@/src/types/classes";

interface Props {
  gymClass: GymClass;
  onClose: () => void;
  onSuccess: (result: CancelClassResult) => void;
}

export function CancelClassModal({ gymClass, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanReason = reason.trim();
  const valid = cleanReason.length >= 5 && cleanReason.length <= 200;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const result = await cancelClass(gymClass.id, cleanReason);
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? "No se pudo cancelar la clase.");
      return;
    }
    onSuccess(result.data);
  }

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="cancel-class-heading" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 id="cancel-class-heading" className="text-xl font-bold">Cancelar clase</h2>
        <p className="mt-2 text-sm">{gymClass.name} · {new Date(gymClass.startsAt).toLocaleString("es-SV")}</p>
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {gymClass.confirmedReservations} {gymClass.confirmedReservations === 1 ? "miembro recibirá" : "miembros recibirán"} un aviso al cancelar. Esta acción cancelará todas las reservas confirmadas.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium" htmlFor="cancellation-reason">Motivo de cancelación</label>
          <textarea id="cancellation-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={200} required disabled={busy} className="w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" rows={4} />
          <p className="text-xs text-zinc-500">Entre 5 y 200 caracteres. {cleanReason.length}/200</p>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Volver</button>
            <button type="submit" disabled={!valid || busy} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Cancelando..." : "Confirmar cancelación"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
