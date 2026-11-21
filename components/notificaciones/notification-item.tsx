"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarLeida } from "@/app/actions/notificaciones";
import {
  etiquetaAccion,
  etiquetaModulo,
  rutaSegura,
  type Notificacion,
} from "@/lib/notificaciones";
import { ModuleIcon } from "./module-icon";

// Una fila del centro de notificaciones. El padre la monta con
// key={`${id}-${leida}`}, así el estado local se reinicia al refrescar los datos.
export function NotificationItem({
  notificacion: n,
  fechaTexto,
}: {
  notificacion: Notificacion;
  fechaTexto: string;
}) {
  const router = useRouter();
  const [leida, setLeida] = useState(n.leida);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const destino = rutaSegura(n.enlaceAccion);

  // Marcar / desmarcar desde el botón de la fila.
  function alternar() {
    const nueva = !leida;
    setLeida(nueva);
    setError(null);
    iniciar(async () => {
      const r = await marcarLeida(n.id, nueva);
      if (!r.ok) {
        setLeida(!nueva);
        setError(r.mensaje);
        return;
      }
      router.refresh();
    });
  }

  // FE-24.3: abrir la notificación la marca como leída y navega al detalle.
  // Si marcarla falla, igualmente se navega: el residente no se queda bloqueado.
  function abrir() {
    if (!destino) return;
    iniciar(async () => {
      if (!leida) await marcarLeida(n.id, true);
      router.push(destino);
      router.refresh();
    });
  }

  return (
    <li
      data-testid="notificacion"
      data-leida={leida}
      className={`flex gap-4 border-t border-borde px-6 py-5 first:border-t-0 ${
        leida ? "" : "bg-habita-100"
      }`}
    >
      <ModuleIcon modulo={n.moduloOrigen} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-habita-700">
          <span>{etiquetaModulo(n.moduloOrigen).toUpperCase()}</span>
          {leida ? (
            <span className="font-normal">✓ Leída</span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-habita-900">
              <span className="h-1.5 w-1.5 rounded-full bg-habita-900" />
              Sin leer
            </span>
          )}
        </p>
        <p className="mt-1 text-[15px] font-semibold">
          {n.titulo ?? etiquetaModulo(n.moduloOrigen)}
        </p>
        <p className="mt-0.5 text-sm text-habita-700">{n.mensaje}</p>
        <p className="mt-1.5 text-xs text-habita-700/70">{fechaTexto}</p>
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 text-sm">
        {destino && (
          <button
            type="button"
            onClick={abrir}
            disabled={pendiente}
            className="font-medium text-habita-700 underline underline-offset-4 disabled:opacity-60"
          >
            {etiquetaAccion(n.moduloOrigen)} →
          </button>
        )}
        <button
          type="button"
          onClick={alternar}
          disabled={pendiente}
          className="text-xs text-habita-700/80 hover:underline disabled:opacity-60"
        >
          {leida ? "Marcar como no leída" : "Marcar como leída"}
        </button>
      </div>
    </li>
  );
}
