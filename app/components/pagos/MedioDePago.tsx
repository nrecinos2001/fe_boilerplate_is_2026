"use client";

import { CreditCard, Lock } from "lucide-react";
import { TARJETAS_GUARDADAS } from "@/lib/estado-cuenta";
import {
  formatearNumero,
  formatearVence,
  soloDigitos,
  type DatosTarjeta,
  type ErroresTarjeta,
} from "@/lib/tarjeta";

/** Una tarjeta guardada (por sus últimos 4 dígitos) o una tarjeta de un solo uso. */
export type Medio = { tipo: "guardada"; ultimos4: string } | { tipo: "unica" };

type Props = {
  medio: Medio;
  onMedio: (medio: Medio) => void;
  tarjeta: DatosTarjeta;
  onTarjeta: (tarjeta: DatosTarjeta) => void;
  errores: ErroresTarjeta;
  titular: string;
  deshabilitado?: boolean;
};

const controlClass =
  "w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/20";

function opcionClass(activa: boolean) {
  return `flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
    activa ? "border-primary bg-sage/15" : "border-border hover:bg-sand/10"
  }`;
}

export default function MedioDePago({ medio, onMedio, tarjeta, onTarjeta, errores, titular, deshabilitado }: Props) {
  const campo = (nombre: keyof DatosTarjeta, valor: string) => onTarjeta({ ...tarjeta, [nombre]: valor });
  const borde = (nombre: keyof DatosTarjeta) => (errores[nombre] ? "border-danger" : "border-sage");

  return (
    <fieldset className="mt-4 flex flex-col gap-3" disabled={deshabilitado}>
      <legend className="sr-only">Medio de pago</legend>

      {TARJETAS_GUARDADAS.map((t) => {
        const activa = medio.tipo === "guardada" && medio.ultimos4 === t.ultimos4;
        return (
          <label key={t.ultimos4} className={opcionClass(activa)}>
            <input
              type="radio"
              name="medio-pago"
              checked={activa}
              onChange={() => onMedio({ tipo: "guardada", ultimos4: t.ultimos4 })}
              className="size-4 accent-primary"
            />
            <CreditCard size={22} aria-hidden="true" className="shrink-0 text-secondary" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">
                {t.nombre} · •••• {t.ultimos4}
              </span>
              <span className="block text-xs text-secondary">
                {titular} · Vence {t.vence}
              </span>
            </span>
          </label>
        );
      })}

      <div className={`rounded-lg border ${medio.tipo === "unica" ? "border-primary bg-sage/15" : "border-border"}`}>
        <label className="flex cursor-pointer items-center gap-4 px-4 py-3">
          <input
            type="radio"
            name="medio-pago"
            checked={medio.tipo === "unica"}
            onChange={() => onMedio({ tipo: "unica" })}
            className="size-4 accent-primary"
          />
          <CreditCard size={22} aria-hidden="true" className="shrink-0 text-secondary" />
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold">Otra tarjeta</span>
            <span className="block text-xs text-secondary">Pago único: la tarjeta no se guarda</span>
          </span>
        </label>

        {medio.tipo === "unica" && (
          <div className="grid gap-4 border-t border-border px-4 pt-4 pb-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="tarjeta-numero" className="mb-1.5 block text-xs font-medium">
                Número de tarjeta
              </label>
              <input
                id="tarjeta-numero"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                value={tarjeta.numero}
                onChange={(e) => campo("numero", formatearNumero(e.target.value))}
                aria-invalid={Boolean(errores.numero)}
                aria-describedby={errores.numero ? "error-numero" : undefined}
                className={`${controlClass} ${borde("numero")} font-mono tracking-wider`}
              />
              {errores.numero && (
                <p id="error-numero" className="mt-1 text-xs text-danger">
                  {errores.numero}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tarjeta-nombre" className="mb-1.5 block text-xs font-medium">
                Nombre en la tarjeta
              </label>
              <input
                id="tarjeta-nombre"
                autoComplete="cc-name"
                value={tarjeta.nombre}
                onChange={(e) => campo("nombre", e.target.value)}
                aria-invalid={Boolean(errores.nombre)}
                aria-describedby={errores.nombre ? "error-nombre" : undefined}
                className={`${controlClass} ${borde("nombre")}`}
              />
              {errores.nombre && (
                <p id="error-nombre" className="mt-1 text-xs text-danger">
                  {errores.nombre}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="tarjeta-vence" className="mb-1.5 block text-xs font-medium">
                Vencimiento
              </label>
              <input
                id="tarjeta-vence"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={tarjeta.vence}
                onChange={(e) => campo("vence", formatearVence(e.target.value))}
                aria-invalid={Boolean(errores.vence)}
                aria-describedby={errores.vence ? "error-vence" : undefined}
                className={`${controlClass} ${borde("vence")}`}
              />
              {errores.vence && (
                <p id="error-vence" className="mt-1 text-xs text-danger">
                  {errores.vence}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="tarjeta-cvv" className="mb-1.5 block text-xs font-medium">
                Código de seguridad (CVV)
              </label>
              <input
                id="tarjeta-cvv"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={tarjeta.cvv}
                onChange={(e) => campo("cvv", soloDigitos(e.target.value).slice(0, 4))}
                aria-invalid={Boolean(errores.cvv)}
                aria-describedby={errores.cvv ? "error-cvv" : undefined}
                className={`${controlClass} ${borde("cvv")}`}
              />
              {errores.cvv && (
                <p id="error-cvv" className="mt-1 text-xs text-danger">
                  {errores.cvv}
                </p>
              )}
            </div>

            <p className="flex items-start gap-2 text-xs text-secondary sm:col-span-2">
              <Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              No guardamos estos datos. Solo los últimos 4 dígitos salen de tu navegador para procesar el pago.
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
}
