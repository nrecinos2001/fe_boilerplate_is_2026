import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleAlert, Info } from "lucide-react";
import { logout } from "@/app/actions/auth";
import FiltrosDisponibilidad from "@/app/components/areas/FiltrosDisponibilidad";
import TablaDisponibilidad, {
  type Celda,
  type FilaArea,
} from "@/app/components/areas/TablaDisponibilidad";
import { ApiError } from "@/lib/api";
import type { Area } from "@/lib/areas";
import { consultarDisponibilidad, listAreas } from "@/lib/areas-api";
import { CONDOMINIO, horaEnCondominio, hoyEnCondominio } from "@/lib/condominio";
import {
  duracionMin,
  esFechaValida,
  fechaTitulo,
  franjaId,
  franjasDeArea,
  franjasDelDia,
  hrefDisponibilidad,
  sumarDias,
  type DisponibilidadArea,
  type Franja,
} from "@/lib/disponibilidad";

export const metadata: Metadata = {
  title: "Disponibilidad de áreas comunes",
};

const PAGE_SIZE = 10;

type ResultadoFranja =
  | { estado: "ok"; porArea: Map<number, DisponibilidadArea> }
  | { estado: "pasada" }
  | { estado: "error" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Una consulta por franja: la API responde la disponibilidad de todas las áreas en un intervalo.
async function consultarFranja(
  franja: Franja,
  fecha: string,
  areaId: number | undefined,
  /** Hora actual si la fecha es hoy: las franjas que ya empezaron no se consultan. */
  horaActual: string | null,
): Promise<ResultadoFranja> {
  if (horaActual && franja.inicio <= horaActual) return { estado: "pasada" };
  try {
    const { areas } = await consultarDisponibilidad({
      fecha,
      hora: franja.inicio,
      duracionMin: duracionMin(franja),
      areaId,
    });
    return { estado: "ok", porArea: new Map(areas.map((a) => [a.areaId, a])) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    console.error(`Error al consultar la disponibilidad de ${franjaId(franja)}:`, error);
    return { estado: "error" };
  }
}

function resolverCelda(area: Area, franja: Franja, resultado: ResultadoFranja, propias: Set<string>): Celda {
  // Sin franjas propias el área no abre ese día; si las tiene, las de otras áreas no le aplican.
  if (propias.size === 0) return "cerrada";
  if (!propias.has(franjaId(franja))) return "sin-franja";
  if (resultado.estado !== "ok") return resultado.estado;

  const disponibilidad = resultado.porArea.get(area.id);
  if (!disponibilidad) return "error";
  if (disponibilidad.disponible) return "disponible";
  switch (disponibilidad.motivo) {
    case "RESERVADA":
      return "reservada";
    case "BLOQUEADA":
      return "bloqueada";
    default:
      return "cerrada";
  }
}

export default async function DisponibilidadPage(props: PageProps<"/areas/disponibilidad">) {
  const searchParams = await props.searchParams;
  const hoy = hoyEnCondominio();
  const fechaParam = first(searchParams.fecha);
  const fecha = fechaParam && esFechaValida(fechaParam) ? fechaParam : hoy;
  const fechaPasada = fecha < hoy;

  let areas: Area[] = [];
  let errorCarga: "sesion" | "general" | null = null;
  try {
    areas = (await listAreas()) ?? [];
  } catch (error) {
    errorCarga = error instanceof ApiError && error.status === 401 ? "sesion" : "general";
    if (errorCarga === "general") console.error("Error al listar áreas:", error);
  }
  areas = areas
    .filter((a) => a.estado !== "ELIMINADA")
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const areaParam = first(searchParams.area);
  const areaSeleccionada = areas.find((a) => String(a.id) === areaParam);
  const areaInexistente = Boolean(areaParam) && !areaSeleccionada && !errorCarga;
  const consultadas = areaSeleccionada ? [areaSeleccionada] : areas;

  const franjas = franjasDelDia(consultadas, fecha);
  const franjaSeleccionada = franjas.find((f) => franjaId(f) === first(searchParams.franja));
  const columnas = franjaSeleccionada ? [franjaSeleccionada] : franjas;

  const totalPages = Math.max(1, Math.ceil(consultadas.length / PAGE_SIZE));
  const pagina = Math.min(Math.max(1, Number(first(searchParams.pagina)) || 1), totalPages);
  const visibles = consultadas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  let filas: FilaArea[] = [];
  let hayErrores = false;
  if (!errorCarga && !fechaPasada && columnas.length > 0) {
    try {
      const horaActual = fecha === hoy ? horaEnCondominio() : null;
      const resultados = await Promise.all(
        columnas.map((f) => consultarFranja(f, fecha, areaSeleccionada?.id, horaActual)),
      );
      hayErrores = resultados.some((r) => r.estado === "error");
      filas = visibles.map((area) => {
        const propias = new Set(franjasDeArea(area, fecha).map(franjaId));
        return {
          id: area.id,
          nombre: area.nombre,
          ubicacion: area.ubicacion,
          capacidad: area.capacidad,
          celdas: columnas.map((f, i) => resolverCelda(area, f, resultados[i], propias)),
        };
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) errorCarga = "sesion";
      else throw error;
    }
  }

  // Los enlaces de navegación conservan el área y la franja elegidas.
  const filtros = { area: areaSeleccionada?.id, franja: franjaSeleccionada && franjaId(franjaSeleccionada) };
  const generadoEl = new Intl.DateTimeFormat("es", {
    timeZone: CONDOMINIO.zonaHoraria,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .replace(".", "");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 text-foreground">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
          Áreas y reservas
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-[40px]">Disponibilidad de áreas comunes</h1>
        <p className="mt-2 text-sm text-secondary">
          Encuentra un espacio para compartir. Consulta los horarios de {CONDOMINIO.nombre} antes de
          reservar.
        </p>
      </div>

      {errorCarga === "sesion" ? (
        <Aviso>
          <p>Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
          <form action={logout}>
            <button type="submit" className="font-semibold text-secondary underline underline-offset-4">
              Ir a iniciar sesión
            </button>
          </form>
        </Aviso>
      ) : errorCarga ? (
        <Aviso error>No se pudieron cargar las áreas comunes. Intenta recargar la página.</Aviso>
      ) : (
        <>
          <FiltrosDisponibilidad
            fecha={fecha}
            hoy={hoy}
            areas={areas}
            franjas={franjas}
            areaSeleccionada={areaSeleccionada}
            franjaSeleccionada={franjaSeleccionada}
          />

          {areaInexistente && (
            <Aviso error>El área que elegiste ya no existe. Se muestran todas las áreas.</Aviso>
          )}
          {hayErrores && (
            <Aviso error>
              No se pudo consultar la disponibilidad de algunos horarios. Intenta de nuevo en unos
              minutos.
            </Aviso>
          )}

          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 pb-5">
              <div>
                <h2 className="text-lg font-semibold">{fechaTitulo(fecha)}</h2>
                <p className="mt-1 text-xs text-secondary">
                  Elige un horario disponible para iniciar tu reserva.
                </p>
              </div>
              <nav aria-label="Cambiar de día" className="flex items-center gap-4 text-sm">
                {fecha > hoy ? (
                  <Link
                    href={hrefDisponibilidad({ ...filtros, fecha: sumarDias(fecha, -1) })}
                    aria-label="Día anterior"
                    className="text-secondary hover:text-foreground"
                  >
                    <ChevronLeft size={18} />
                  </Link>
                ) : (
                  <span aria-hidden="true" className="text-muted/50">
                    <ChevronLeft size={18} />
                  </span>
                )}
                <Link
                  href={hrefDisponibilidad({ ...filtros, fecha: hoy })}
                  aria-current={fecha === hoy ? "date" : undefined}
                  className="text-secondary hover:text-foreground"
                >
                  Hoy
                </Link>
                <Link
                  href={hrefDisponibilidad({ ...filtros, fecha: sumarDias(fecha < hoy ? hoy : fecha, 1) })}
                  aria-label="Día siguiente"
                  className="text-secondary hover:text-foreground"
                >
                  <ChevronRight size={18} />
                </Link>
              </nav>
            </div>

            {fechaPasada ? (
              <Vacio>
                No se pueden consultar fechas pasadas.{" "}
                <Link href={hrefDisponibilidad({ ...filtros, fecha: hoy })} className="font-semibold text-foreground underline underline-offset-4">
                  Ver la disponibilidad de hoy
                </Link>
              </Vacio>
            ) : areas.length === 0 ? (
              <Vacio>Aún no hay áreas comunes registradas en {CONDOMINIO.nombre}.</Vacio>
            ) : columnas.length === 0 ? (
              <Vacio>
                {areaSeleccionada
                  ? `${areaSeleccionada.nombre} no abre este día.`
                  : "Ninguna área común abre este día."}{" "}
                Prueba con otra fecha.
              </Vacio>
            ) : (
              <>
                <TablaDisponibilidad
                  franjas={columnas}
                  filas={filas}
                  fecha={fecha}
                  descripcion={`Disponibilidad de áreas comunes del ${fechaTitulo(fecha).toLowerCase()}`}
                />
                <div className="flex items-center justify-between px-6 py-4 text-xs text-secondary">
                  <span>
                    {(pagina - 1) * PAGE_SIZE + 1}–{(pagina - 1) * PAGE_SIZE + visibles.length} de{" "}
                    {consultadas.length} {consultadas.length === 1 ? "área" : "áreas"}
                  </span>
                  <nav aria-label="Paginación" className="flex items-center gap-3">
                    <PageLink href={hrefDisponibilidad({ ...filtros, fecha, pagina: pagina - 1 })} disabled={pagina === 1}>
                      Anterior
                    </PageLink>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <Link
                        key={n}
                        href={hrefDisponibilidad({ ...filtros, fecha, pagina: n })}
                        aria-current={n === pagina ? "page" : undefined}
                        className={`grid size-6 place-items-center rounded ${
                          n === pagina ? "bg-sage/30 text-foreground" : "hover:bg-sage/20"
                        }`}
                      >
                        {n}
                      </Link>
                    ))}
                    <PageLink
                      href={hrefDisponibilidad({ ...filtros, fecha, pagina: pagina + 1 })}
                      disabled={pagina === totalPages}
                    >
                      Siguiente
                    </PageLink>
                  </nav>
                </div>
              </>
            )}
          </section>

          <aside className="flex gap-4 rounded-xl border border-sand bg-surface p-6 text-xs leading-relaxed text-secondary">
            <Info size={20} aria-hidden="true" className="shrink-0 text-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Un espacio para todos</p>
              <p className="mt-2">
                Los horarios ocupados no se pueden reservar. Revisa las condiciones de cada área al
                crear tu reserva.
              </p>
            </div>
          </aside>

          <p className="text-[11px] text-muted">
            Disponibilidad al {generadoEl} h · Los horarios se muestran en hora local del condominio.
          </p>
        </>
      )}
    </div>
  );
}

function Aviso({ error, children }: { error?: boolean; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg bg-sand/30 px-5 py-3 text-sm text-foreground"
    >
      {error && <CircleAlert size={20} aria-hidden="true" className="shrink-0 text-danger" />}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="border-t border-border px-6 py-10 text-center text-sm text-secondary">{children}</p>;
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) return <span className="text-muted/60">{children}</span>;
  return (
    <Link href={href} className="hover:text-foreground">
      {children}
    </Link>
  );
}
