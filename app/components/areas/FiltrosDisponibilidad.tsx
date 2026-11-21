import Form from "next/form";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import type { Area } from "@/lib/areas";
import {
  RUTA_DISPONIBILIDAD,
  fechaCorta,
  formatFranja,
  franjaId,
  type Franja,
} from "@/lib/disponibilidad";

const labelClass = "mb-2 block text-xs font-medium text-foreground";
const controlClass =
  "w-full rounded-lg border border-sage bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/20";

type Props = {
  fecha: string;
  /** Fecha de hoy en el condominio: no se pueden consultar fechas anteriores. */
  hoy: string;
  areas: Area[];
  franjas: Franja[];
  areaSeleccionada?: Area;
  franjaSeleccionada?: Franja;
};

// Formulario GET: los filtros viven en la URL, así la consulta se puede recargar y compartir.
export default function FiltrosDisponibilidad({
  fecha,
  hoy,
  areas,
  franjas,
  areaSeleccionada,
  franjaSeleccionada,
}: Props) {
  const franjaActual = franjaSeleccionada ? franjaId(franjaSeleccionada) : "";

  return (
    <section
      aria-label="Filtros de la consulta"
      className="rounded-xl border border-border bg-surface p-6"
    >
      <Form
        // La key reinicia los valores por defecto al navegar entre consultas.
        key={`${fecha}|${areaSeleccionada?.id ?? ""}|${franjaActual}`}
        action={RUTA_DISPONIBILIDAD}
        className="grid items-end gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
      >
        <div>
          <label htmlFor="fecha" className={labelClass}>
            Fecha de consulta
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            required
            min={hoy}
            defaultValue={fecha}
            className={controlClass}
          />
        </div>

        <div>
          <label htmlFor="area" className={labelClass}>
            Área común
          </label>
          <div className="relative">
            <select
              id="area"
              name="area"
              defaultValue={areaSeleccionada?.id ?? ""}
              className={`${controlClass} appearance-none pr-10`}
            >
              <option value="">Todas las áreas</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.nombre}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-secondary"
            />
          </div>
        </div>

        <div>
          <label htmlFor="franja" className={labelClass}>
            Franja horaria
          </label>
          <div className="relative">
            <select
              id="franja"
              name="franja"
              defaultValue={franjaActual}
              className={`${controlClass} appearance-none pr-10`}
            >
              <option value="">Todos los horarios</option>
              {franjas.map((franja) => (
                <option key={franjaId(franja)} value={franjaId(franja)}>
                  {formatFranja(franja)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-secondary"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss"
        >
          <Search size={18} aria-hidden="true" />
          Consultar
        </button>
      </Form>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-sand/40 px-3 py-1.5 font-semibold">
          Fecha: {fechaCorta(fecha)}
        </span>
        <span className="rounded-full bg-sand/40 px-3 py-1.5 font-semibold">
          Área: {areaSeleccionada?.nombre ?? "todas"}
        </span>
        <span className="rounded-full bg-sand/40 px-3 py-1.5 font-semibold">
          Horario: {franjaSeleccionada ? formatFranja(franjaSeleccionada) : "todos"}
        </span>
        <Link
          href={RUTA_DISPONIBILIDAD}
          className="ml-1 text-secondary underline underline-offset-4 hover:text-foreground"
        >
          Restablecer
        </Link>
      </div>
    </section>
  );
}
