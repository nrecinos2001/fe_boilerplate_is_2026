"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { generarPeriodo, type ErrorGeneracion } from "@/app/actions/generacion-cuotas";
import { AlertIcon, CheckCircleIcon } from "@/components/icons";
import { fechaCorta } from "@/lib/estado-cuenta";
import {
  desglosarVista,
  diferenciasConVista,
  periodoEnTexto,
  plural,
  type ResultadoEjecucion,
  type VistaPrevia,
} from "@/lib/generacion-cuotas";
import { MONEDA, formatMonto } from "@/lib/moneda";

type Props = {
  reglaId: number;
  /** Vista previa que el administrador está viendo: es lo único que se puede confirmar. */
  vista: VistaPrevia;
  configurarHref: string;
};

type Ejecutada = { resultado: ResultadoEjecucion; vista: VistaPrevia };

export function ConfirmarGeneracion({ reglaId, vista, configurarHref }: Props) {
  const router = useRouter();
  const [revisado, setRevisado] = useState(false);
  const [ejecutada, setEjecutada] = useState<Ejecutada | null>(null);
  const [error, setError] = useState<ErrorGeneracion | null>(null);
  const [pendiente, startTransition] = useTransition();
  const [actualizando, startActualizar] = useTransition();
  // Bloquea un segundo envío antes de que React vuelva a renderizar con el botón deshabilitado.
  const enviando = useRef(false);

  const d = desglosarVista(vista);
  const hayQueCrear = d.porCrear > 0;

  function confirmar() {
    if (enviando.current || !revisado || !hayQueCrear) return;
    enviando.current = true;
    setError(null);
    // La vista previa confirmada: al terminar, la página se vuelve a renderizar con la nueva.
    const confirmada = vista;
    startTransition(async () => {
      try {
        const respuesta = await generarPeriodo({ reglaId, periodo: confirmada.periodo });
        if (respuesta.ok) {
          setEjecutada({ resultado: respuesta.resultado, vista: confirmada });
          setRevisado(false);
        } else {
          setError(respuesta.error);
        }
      } catch {
        setError({
          codigo: "GENERAL",
          titulo: "No se pudo completar la generación",
          mensaje:
            "No sabemos si la generación llegó a correr. Revisa el historial antes de reintentar. " +
            "Volver a ejecutar es seguro: solo se crean las cuotas que falten.",
          incierto: true,
        });
      } finally {
        enviando.current = false;
      }
    });
  }

  if (ejecutada) {
    return <ResumenEjecucion {...ejecutada} onCerrar={() => setEjecutada(null)} />;
  }

  return (
    <section
      aria-labelledby="titulo-confirmacion"
      className="rounded-xl border border-border bg-surface p-6"
    >
      <h2 id="titulo-confirmacion" className="text-lg font-semibold">
        Confirmación antes de emitir
      </h2>

      {hayQueCrear ? (
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Al confirmar, se emitirán {plural(d.porCrear, "cuota", "cuotas")} por{" "}
          <span className="font-semibold text-foreground">
            {formatMonto(vista.montoTotal)} {MONEDA}
          </span>{" "}
          con vencimiento el {fechaCorta(vista.fechaVencimiento)}, y aparecerán en el estado de cuenta de{" "}
          {d.porCrear === 1 ? "esa unidad" : `esas ${d.porCrear} unidades`}.
          {d.conError > 0 &&
            ` ${d.conError === 1 ? "Una unidad quedará" : `${d.conError} unidades quedarán`} registrada${
              d.conError === 1 ? "" : "s"
            } con error para revisarla${d.conError === 1 ? "" : "s"}.`}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          No hay cuotas por crear en {periodoEnTexto(vista.periodo)}
          {d.yaGeneradas > 0 ? ": todas las unidades que la reciben ya la tienen." : "."} No hace falta
          ejecutar la generación.
        </p>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg bg-danger/5 px-4 py-3 text-sm">
          <AlertIcon className="size-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-danger">{error.titulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">{error.mensaje}</p>
            {(error.codigo === "EJECUCION_EN_CURSO" || error.incierto) && (
              <button
                type="button"
                onClick={() => startActualizar(() => router.refresh())}
                disabled={actualizando}
                className="mt-2 text-xs font-semibold text-foreground underline underline-offset-4 disabled:opacity-60"
              >
                {actualizando ? "Actualizando…" : "Actualizar vista previa e historial"}
              </button>
            )}
          </div>
        </div>
      )}

      {hayQueCrear && (
        <>
          <hr className="my-5 border-border" />
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-secondary">
            <input
              type="checkbox"
              checked={revisado}
              onChange={(e) => setRevisado(e.target.checked)}
              disabled={pendiente}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            He revisado el periodo, las unidades, el vencimiento y el total a emitir.
          </label>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={confirmar}
          disabled={!hayQueCrear || !revisado || pendiente}
          aria-disabled={!hayQueCrear || !revisado || pendiente}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircleIcon className="size-4" />
          {pendiente ? "Generando cuotas…" : "Confirmar y generar cuotas"}
        </button>
        <Link
          href={configurarHref}
          className="rounded-lg border border-sage px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/20"
        >
          Ver la regla
        </Link>
      </div>

      <p role="status" className="mt-4 text-[11px] leading-relaxed text-muted">
        {pendiente
          ? "Generando las cuotas. No cierres esta página."
          : "Esta acción aún no se ha confirmado. No hay cuotas emitidas."}
      </p>
    </section>
  );
}

function ResumenEjecucion({ resultado, vista, onCerrar }: Ejecutada & { onCerrar: () => void }) {
  const diferencias = diferenciasConVista(vista, resultado);
  const conErrores = resultado.estado === "CON_ERRORES";

  return (
    <section
      aria-labelledby="titulo-resumen"
      role="status"
      className="rounded-xl border border-border bg-surface p-6"
    >
      <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
        Ejecución #{resultado.ejecucionId} · {periodoEnTexto(resultado.periodo)}
      </p>
      <h2 id="titulo-resumen" className="mt-2 flex items-center gap-2 text-lg font-semibold">
        {conErrores ? (
          <AlertIcon className="size-5 shrink-0 text-danger" />
        ) : (
          <CheckCircleIcon className="size-5 shrink-0 text-secondary" />
        )}
        {conErrores ? "Generación con errores" : "Generación completada"}
      </h2>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Conteo etiqueta="Creadas" valor={resultado.creadas} />
        <Conteo etiqueta="Omitidas" valor={resultado.omitidas} />
        <Conteo etiqueta="Con error" valor={resultado.errores.length} peligro={resultado.errores.length > 0} />
      </dl>
      <p className="mt-4 text-sm text-secondary">
        Monto emitido:{" "}
        <span className="font-semibold text-foreground">
          {formatMonto(resultado.montoTotal)} {MONEDA}
        </span>
      </p>
      {resultado.omitidas > 0 && (
        <p className="mt-1 text-xs text-muted">
          Las omitidas ya tenían su cuota del periodo o la regla las excluye por su política.
        </p>
      )}

      {diferencias.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-sand/40 px-4 py-3 text-xs leading-relaxed">
          <AlertIcon className="size-4 shrink-0 text-danger" />
          <p>
            <span className="font-semibold">El resultado difiere de la vista previa</span>: {diferencias.join("; ")}.
            Los datos cambiaron entre la vista previa y la confirmación.
          </p>
        </div>
      )}

      {resultado.errores.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Unidades con error</h3>
          <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border text-xs">
            {resultado.errores.map((e) => (
              <li key={e.unidadId} className="px-3 py-2">
                <span className="font-semibold">{e.codigoUnidad}</span>
                <span className="block text-secondary">{e.causa}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Corrige la causa (p. ej. el monto de la regla para ese tipo de unidad) y vuelve a generar el
            periodo: solo se crearán las cuotas que falten.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="#historial"
          className="rounded-lg border border-sage px-4 py-2 text-sm font-semibold transition-colors hover:bg-sand/20"
        >
          Ver en el historial
        </a>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary underline underline-offset-4 hover:text-foreground"
        >
          Cerrar resumen
        </button>
      </div>
    </section>
  );
}

function Conteo({ etiqueta, valor, peligro }: { etiqueta: string; valor: number; peligro?: boolean }) {
  return (
    <div className="rounded-lg bg-sand/20 px-2 py-3">
      <dt className="text-[11px] text-secondary">{etiqueta}</dt>
      <dd className={`mt-1 font-serif text-2xl ${peligro ? "text-danger" : "text-foreground"}`}>{valor}</dd>
    </div>
  );
}
