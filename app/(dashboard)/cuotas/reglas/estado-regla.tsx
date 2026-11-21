"use client";

import { useActionState, useState } from "react";
import { cambiarEstadoRegla, type EstadoReglaState } from "@/app/actions/reglas-cuota";
import { AlertIcon } from "@/components/icons";
import { ESTADO_REGLA, type EstadoRegla } from "@/lib/reglas-cuota";

const DESCRIPCION: Record<EstadoRegla, string> = {
  ACTIVA: "Genera cargos cada mes en su día de generación.",
  PAUSADA: "No genera cargos aunque llegue su día. Puedes reanudarla cuando quieras.",
  INACTIVA: "Desactivada: no genera cargos. Conserva su historial y los cargos ya emitidos.",
};

const ACCIONES: Record<EstadoRegla, { estado: EstadoRegla; label: string }[]> = {
  ACTIVA: [
    { estado: "PAUSADA", label: "Pausar" },
    { estado: "INACTIVA", label: "Desactivar" },
  ],
  PAUSADA: [
    { estado: "ACTIVA", label: "Reanudar" },
    { estado: "INACTIVA", label: "Desactivar" },
  ],
  INACTIVA: [{ estado: "ACTIVA", label: "Activar" }],
};

export function EstadoReglaPanel({ id, estado }: { id: number; estado: EstadoRegla }) {
  const [state, formAction, pending] = useActionState<EstadoReglaState, FormData>(
    cambiarEstadoRegla,
    {},
  );
  const [confirmando, setConfirmando] = useState(false);

  return (
    <section aria-labelledby="titulo-estado" className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-estado" className="text-lg font-semibold">
          Estado de la regla
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_REGLA[estado].className}`}
        >
          {ESTADO_REGLA[estado].label}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-secondary">{DESCRIPCION[estado]}</p>

      {state.error && (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg bg-danger/5 px-4 py-3 text-sm">
          <AlertIcon className="size-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-danger">{state.error.titulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">{state.error.mensaje}</p>
          </div>
        </div>
      )}

      {confirmando ? (
        <form action={formAction} className="mt-5 rounded-lg bg-sand/30 p-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="estado" value="INACTIVA" />
          <p className="text-sm font-semibold">¿Desactivar esta regla?</p>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            Dejará de generar cargos. Los cargos ya emitidos no cambian y podrás reactivarla después.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Desactivando…" : "Sí, desactivar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-lg border border-sage px-4 py-2 text-sm font-semibold transition-colors hover:bg-sand/30"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          {ACCIONES[estado].map((accion) =>
            accion.estado === "INACTIVA" ? (
              <button
                key={accion.estado}
                type="button"
                onClick={() => setConfirmando(true)}
                className="rounded-lg border border-danger/50 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
              >
                {accion.label}
              </button>
            ) : (
              <form key={accion.estado} action={formAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="estado" value={accion.estado} />
                <button
                  type="submit"
                  disabled={pending}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    accion.estado === "ACTIVA"
                      ? "bg-primary text-primary-foreground hover:bg-moss"
                      : "border border-sage hover:bg-sand/20"
                  }`}
                >
                  {pending ? "Aplicando…" : accion.label}
                </button>
              </form>
            ),
          )}
        </div>
      )}
      <p className="mt-4 text-[11px] text-muted">
        Los cambios de estado quedan registrados con tu usuario y la fecha.
      </p>
    </section>
  );
}
