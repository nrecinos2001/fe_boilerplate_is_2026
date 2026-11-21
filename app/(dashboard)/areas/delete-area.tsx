"use client";

import { useActionState, useState } from "react";
import { removeArea, type DeleteAreaState } from "@/app/actions/areas";

export function DeleteArea({ id, nombre }: { id: number; nombre: string }) {
  const [state, formAction, pending] = useActionState<DeleteAreaState, FormData>(removeArea, {});
  const [confirmando, setConfirmando] = useState(false);

  return (
    <section className="rounded-xl bg-sand/30 p-6" aria-labelledby="titulo-eliminar">
      <h2 id="titulo-eliminar" className="text-lg font-semibold">
        Eliminar área
      </h2>
      <p className="mt-1 text-xs text-secondary">{nombre} · Baja lógica</p>

      <p className="mt-4 text-xs leading-relaxed text-secondary">
        El área dejará de estar disponible para nuevas reservas y conservará su historial. No se
        puede eliminar si tiene reservas futuras confirmadas.
      </p>

      <p aria-live="polite" className="mt-3 text-xs text-danger empty:hidden">
        {state.error}
      </p>

      {confirmando ? (
        <form action={formAction} className="mt-5 flex flex-wrap gap-3">
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-danger px-5 py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Eliminando…" : "Confirmar eliminación"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="rounded-lg border border-sage px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/30"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="mt-5 rounded-lg border border-danger/50 px-5 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
        >
          Eliminar área
        </button>
      )}
    </section>
  );
}
