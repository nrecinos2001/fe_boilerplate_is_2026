"use client";

import Link from "next/link";
import { useActionState } from "react";
import { X } from "lucide-react";
import { cancelar, type CancelarReservaState } from "@/app/actions/reservas";

type Props = {
  id: number;
  area: string;
  folio: string;
  /** "07 nov 2026 · 16:00–18:00 h" */
  cuando: string;
  cerrarHref: string;
};

export default function CancelarReserva({ id, area, folio, cuando, cerrarHref }: Props) {
  const [state, formAction, pending] = useActionState<CancelarReservaState, FormData>(cancelar, {});

  return (
    <section
      id="cancelar"
      role="dialog"
      aria-labelledby="titulo-cancelar"
      className="scroll-mt-6 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="titulo-cancelar" className="font-serif text-3xl">
          ¿Cancelar tu reserva?
        </h2>
        <Link href={cerrarHref} aria-label="Cerrar" className="p-1 text-secondary hover:text-foreground">
          <X size={20} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 rounded-lg bg-sand/30 px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">{area}</p>
          <p className="text-[11px] text-muted">{folio}</p>
        </div>
        <p className="mt-2 text-sm text-secondary">{cuando}</p>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-secondary">
        Se liberará este horario para la comunidad. Si cambias de opinión, deberás hacer una nueva
        reserva según disponibilidad.
      </p>

      {state.error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
        <input type="hidden" name="reservaId" value={id} />
        <Link
          href={cerrarHref}
          className="rounded-lg border border-sage px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/20"
        >
          Conservar reserva
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:opacity-60"
        >
          {pending ? "Cancelando…" : "Sí, cancelar reserva"}
        </button>
      </form>
    </section>
  );
}
