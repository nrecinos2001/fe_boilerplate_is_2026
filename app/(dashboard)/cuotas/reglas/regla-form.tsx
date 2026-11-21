"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { guardarRegla, type ReglaFormState } from "@/app/actions/reglas-cuota";
import { AlertIcon, ChevronDownIcon } from "@/components/icons";
import {
  ALCANCES,
  DIAS_MES,
  ESTADO_REGLA,
  MONEDA,
  POLITICAS,
  TIPOS_MONTO,
  TIPOS_UNIDAD,
  estimarPeriodo,
  folioRegla,
  formatMonto,
  torresDe,
  validarRegla,
  valoresIniciales,
  type EstadoRegla,
  type ReglaCuota,
  type ReglaFieldErrors,
  type ReglaFormValues,
  type TipoUnidad,
  type UnidadCondominio,
} from "@/lib/reglas-cuota";

const inputClass =
  "w-full rounded-lg border border-sage bg-surface px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-secondary focus:ring-2 focus:ring-secondary/20 aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  regla?: ReglaCuota;
  unidades: UnidadCondominio[];
  /** No se pudieron cargar las unidades: el selector y la estimación no están disponibles. */
  errorUnidades: boolean;
  volverHref: string;
  /** Paneles extra de la columna lateral (estado de la regla, avisos). */
  children?: React.ReactNode;
};

export function ReglaForm({ regla, unidades, errorUnidades, volverHref, children }: Props) {
  const creando = !regla;
  const [state, formAction, pending] = useActionState<ReglaFormState, FormData>(guardarRegla, {});
  const [values, setValues] = useState<ReglaFormValues>(() => valoresIniciales(regla));
  const [erroresCliente, setErroresCliente] = useState<ReglaFieldErrors | null>(null);
  // Errores del servidor del último envío; se ocultan al volver a validar en el cliente.
  const errors = erroresCliente ?? state.fieldErrors ?? {};

  const set = <K extends keyof ReglaFormValues>(campo: K, valor: ReglaFormValues[K]) =>
    setValues((prev) => ({ ...prev, [campo]: valor }));

  const torres = useMemo(() => {
    const lista = torresDe(unidades);
    // Una torre guardada que ya no tiene unidades sigue apareciendo para no perderla.
    return values.torre && !lista.includes(values.torre) ? [...lista, values.torre] : lista;
  }, [unidades, values.torre]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { errors: encontrados } = validarRegla(values, { creando });
    if (Object.keys(encontrados).length > 0) {
      setErroresCliente(encontrados);
      // Lleva el foco al primer campo con error.
      const primero = Object.keys(encontrados)[0];
      document.getElementById(primero)?.focus();
      return;
    }
    setErroresCliente(null);
    const fd = new FormData();
    if (regla) fd.set("id", String(regla.id));
    fd.set("valores", JSON.stringify(values));
    // Envío manual: evita que React reinicie el formulario controlado tras la acción.
    startTransition(() => formAction(fd));
  }

  const hayErroresCampos = Object.keys(errors).length > 0;
  const errorGeneral =
    erroresCliente && hayErroresCampos
      ? { titulo: "Revisa los campos marcados", mensaje: "Hay datos faltantes o fuera de rango." }
      : state.error;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
      <form
        onSubmit={onSubmit}
        noValidate
        className="rounded-xl border border-border bg-surface p-6"
        aria-labelledby="titulo-regla"
      >
        <h2 id="titulo-regla" className="text-lg font-semibold">
          {regla ? `Configurar ${regla.concepto.toLowerCase()}` : "Nueva regla de cuota"}
        </h2>
        <p className="mt-1 text-xs text-secondary">
          {regla
            ? `${folioRegla(regla.id)} · Regla seleccionada · Los cambios solo afectan cargos futuros.`
            : "Define el concepto, el importe y a qué unidades se aplica."}
        </p>

        <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Concepto" name="concepto" error={errors.concepto} className="sm:col-span-2">
            <input
              id="concepto"
              value={values.concepto}
              onChange={(e) => set("concepto", e.target.value)}
              maxLength={100}
              aria-invalid={Boolean(errors.concepto)}
              aria-describedby={errors.concepto ? "concepto-error" : undefined}
              placeholder="Mantenimiento"
              className={inputClass}
            />
          </Field>

          <Field label="Tipo de importe" name="tipoMonto">
            <Select
              id="tipoMonto"
              value={values.tipoMonto}
              onChange={(v) => set("tipoMonto", v as ReglaFormValues["tipoMonto"])}
            >
              {TIPOS_MONTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          {values.tipoMonto === "FIJO" ? (
            <Field label={`Importe por unidad (${MONEDA})`} name="monto" error={errors.monto}>
              <MontoInput
                id="monto"
                value={values.monto}
                onChange={(v) => set("monto", v)}
                invalid={Boolean(errors.monto)}
              />
            </Field>
          ) : (
            <fieldset
              className="sm:col-span-2"
              aria-describedby={errors.montosPorTipo ? "montosPorTipo-error" : undefined}
            >
              <legend className="text-xs text-foreground">
                Importe por tipo de unidad ({MONEDA}) <span aria-hidden="true">*</span>
              </legend>
              <p className="mt-1 text-xs text-muted">
                Deja vacío un tipo para no cobrarle. Para activar la regla, cada tipo del alcance
                necesita su importe.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                {TIPOS_UNIDAD.map(({ valor, label }) => {
                  const error = errors[`monto-${valor}`];
                  return (
                    <div key={valor} className="flex flex-col gap-2">
                      <label htmlFor={`monto-${valor}`} className="text-xs text-secondary">
                        {label}
                      </label>
                      <MontoInput
                        id={`monto-${valor}`}
                        value={values.montosPorTipo[valor]}
                        onChange={(v) => set("montosPorTipo", { ...values.montosPorTipo, [valor]: v })}
                        invalid={Boolean(error)}
                      />
                      {error && <p className="text-xs text-danger">{error}</p>}
                    </div>
                  );
                })}
              </div>
              {errors.montosPorTipo && (
                <p id="montosPorTipo-error" className="mt-2 text-xs text-danger">
                  {errors.montosPorTipo}
                </p>
              )}
            </fieldset>
          )}

          <Field
            label="Día de generación"
            name="diaGeneracion"
            error={errors.diaGeneracion}
            ayuda="Día del mes en que se crean los cargos (1 a 28)."
          >
            <Select
              id="diaGeneracion"
              value={values.diaGeneracion}
              onChange={(v) => set("diaGeneracion", v)}
              invalid={Boolean(errors.diaGeneracion)}
            >
              {DIAS_MES.map((d) => (
                <option key={d} value={d}>
                  {d} de cada mes
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Día de vencimiento"
            name="diaVencimiento"
            error={errors.diaVencimiento}
            ayuda="Se calcula sobre el periodo del cargo."
          >
            <Select
              id="diaVencimiento"
              value={values.diaVencimiento}
              onChange={(v) => set("diaVencimiento", v)}
              invalid={Boolean(errors.diaVencimiento)}
            >
              {DIAS_MES.map((d) => (
                <option key={d} value={d} disabled={d < Number(values.diaGeneracion)}>
                  {d} de cada mes
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Alcance" name="alcance">
            <Select
              id="alcance"
              value={values.alcance}
              onChange={(v) => set("alcance", v as ReglaFormValues["alcance"])}
            >
              {ALCANCES.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          {values.alcance === "TORRE" && (
            <Field label="Torre" name="alcanceValor" error={errors.alcanceValor}>
              {torres.length > 0 ? (
                <Select
                  id="alcanceValor"
                  value={values.torre}
                  onChange={(v) => set("torre", v)}
                  invalid={Boolean(errors.alcanceValor)}
                >
                  <option value="">Elige una torre</option>
                  {torres.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              ) : (
                <input
                  id="alcanceValor"
                  value={values.torre}
                  onChange={(e) => set("torre", e.target.value)}
                  maxLength={50}
                  placeholder="Torre A"
                  aria-invalid={Boolean(errors.alcanceValor)}
                  className={inputClass}
                />
              )}
            </Field>
          )}

          {values.alcance === "TIPO" && (
            <Field label="Tipo de unidad" name="alcanceValor" error={errors.alcanceValor}>
              <Select
                id="alcanceValor"
                value={values.tipoUnidad}
                onChange={(v) => set("tipoUnidad", v as TipoUnidad | "")}
                invalid={Boolean(errors.alcanceValor)}
              >
                <option value="">Elige un tipo</option>
                {TIPOS_UNIDAD.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {values.alcance === "SELECCION" && (
            <SelectorUnidades
              unidades={unidades}
              errorCarga={errorUnidades}
              seleccion={values.unidadIds}
              onChange={(ids) => set("unidadIds", ids)}
              error={errors.unidadIds}
            />
          )}

          <fieldset className="sm:col-span-2">
            <legend className="text-xs text-foreground">Unidades inactivas o sin responsable</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {POLITICAS.map((p) => (
                <label
                  key={p.valor}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-secondary/30 ${
                    values.politicaInactivas === p.valor
                      ? "border-secondary bg-sage/15"
                      : "border-border hover:bg-sand/15"
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="politicaInactivas"
                      value={p.valor}
                      checked={values.politicaInactivas === p.valor}
                      onChange={() => set("politicaInactivas", p.valor)}
                      className="accent-primary"
                    />
                    {p.label}
                  </span>
                  <span className="text-xs leading-relaxed text-secondary">{p.ayuda}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {creando && (
            <Field
              label="Estado inicial"
              name="estado"
              ayuda={
                values.estado === "INACTIVA"
                  ? "Se guarda como borrador: no genera cargos y puede quedar incompleta."
                  : values.estado === "PAUSADA"
                    ? "No genera cargos hasta que la actives."
                    : "Generará cargos a partir de su próximo día de generación."
              }
            >
              <Select id="estado" value={values.estado} onChange={(v) => set("estado", v as EstadoRegla)}>
                {(["ACTIVA", "PAUSADA", "INACTIVA"] as const).map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_REGLA[e].label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        {errorGeneral && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm"
          >
            <AlertIcon className="size-5 shrink-0 text-danger" />
            <div>
              <p className="font-semibold text-danger">{errorGeneral.titulo}</p>
              <p className="mt-1 text-secondary">{errorGeneral.mensaje}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:opacity-60"
          >
            {pending ? "Guardando…" : creando ? "Crear regla" : "Guardar cambios"}
          </button>
          <Link
            href={volverHref}
            className="rounded-lg border border-sage px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/20"
          >
            Descartar
          </Link>
        </div>
      </form>

      <div className="flex flex-col gap-6">
        <Aplicacion values={values} unidades={unidades} errorUnidades={errorUnidades} regla={regla} />
        {children}
      </div>
    </div>
  );
}

function Aplicacion({
  values,
  unidades,
  errorUnidades,
  regla,
}: {
  values: ReglaFormValues;
  unidades: UnidadCondominio[];
  errorUnidades: boolean;
  regla?: ReglaCuota;
}) {
  const est = estimarPeriodo(unidades, values);
  const montoFijo = values.tipoMonto === "FIJO" ? values.monto : null;

  return (
    <aside aria-labelledby="titulo-aplicacion" className="rounded-xl bg-sand/30 p-6">
      <h2 id="titulo-aplicacion" className="text-lg font-semibold">
        Aplicación de esta regla
      </h2>

      {errorUnidades ? (
        <p className="mt-4 text-sm text-secondary">
          No se pudieron cargar las unidades para estimar el alcance.
          {regla && ` Según el último guardado abarca ${regla.unidadesAplicables} unidades.`}
        </p>
      ) : (
        <>
          <span className="mt-4 inline-block rounded-full bg-surface/70 px-3 py-1 text-xs font-semibold">
            {est.unidades} {est.unidades === 1 ? "unidad" : "unidades"}
          </span>
          {est.inactivas > 0 && (
            <p className="mt-3 text-xs text-secondary">
              {est.inactivas} {est.inactivas === 1 ? "está inactiva" : "están inactivas"} ·{" "}
              {values.politicaInactivas === "GENERAR"
                ? "se les genera cargo igual"
                : values.politicaInactivas === "OMITIR"
                  ? "se omiten"
                  : "quedan marcadas para revisión"}
              .
            </p>
          )}

          <div className="mt-5 border-t border-sand pt-5">
            {est.conCuota === 0 ? (
              <p className="text-sm text-secondary">
                {est.unidades === 0
                  ? "El alcance aún no incluye unidades."
                  : "Ingresa el importe para estimar el total."}
              </p>
            ) : (
              <p className="text-base font-semibold">
                {montoFijo !== null
                  ? `${est.conCuota} × ${formatMonto(est.total / est.conCuota)} = `
                  : `${est.conCuota} cargos = `}
                {formatMonto(est.total)}
              </p>
            )}
            {est.sinImporte > 0 && est.conCuota > 0 && (
              <p className="mt-2 text-xs text-danger">
                {est.sinImporte} {est.sinImporte === 1 ? "unidad no tiene" : "unidades no tienen"}{" "}
                importe para su tipo.
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-secondary">
              Estimación por periodo completo. Las unidades sin responsable se tratan según la
              política, y los cargos ya generados del periodo no se duplican.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

function SelectorUnidades({
  unidades,
  errorCarga,
  seleccion,
  onChange,
  error,
}: {
  unidades: UnidadCondominio[];
  errorCarga: boolean;
  seleccion: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const [filtro, setFiltro] = useState("");
  const elegidas = new Set(seleccion);
  const texto = filtro.trim().toLowerCase();
  const visibles = unidades
    .filter(
      (u) =>
        !texto ||
        u.code.toLowerCase().includes(texto) ||
        u.tower.toLowerCase().includes(texto) ||
        u.description.toLowerCase().includes(texto),
    )
    .sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));

  const alternar = (id: string) =>
    onChange(elegidas.has(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);

  return (
    <fieldset className="sm:col-span-2" aria-describedby={error ? "unidadIds-error" : undefined}>
      <legend className="text-xs text-foreground">
        Unidades <span aria-hidden="true">*</span>
      </legend>
      {errorCarga ? (
        <p className="mt-2 text-sm text-danger">
          No se pudieron cargar las unidades. Recarga la página para elegirlas.
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <input
              id="unidadIds"
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por código o torre"
              aria-label="Buscar unidades"
              aria-invalid={Boolean(error)}
              className={`${inputClass} max-w-xs py-2`}
            />
            <span className="text-xs text-secondary">
              {seleccion.length} de {unidades.length} seleccionadas
            </span>
          </div>
          <ul className="mt-3 grid max-h-60 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
            {visibles.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted sm:col-span-2">Sin coincidencias.</li>
            ) : (
              visibles.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-sand/20">
                    <input
                      type="checkbox"
                      checked={elegidas.has(u.id)}
                      onChange={() => alternar(u.id)}
                      className="size-4 accent-primary"
                    />
                    <span>
                      <span className="font-semibold">{u.code}</span>
                      <span className="text-xs text-muted">
                        {" "}
                        · {u.tower}
                        {!u.active && " · inactiva"}
                      </span>
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </>
      )}
      {error && (
        <p id="unidadIds-error" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function MontoInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
        $
      </span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        placeholder="0.00"
        className={`${inputClass} pl-7`}
      />
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  invalid,
  children,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`${inputClass} appearance-none pr-10`}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  );
}

function Field({
  label,
  name,
  error,
  ayuda,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  ayuda?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={name} className="text-xs text-foreground">
        {label} <span aria-hidden="true">*</span>
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        ayuda && <p className="text-xs text-muted">{ayuda}</p>
      )}
    </div>
  );
}
