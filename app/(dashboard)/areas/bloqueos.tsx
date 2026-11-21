"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { crearBloqueo, quitarBloqueo, type BloqueoFormState } from "@/app/actions/bloqueos";
import { ChevronDownIcon } from "@/components/icons";
import type { Horario } from "@/lib/areas";
import { MOTIVOS, fechaLarga, limitesFranjas, type BloqueoVista } from "@/lib/bloqueos";

const inputClass =
  "w-full rounded-lg border border-sage bg-surface px-3 py-3 text-sm text-foreground outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-50";

const botonPrimario =
  "rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:opacity-60";
const botonSecundario =
  "rounded-lg border border-sage px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/30";

type Props = {
  areaId: number;
  nombre: string;
  horarios: Horario[];
  duracionBloque: number;
  /** Fecha de hoy en el condominio, "YYYY-MM-DD". */
  hoy: string;
  bloqueos: BloqueoVista[];
  errorCarga?: boolean;
};

export function Bloqueos({ areaId, nombre, horarios, duracionBloque, hoy, bloqueos, errorCarga }: Props) {
  return (
    <section className="rounded-xl bg-sand/30 p-6" aria-labelledby="titulo-bloqueos">
      <h2 id="titulo-bloqueos" className="text-lg font-semibold">
        Bloqueos
      </h2>
      <p className="mt-1 text-xs text-secondary">{nombre} · Próximos bloqueos</p>

      {errorCarga ? (
        <p className="mt-4 text-xs text-danger">No se pudieron cargar los bloqueos.</p>
      ) : bloqueos.length === 0 ? (
        <p className="mt-4 text-xs text-secondary">No hay bloqueos programados.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-sand">
          {bloqueos.map((b) => (
            <BloqueoItem key={b.id} areaId={areaId} bloqueo={b} />
          ))}
        </ul>
      )}

      <NuevoBloqueo
        areaId={areaId}
        horarios={horarios}
        duracionBloque={duracionBloque}
        hoy={hoy}
      />
    </section>
  );
}

function BloqueoItem({ areaId, bloqueo }: { areaId: number; bloqueo: BloqueoVista }) {
  const [state, formAction, pending] = useActionState<BloqueoFormState, FormData>(quitarBloqueo, {});
  // La confirmación se cierra sola cuando la acción devuelve un nuevo estado.
  const [confirmandoEn, setConfirmandoEn] = useState<BloqueoFormState | null>(null);
  const confirmando = confirmandoEn === state;

  return (
    <li className="py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">{bloqueo.fecha}</p>
          <p className="mt-1 text-xs text-secondary">
            {bloqueo.franja} · {bloqueo.motivo}
          </p>
        </div>
        {!confirmando && (
          <button
            type="button"
            onClick={() => setConfirmandoEn(state)}
            className="shrink-0 text-xs font-semibold text-secondary underline underline-offset-4 hover:text-foreground"
          >
            Quitar
          </button>
        )}
      </div>

      {confirmando && (
        <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <input type="hidden" name="areaId" value={areaId} />
          <input type="hidden" name="bloqueoId" value={bloqueo.id} />
          <span className="text-secondary">¿Quitar este bloqueo?</span>
          <button type="submit" disabled={pending} className="font-semibold text-danger underline underline-offset-4">
            {pending ? "Quitando…" : "Sí, quitar"}
          </button>
          <button type="button" onClick={() => setConfirmandoEn(null)} className="font-semibold underline underline-offset-4">
            No
          </button>
        </form>
      )}

      {state.error && (
        <p aria-live="polite" className="mt-2 text-xs text-danger">
          {state.error}
        </p>
      )}
    </li>
  );
}

function NuevoBloqueo({
  areaId,
  horarios,
  duracionBloque,
  hoy,
}: Pick<Props, "areaId" | "horarios" | "duracionBloque" | "hoy">) {
  const [state, formAction, pending] = useActionState<BloqueoFormState, FormData>(crearBloqueo, {});
  const [confirmandoEn, setConfirmandoEn] = useState<BloqueoFormState | null>(null);
  const confirmando = confirmandoEn === state;

  const [fecha, setFecha] = useState(hoy);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("MANTENIMIENTO");

  // Las franjas salen del horario del área para ese día y de la duración del bloque.
  const limites = useMemo(
    () => (fecha ? limitesFranjas(horarios, fecha, duracionBloque) : []),
    [horarios, fecha, duracionBloque],
  );
  const inicios = limites.slice(0, -1);
  const desdeValido = inicios.includes(desde) ? desde : (inicios[0] ?? "");
  const finales = limites.filter((l) => l > desdeValido);
  const hastaValido = finales.includes(hasta) ? hasta : (finales[0] ?? "");
  const abre = limites.length > 1;

  return (
    <form
      // Se envía a mano para que React no reinicie el formulario: los campos son controlados
      // y un reinicio dejaría lo que se ve desincronizado de lo que se envía.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="mt-5 border-t border-sand pt-5"
    >
      <input type="hidden" name="areaId" value={areaId} />
      <h3 className="text-sm font-semibold">Nuevo bloqueo</h3>

      <fieldset disabled={confirmando || pending} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="bloqueo-fecha" className="text-xs">
            Fecha
          </label>
          <input
            id="bloqueo-fecha"
            name="fecha"
            type="date"
            min={hoy}
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputClass}
          />
        </div>

        {fecha && !abre ? (
          <p className="text-xs text-secondary">El área no abre ese día. Elige otra fecha.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Selector
              id="bloqueo-desde"
              name="desde"
              label="Desde"
              value={desdeValido}
              onChange={setDesde}
              opciones={inicios.map((h) => [h, `${h} h`])}
            />
            <Selector
              id="bloqueo-hasta"
              name="hasta"
              label="Hasta"
              value={hastaValido}
              onChange={setHasta}
              opciones={finales.map((h) => [h, `${h} h`])}
            />
          </div>
        )}

        <Selector
          id="bloqueo-motivo"
          name="motivo"
          label="Motivo"
          value={motivo}
          onChange={setMotivo}
          opciones={Object.entries(MOTIVOS)}
        />
      </fieldset>

      {/* Los campos deshabilitados no se envían: se mandan ocultos al confirmar. */}
      {confirmando && (
        <>
          <input type="hidden" name="fecha" value={fecha} />
          <input type="hidden" name="desde" value={desdeValido} />
          <input type="hidden" name="hasta" value={hastaValido} />
          <input type="hidden" name="motivo" value={motivo} />
        </>
      )}

      <p aria-live="polite" className="mt-4 text-xs leading-relaxed empty:hidden">
        {state.error ? (
          <span className="text-danger">{state.error}</span>
        ) : state.ok && !confirmando ? (
          <span className="text-secondary">{state.ok}</span>
        ) : null}
      </p>

      {confirmando ? (
        <>
          <p className="mt-4 text-xs leading-relaxed text-secondary">
            Al confirmar, la franja de {desdeValido} a {hastaValido} h del {fechaLarga(fecha)} dejará
            de estar disponible para nuevas reservas. Las reservas ya confirmadas no se cancelan.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" disabled={pending} className={botonPrimario}>
              {pending ? "Aplicando…" : "Confirmar bloqueo"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmandoEn(null)}
              className={botonSecundario}
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={!fecha || !abre}
          onClick={() => setConfirmandoEn(state)}
          className={`mt-4 ${botonPrimario}`}
        >
          Bloquear franja
        </button>
      )}
    </form>
  );
}

function Selector({
  id,
  name,
  label,
  value,
  onChange,
  opciones,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  opciones: [string, string][];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} appearance-none pr-9`}
        >
          {opciones.map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
      </div>
    </div>
  );
}
