import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, ChevronDown, CircleAlert, CircleCheck, Plus } from "lucide-react";
import { logout } from "@/app/actions/auth";
import CancelarReserva from "@/app/components/reservas/CancelarReserva";
import { ApiError } from "@/lib/api";
import type { Area } from "@/lib/areas";
import { listAreas } from "@/lib/areas-api";
import { CONDOMINIO } from "@/lib/condominio";
import { getCurrentUser } from "@/lib/current-user";
import { RUTA_DISPONIBILIDAD } from "@/lib/disponibilidad";
import { listarMisReservas } from "@/lib/reservas-api";
import {
  ESTADO_VISTA,
  RUTA_MIS_RESERVAS,
  RUTA_NUEVA_RESERVA,
  reservasVista,
  type ReservaVista,
} from "@/lib/reservas";

export const metadata: Metadata = {
  title: "Mis reservas",
};

const PAGE_SIZE = 10;

const VISTAS = {
  todas: "Todas",
  proximas: "Próximas",
  historial: "Historial",
} as const;
type Vista = keyof typeof VISTAS;

const MENSAJES_OK: Record<string, string> = {
  creada: "Reserva confirmada. Te esperamos en el horario elegido.",
  cancelada: "Reserva cancelada. El horario quedó libre para la comunidad.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type Filtros = { vista: Vista; periodo: number; pagina?: number; cancelar?: number };

function href({ vista, periodo, pagina, cancelar }: Filtros, anioActual: number) {
  const sp = new URLSearchParams();
  if (vista !== "todas") sp.set("vista", vista);
  if (periodo !== anioActual) sp.set("periodo", String(periodo));
  if (pagina && pagina > 1) sp.set("pagina", String(pagina));
  if (cancelar) sp.set("cancelar", String(cancelar));
  const qs = sp.toString();
  return `${RUTA_MIS_RESERVAS}${qs ? `?${qs}` : ""}`;
}

export default async function MisReservasPage(props: PageProps<"/reservas">) {
  const searchParams = await props.searchParams;
  const ok = MENSAJES_OK[first(searchParams.ok) ?? ""];
  const anioActual = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: CONDOMINIO.zonaHoraria, year: "numeric" }).format(new Date()),
  );

  let reservas: ReservaVista[] = [];
  let nombres = new Map<number, string>();
  let errorCarga: "sesion" | "general" | null = null;
  try {
    const [lista, areas] = await Promise.all([
      listarMisReservas(),
      listAreas().catch((): Area[] => []),
    ]);
    reservas = reservasVista(lista ?? []);
    nombres = new Map(areas.map((a) => [a.id, a.nombre]));
  } catch (error) {
    errorCarga = error instanceof ApiError && error.status === 401 ? "sesion" : "general";
    if (errorCarga === "general") console.error("Error al listar reservas:", error);
  }

  const usuario = await getCurrentUser();
  const unidad = usuario?.unit?.code;

  const vistaParam = first(searchParams.vista);
  const vista: Vista = vistaParam && vistaParam in VISTAS ? (vistaParam as Vista) : "todas";
  const periodos = [...new Set([anioActual, ...reservas.map((r) => r.anio)])].sort((a, b) => b - a);
  const periodo = Number(first(searchParams.periodo)) || anioActual;

  const delPeriodo = reservas.filter((r) => r.anio === periodo);
  const conteo: Record<Vista, number> = {
    todas: delPeriodo.length,
    proximas: delPeriodo.filter((r) => r.proxima).length,
    historial: delPeriodo.filter((r) => !r.proxima).length,
  };
  const filtradas = delPeriodo.filter((r) =>
    vista === "proximas" ? r.proxima : vista === "historial" ? !r.proxima : true,
  );

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pagina = Math.min(Math.max(1, Number(first(searchParams.pagina)) || 1), totalPages);
  const visibles = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const aCancelar = reservas.find((r) => String(r.id) === first(searchParams.cancelar) && r.proxima);
  const confirmadas = reservas.filter((r) => r.proxima).length;
  const filtros: Filtros = { vista, periodo, pagina };
  const nombreArea = (r: ReservaVista) => nombres.get(r.areaId) ?? "Área no disponible";

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
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
            Áreas y reservas
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-[40px]">Mis reservas</h1>
          <p className="mt-2 text-sm text-secondary">
            Consulta tus próximos encuentros y el historial de reservas de tu unidad
            {unidad ? ` ${unidad}` : ""}.
          </p>
        </div>
        <Link
          href={RUTA_NUEVA_RESERVA}
          className="inline-flex items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss"
        >
          <Plus size={18} aria-hidden="true" />
          Nueva reserva
        </Link>
      </div>

      {ok && (
        <p role="status" className="flex items-center gap-3 rounded-lg bg-sage/25 px-5 py-3 text-sm">
          <CircleCheck size={20} aria-hidden="true" className="text-secondary" />
          {ok}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 pb-5">
          <div>
            <h2 className="text-lg font-semibold">Reservas de mi unidad</h2>
            <nav aria-label="Filtrar reservas" className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(VISTAS) as Vista[]).map((v) => (
                <Link
                  key={v}
                  href={href({ vista: v, periodo }, anioActual)}
                  aria-current={v === vista ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    v === vista ? "bg-primary text-primary-foreground" : "bg-sand/30 hover:bg-sand/50"
                  }`}
                >
                  {VISTAS[v]} ({conteo[v]})
                </Link>
              ))}
            </nav>
          </div>

          <details className="relative text-xs text-secondary">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-1 hover:text-foreground">
              Periodo: {periodo}
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <ul className="absolute right-0 z-10 mt-2 min-w-28 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
              {periodos.map((p) => (
                <li key={p}>
                  <Link
                    href={href({ vista, periodo: p }, anioActual)}
                    aria-current={p === periodo ? "true" : undefined}
                    className={`block px-4 py-2 hover:bg-sand/30 ${p === periodo ? "font-semibold text-foreground" : ""}`}
                  >
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {errorCarga === "sesion" ? (
          <div className="flex flex-col items-start gap-3 border-t border-border px-6 py-8 text-sm">
            <p>Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
            <form action={logout}>
              <button type="submit" className="font-semibold text-secondary underline underline-offset-4">
                Ir a iniciar sesión
              </button>
            </form>
          </div>
        ) : errorCarga ? (
          <p className="flex items-center gap-3 border-t border-border px-6 py-8 text-sm text-danger">
            <CircleAlert size={20} aria-hidden="true" />
            No se pudieron cargar tus reservas. Intenta recargar la página.
          </p>
        ) : filtradas.length === 0 ? (
          <div className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
            <p>
              {vista === "proximas"
                ? "No tienes reservas próximas."
                : vista === "historial"
                  ? "Aún no tienes reservas en tu historial."
                  : `No tienes reservas en ${periodo}.`}
            </p>
            <Link
              href={RUTA_NUEVA_RESERVA}
              className="mt-2 inline-block font-semibold text-foreground underline underline-offset-4"
            >
              Hacer una reserva
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-sand/30 text-[11px] font-semibold tracking-wide uppercase">
                  <tr>
                    <th scope="col" className="px-6 py-4">Área / Folio</th>
                    <th scope="col" className="px-4 py-4">
                      Fecha <span aria-hidden="true">↓</span>
                    </th>
                    <th scope="col" className="px-4 py-4">Horario</th>
                    <th scope="col" className="px-4 py-4">Estado</th>
                    <th scope="col" className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((r) => {
                    const seleccionada = aCancelar?.id === r.id;
                    const estado = ESTADO_VISTA[r.estado];
                    return (
                      <tr key={r.id} className={`border-b border-border ${seleccionada ? "bg-sage/25" : ""}`}>
                        <td className="px-6 py-4">
                          <p>{nombreArea(r)}</p>
                          <p className="mt-1 text-xs text-muted">{r.folio}</p>
                        </td>
                        <td className="px-4 py-4 text-secondary">{r.fecha}</td>
                        <td className="px-4 py-4 text-secondary">{r.horario}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
                            {estado.texto}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {r.proxima ? (
                            <Link
                              href={`${href({ ...filtros, cancelar: r.id }, anioActual)}#cancelar`}
                              aria-current={seleccionada ? "true" : undefined}
                              className="inline-flex items-center gap-2 text-xs font-semibold hover:underline"
                            >
                              {seleccionada && <ArrowRight size={14} aria-hidden="true" />}
                              Cancelar
                              <span className="sr-only"> la reserva {r.folio}</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 text-xs text-secondary">
              <span>
                {(pagina - 1) * PAGE_SIZE + 1}–{(pagina - 1) * PAGE_SIZE + visibles.length} de{" "}
                {filtradas.length} {filtradas.length === 1 ? "reserva" : "reservas"}
              </span>
              <nav aria-label="Paginación" className="flex items-center gap-3">
                {pagina > 1 ? (
                  <Link href={href({ ...filtros, pagina: pagina - 1 }, anioActual)} className="hover:text-foreground">
                    Anterior
                  </Link>
                ) : (
                  <span className="text-muted/60">Anterior</span>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={href({ ...filtros, pagina: n }, anioActual)}
                    aria-current={n === pagina ? "page" : undefined}
                    className={`grid size-6 place-items-center rounded ${
                      n === pagina ? "bg-sage/30 text-foreground" : "hover:bg-sage/20"
                    }`}
                  >
                    {n}
                  </Link>
                ))}
                {pagina < totalPages ? (
                  <Link href={href({ ...filtros, pagina: pagina + 1 }, anioActual)} className="hover:text-foreground">
                    Siguiente
                  </Link>
                ) : (
                  <span className="text-muted/60">Siguiente</span>
                )}
              </nav>
            </div>
          </>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,580px)]">
        <aside className="flex flex-col gap-3 py-2 text-sm">
          <p className="flex items-center gap-3 text-base font-semibold">
            <CalendarCheck size={22} aria-hidden="true" className="text-secondary" />
            Tus planes, siempre a la mano
          </p>
          <p className="leading-relaxed text-secondary">
            Puedes cancelar tus reservas próximas desde este listado. Las finalizadas y canceladas se
            conservan en tu historial.
          </p>
          {!errorCarga && (
            <p className="text-xs leading-relaxed text-secondary">
              {confirmadas === 0
                ? "No tienes reservas próximas."
                : `Tienes ${confirmadas} ${confirmadas === 1 ? "reserva próxima" : "reservas próximas"}.`}
              {aCancelar && " La reserva seleccionada seguirá vigente hasta que confirmes la cancelación."}
            </p>
          )}
          <Link
            href={RUTA_DISPONIBILIDAD}
            className="inline-flex items-center gap-2 text-xs font-semibold hover:underline"
          >
            Consultar disponibilidad de áreas <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </aside>

        {aCancelar && (
          <CancelarReserva
            key={aCancelar.id}
            id={aCancelar.id}
            area={nombreArea(aCancelar)}
            folio={aCancelar.folio}
            cuando={`${aCancelar.fecha} · ${aCancelar.horario}`}
            cerrarHref={href(filtros, anioActual)}
          />
        )}
      </div>

      <p className="text-[11px] text-muted">
        Información al {generadoEl} h · Horarios en hora local del condominio.
      </p>
    </div>
  );
}
