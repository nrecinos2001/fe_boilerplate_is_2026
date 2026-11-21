"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveArea, type AreaFormState, type AreaFormValues } from "@/app/actions/areas";
import { ChevronDownIcon } from "@/components/icons";
import { DIAS, formatHoras, type Area } from "@/lib/areas";

const DURACIONES = [1, 2, 3, 4];

const inputClass =
  "w-full rounded-lg border border-sage bg-surface px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-secondary focus:ring-2 focus:ring-secondary/20 aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50";

function initialValues(area?: Area): AreaFormValues {
  const horarios: AreaFormValues["horarios"] = {};
  for (const { valor } of DIAS) {
    const h = area?.horarios?.find((x) => x.diaSemana === valor);
    horarios[valor] = {
      activo: Boolean(h),
      apertura: h?.horaApertura.slice(0, 5) ?? "08:00",
      cierre: h?.horaCierre.slice(0, 5) ?? "20:00",
    };
  }
  return {
    nombre: area?.nombre ?? "",
    ubicacion: area?.ubicacion ?? "",
    capacidad: area ? String(area.capacidad) : "",
    duracionBloque: String(area?.duracionBloque ?? 2),
    condicionesUso: area?.condicionesUso ?? "",
    horarios,
  };
}

export function AreaForm({ area, volverHref }: { area?: Area; volverHref: string }) {
  const [state, formAction, pending] = useActionState<AreaFormState, FormData>(saveArea, {
    values: initialValues(area),
  });
  const values = state.values ?? initialValues(area);
  const errors = state.fieldErrors ?? {};

  const [activos, setActivos] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(DIAS.map(({ valor }) => [valor, values.horarios[valor].activo])),
  );

  const duraciones = DURACIONES.includes(Number(values.duracionBloque))
    ? DURACIONES
    : [...DURACIONES, Number(values.duracionBloque)].filter((n) => n > 0).sort((a, b) => a - b);

  return (
    <form
      action={formAction}
      noValidate
      className="rounded-xl border border-border bg-surface p-6"
      aria-labelledby="titulo-configuracion"
    >
      {area && <input type="hidden" name="id" value={area.id} />}

      <h2 id="titulo-configuracion" className="text-lg font-semibold">
        {area ? `Configuración de ${area.nombre}` : "Nueva área común"}
      </h2>
      <p className="mt-1 text-xs text-secondary">
        Las condiciones se mostrarán al residente antes de reservar.
      </p>

      <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label="Nombre del área" name="nombre" error={errors.nombre}>
          <input
            id="nombre"
            name="nombre"
            defaultValue={values.nombre}
            maxLength={100}
            required
            aria-invalid={Boolean(errors.nombre)}
            aria-describedby={errors.nombre ? "nombre-error" : undefined}
            placeholder="Salón de eventos"
            className={inputClass}
          />
        </Field>

        <Field label="Ubicación" name="ubicacion" error={errors.ubicacion}>
          <input
            id="ubicacion"
            name="ubicacion"
            defaultValue={values.ubicacion}
            maxLength={150}
            required
            aria-invalid={Boolean(errors.ubicacion)}
            aria-describedby={errors.ubicacion ? "ubicacion-error" : undefined}
            placeholder="Casa club · Planta baja"
            className={inputClass}
          />
        </Field>

        <Field label="Capacidad máxima" name="capacidad" error={errors.capacidad}>
          <div className="relative">
            <input
              id="capacidad"
              name="capacidad"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              defaultValue={values.capacidad}
              required
              aria-invalid={Boolean(errors.capacidad)}
              aria-describedby={errors.capacidad ? "capacidad-error" : undefined}
              placeholder="40"
              className={`${inputClass} pr-24`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
              personas
            </span>
          </div>
        </Field>

        <Field label="Duración del bloque" name="duracionBloque" error={errors.duracionBloque}>
          <div className="relative">
            <select
              id="duracionBloque"
              name="duracionBloque"
              defaultValue={values.duracionBloque}
              required
              aria-invalid={Boolean(errors.duracionBloque)}
              aria-describedby={errors.duracionBloque ? "duracionBloque-error" : undefined}
              className={`${inputClass} appearance-none pr-10`}
            >
              {duraciones.map((h) => (
                <option key={h} value={h}>
                  {formatHoras(h)}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
          </div>
        </Field>

        <fieldset
          className="sm:col-span-2"
          aria-describedby={errors.horarios ? "horarios-error" : undefined}
        >
          <legend className="text-xs text-foreground">
            Horario de atención <span aria-hidden="true">*</span>
          </legend>
          <p className="mt-1 text-xs text-muted">
            Habilita los días en que el área se puede reservar y define su apertura y cierre.
          </p>

          <div className="mt-3 divide-y divide-border rounded-lg border border-border">
            <div className="hidden grid-cols-[140px_1fr_1fr] gap-4 px-4 py-2 text-[11px] tracking-wide text-muted uppercase sm:grid">
              <span>Día</span>
              <span>Apertura</span>
              <span>Cierre</span>
            </div>
            {DIAS.map(({ valor, nombre }) => {
              const h = values.horarios[valor];
              const activo = activos[valor];
              const error = errors[`horario-${valor}`];
              return (
                <div key={valor} className="px-4 py-2">
                  <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 sm:grid-cols-[140px_1fr_1fr]">
                    <label className="col-span-2 flex items-center gap-3 text-sm sm:col-span-1">
                      <input
                        type="checkbox"
                        name={`dia-${valor}`}
                        checked={activo}
                        onChange={(e) => setActivos((prev) => ({ ...prev, [valor]: e.target.checked }))}
                        className="size-4 accent-primary"
                      />
                      {nombre}
                    </label>
                    <input
                      type="time"
                      name={`apertura-${valor}`}
                      defaultValue={h.apertura}
                      disabled={!activo}
                      aria-label={`Apertura del ${nombre.toLowerCase()}`}
                      aria-invalid={Boolean(error)}
                      className={`${inputClass} py-1.5`}
                    />
                    <input
                      type="time"
                      name={`cierre-${valor}`}
                      defaultValue={h.cierre}
                      disabled={!activo}
                      aria-label={`Cierre del ${nombre.toLowerCase()}`}
                      aria-invalid={Boolean(error)}
                      className={`${inputClass} py-1.5`}
                    />
                  </div>
                  {error && <p className="mt-2 text-xs text-danger">{error}</p>}
                </div>
              );
            })}
          </div>
          {errors.horarios && (
            <p id="horarios-error" className="mt-2 text-xs text-danger">
              {errors.horarios}
            </p>
          )}
        </fieldset>

        <Field
          label="Condiciones de uso"
          name="condicionesUso"
          error={errors.condicionesUso}
          className="sm:col-span-2"
        >
          <textarea
            id="condicionesUso"
            name="condicionesUso"
            rows={4}
            defaultValue={values.condicionesUso}
            required
            aria-invalid={Boolean(errors.condicionesUso)}
            aria-describedby={errors.condicionesUso ? "condicionesUso-error" : undefined}
            placeholder="Respetar el aforo y el horario reservado. Entregar el espacio limpio…"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-danger">
        {state.error}
      </p>

      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:opacity-60"
        >
          {pending ? "Guardando…" : area ? "Revisar y guardar" : "Crear área"}
        </button>
        <Link
          href={volverHref}
          className="rounded-lg border border-sage px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/20"
        >
          Descartar
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={name} className="text-xs text-foreground">
        {label} <span aria-hidden="true">*</span>
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
