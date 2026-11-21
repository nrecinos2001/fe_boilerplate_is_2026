"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState, useTransition } from "react";
import {
  CalendarCheck,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Sofa,
  UserRound,
  Users,
  Sparkles,
} from "lucide-react";
import { reservar, type ReservaFormState } from "@/app/actions/reservas";
import { DIAS, type Area } from "@/lib/areas";
import { diaSemana } from "@/lib/bloqueos";
import { CONDOMINIO } from "@/lib/condominio";
import {
  duracionMin,
  fechaCorta,
  fechaTitulo,
  formatFranja,
  franjaId,
  hrefDisponibilidad,
  type Franja,
} from "@/lib/disponibilidad";
import { formatDuracion, hrefNuevaReserva } from "@/lib/reservas";

export type EstadoFranja = "disponible" | "reservada" | "bloqueada" | "cerrada" | "pasada" | "error";
export type FranjaEstado = Franja & { estado: EstadoFranja };

const ESTADOS: Record<EstadoFranja, string> = {
  disponible: "Disponible",
  reservada: "No disponible",
  bloqueada: "Bloqueado",
  cerrada: "Fuera de horario",
  pasada: "Horario pasado",
  error: "Sin datos",
};

const controlClass =
  "w-full rounded-lg border border-sage bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/20";

type Props = {
  areas: { id: number; nombre: string }[];
  area: Area;
  fecha: string;
  hoy: string;
  franjas: FranjaEstado[];
  /** Franja preseleccionada desde la consulta de disponibilidad ("10:00-12:00"). */
  franjaInicial?: string;
  unidad: string | null;
  correo: string | null;
};

const lista = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;

export default function NuevaReservaForm({
  areas,
  area,
  fecha,
  hoy,
  franjas,
  franjaInicial,
  unidad,
  correo,
}: Props) {
  const router = useRouter();
  const [navegando, startNavegacion] = useTransition();
  const [state, formAction, pending] = useActionState<ReservaFormState, FormData>(reservar, {});
  const [franjaElegida, setFranjaElegida] = useState(franjaInicial ?? "");
  const [acepta, setAcepta] = useState(false);
  // El aviso de error se oculta en cuanto el residente elige otra franja.
  const [errorDescartado, setErrorDescartado] = useState<ReservaFormState | null>(null);
  const error = errorDescartado === state ? undefined : state.error;

  // Si la franja elegida dejó de estar disponible (p. ej. tras un rechazo), se descarta.
  const seleccion = franjas.find((f) => franjaId(f) === franjaElegida && f.estado === "disponible");
  const horario = area.horarios?.find((h) => h.diaSemana === diaSemana(fecha));
  const nombreDia = DIAS.find((d) => d.valor === diaSemana(fecha))?.nombre.toLowerCase();
  const ocupadas = franjas.filter((f) => f.estado === "reservada").map(formatFranja);
  const bloqueadas = franjas.filter((f) => f.estado === "bloqueada").map(formatFranja);
  const hayDisponibles = franjas.some((f) => f.estado === "disponible");
  const unidadTexto = unidad ? `Unidad ${unidad}` : "Tu unidad";

  function navegar(cambios: { area?: number; fecha?: string }) {
    startNavegacion(() => {
      router.replace(hrefNuevaReserva({ area: area.id, fecha, ...cambios }), { scroll: false });
    });
  }

  return (
    <form
      // Envío manual: los campos son controlados y React no debe reiniciar el formulario.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <input type="hidden" name="areaId" value={area.id} />
      <input type="hidden" name="fecha" value={fecha} />
      <input type="hidden" name="inicio" value={seleccion?.inicio ?? ""} />
      <input type="hidden" name="fin" value={seleccion?.fin ?? ""} />

      <div className="flex flex-col gap-6">
        {/* 1. Datos de la reserva */}
        <section aria-labelledby="paso-datos" className="rounded-xl border border-border bg-surface p-6">
          <Paso numero={1} id="paso-datos">
            Datos de tu reserva
          </Paso>

          <div className="mt-6 flex flex-col gap-5">
            <div>
              <label htmlFor="area" className="mb-2 block text-xs font-medium">
                Área común
              </label>
              <div className="relative">
                <select
                  id="area"
                  value={area.id}
                  disabled={navegando}
                  onChange={(e) => navegar({ area: Number(e.target.value) })}
                  className={`${controlClass} appearance-none pr-10`}
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg bg-sand/30 px-4 py-4 text-sm">
              <Sofa size={22} aria-hidden="true" className="shrink-0 text-secondary" />
              <div className="flex-1">
                <p>{area.ubicacion || area.nombre}</p>
                <p className="mt-1 text-xs text-secondary">
                  Hasta {area.capacidad} personas
                  {horario
                    ? ` · Horario de uso: ${horario.horaApertura.slice(0, 5)}–${horario.horaCierre.slice(0, 5)} h`
                    : ` · No abre los ${nombreDia}`}
                </p>
              </div>
              <a
                href="#condiciones"
                className="text-xs text-secondary underline underline-offset-4 hover:text-foreground"
              >
                Condiciones ↓
              </a>
            </div>

            <div>
              <label htmlFor="fecha" className="mb-2 block text-xs font-medium">
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                min={hoy}
                value={fecha}
                disabled={navegando}
                onChange={(e) => e.target.value && navegar({ fecha: e.target.value })}
                className={controlClass}
              />
              <p className="mt-2 text-xs text-muted">{fechaTitulo(fecha)}</p>
            </div>

            <fieldset aria-describedby="nota-horario" disabled={navegando}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <legend className="text-xs font-medium">Horario</legend>
                <span className="text-[11px] text-muted">
                  Bloques de {formatDuracion((area.duracionBloque || 1) * 60)} · Hora local
                </span>
              </div>

              {franjas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-secondary">
                  {area.nombre} no abre los {nombreDia}. Elige otra fecha.
                </p>
              ) : (
                <div
                  className={`grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 ${navegando ? "opacity-60" : ""}`}
                >
                  {franjas.map((franja) => {
                    const id = franjaId(franja);
                    const disponible = franja.estado === "disponible";
                    const elegida = seleccion && franjaId(seleccion) === id;
                    return (
                      <label
                        key={id}
                        className={`flex min-h-[74px] flex-col items-center justify-center rounded-lg px-2 py-3 text-center transition-colors ${
                          elegida
                            ? "bg-primary text-primary-foreground"
                            : disponible
                              ? "cursor-pointer border border-sage bg-surface hover:bg-sage/20"
                              : "cursor-not-allowed bg-sand/30 text-foreground/70"
                        } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring`}
                      >
                        <input
                          type="radio"
                          name="franja"
                          value={id}
                          checked={Boolean(elegida)}
                          disabled={!disponible}
                          onChange={() => {
                            setFranjaElegida(id);
                            setErrorDescartado(state);
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm font-semibold">{formatFranja(franja)}</span>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 text-[11px] ${
                            elegida ? "text-primary-foreground/90" : "text-secondary"
                          }`}
                        >
                          {elegida && <Check size={12} aria-hidden="true" />}
                          {elegida ? "Seleccionado" : ESTADOS[franja.estado]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <p id="nota-horario" className="mt-3 text-xs text-secondary empty:hidden">
                {[
                  ocupadas.length > 0 &&
                    `${ocupadas.length === 1 ? "El bloque de" : "Los bloques de"} ${lista(ocupadas)} h ${
                      ocupadas.length === 1 ? "está reservado" : "están reservados"
                    }.`,
                  bloqueadas.length > 0 &&
                    `${bloqueadas.length === 1 ? "El bloque de" : "Los bloques de"} ${lista(bloqueadas)} h ${
                      bloqueadas.length === 1 ? "está bloqueado" : "están bloqueados"
                    } por la administración.`,
                  franjas.length > 0 && !hayDisponibles && "No quedan horarios disponibles este día.",
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </fieldset>
          </div>
        </section>

        {/* 2. Condiciones */}
        <section
          id="condiciones"
          aria-labelledby="paso-condiciones"
          className="scroll-mt-6 rounded-xl border border-border bg-surface p-6"
        >
          <Paso numero={2} id="paso-condiciones" suave>
            Condiciones de {area.nombre.toLowerCase()}
          </Paso>
          <ul className="mt-5 flex flex-col gap-5 text-sm">
            <Condicion icono={Clock} titulo="Respeta el horario elegido">
              {seleccion
                ? `El uso del espacio corresponde al bloque de ${seleccion.inicio} a ${seleccion.fin} h.`
                : "El uso del espacio corresponde al bloque que elijas."}
            </Condicion>
            <Condicion icono={Users} titulo="Considera la capacidad del área">
              Planea tu reunión para un máximo de {area.capacidad} personas.
            </Condicion>
            {area.condicionesUso && (
              <Condicion icono={Sparkles} titulo="Condiciones de uso">
                {area.condicionesUso}
              </Condicion>
            )}
          </ul>
        </section>
      </div>

      {/* Resumen */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <section aria-labelledby="titulo-resumen" className="rounded-xl border border-border bg-surface p-6">
          <h2 id="titulo-resumen" className="text-lg font-semibold">
            Revisa tu reserva
          </h2>
          <p className="mt-2 text-xs text-secondary">
            {CONDOMINIO.nombre} · {unidadTexto}
          </p>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs text-secondary">Área común</p>
            <p className="mt-2 font-serif text-3xl">{area.nombre}</p>
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                seleccion ? "bg-sage/30" : "bg-sand/40"
              }`}
            >
              {seleccion ? "Horario disponible" : "Elige un horario"}
            </span>

            <dl className="mt-5 flex flex-col gap-4 text-sm">
              <Dato titulo="Fecha">{fechaCorta(fecha)}</Dato>
              <Dato titulo="Horario">{seleccion ? `${formatFranja(seleccion)} h` : "—"}</Dato>
              <Dato titulo="Duración">{seleccion ? formatDuracion(duracionMin(seleccion)) : "—"}</Dato>
            </dl>
          </div>

          {error && (
            <div role="alert" className="mt-5 flex gap-3 rounded-lg bg-danger/10 px-4 py-3 text-xs leading-relaxed">
              <CircleAlert size={18} aria-hidden="true" className="shrink-0 text-danger" />
              <div>
                <p className="text-sm font-semibold text-danger">{error.titulo}</p>
                <p className="mt-1 text-foreground">{error.mensaje}</p>
              </div>
            </div>
          )}

          <label className="mt-5 flex gap-3 border-t border-border pt-5 text-xs leading-relaxed text-secondary">
            <input
              type="checkbox"
              name="acepta"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            He leído las condiciones de uso del área y revisado la fecha y el horario.
          </label>

          <button
            type="submit"
            disabled={!seleccion || !acepta || pending || navegando}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarCheck size={18} aria-hidden="true" />
            {pending ? "Confirmando…" : "Confirmar reserva"}
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
            Aún no se ha creado la reserva. La disponibilidad se verificará al confirmar.
          </p>
          <p className="mt-3 text-center">
            <Link
              href={hrefDisponibilidad({ fecha, area: area.id })}
              className="text-xs text-secondary underline underline-offset-4 hover:text-foreground"
            >
              Volver a disponibilidad
            </Link>
          </p>
        </section>

        <p className="flex gap-3 px-2 text-xs leading-relaxed text-secondary">
          <UserRound size={18} aria-hidden="true" className="shrink-0" />
          La reserva quedará a nombre de {correo ?? "tu usuario"}
          {unidad ? `, de la unidad ${unidad}` : ""}.
        </p>
      </div>
    </form>
  );
}

function Paso({
  numero,
  id,
  suave,
  children,
}: {
  numero: number;
  id: string;
  suave?: boolean;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-lg font-semibold">
      <span
        className={`grid size-7 place-items-center rounded-full text-xs ${
          suave ? "bg-sand/40 text-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {numero}
      </span>
      {children}
    </h2>
  );
}

function Condicion({
  icono: Icono,
  titulo,
  children,
}: {
  icono: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <Icono size={20} aria-hidden={true} className="shrink-0 text-secondary" />
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-secondary">{children}</p>
      </div>
    </li>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-secondary">{titulo}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
