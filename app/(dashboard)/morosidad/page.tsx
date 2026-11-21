import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import ErrorCarga from "@/app/components/pagos/ErrorCarga";
import Paginacion from "@/app/components/pagos/Paginacion";
import SelectorUrl from "@/app/components/pagos/SelectorUrl";
import { AlertIcon, InfoIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { CONDOMINIO, marcaHoraCondominio } from "@/lib/condominio";
import { getCurrentUser, type Unidad } from "@/lib/current-user";
import { fechaCorta } from "@/lib/estado-cuenta";
import { MONEDA, formatMonto } from "@/lib/moneda";
import {
  ANTIGUEDADES,
  TAMANO_PAGINA_MORA,
  campoDe,
  esDescendente,
  etiquetaAntiguedad,
  hrefEstadoCuenta,
  hrefMora,
  leerFiltros,
  plural,
  siguienteOrden,
  type CampoOrden,
  type FiltrosMora,
  type PaginaMora,
  type ResumenMora,
} from "@/lib/morosidad";
import { listarUnidadesMorosas, resumenMora } from "@/lib/morosidad-api";
import { listarUnidades } from "@/lib/pagos-api";

export const metadata: Metadata = {
  title: "Unidades morosas",
};

const COLUMNAS: { campo: CampoOrden; label: string; numerica?: boolean }[] = [
  { campo: "unidad", label: "Unidad / torre" },
  { campo: "responsable", label: "Responsable" },
  { campo: "cuotasVencidas", label: "Cuotas vencidas", numerica: true },
  { campo: "montoAdeudado", label: `Adeudado (${MONEDA})`, numerica: true },
  { campo: "enMoraDesde", label: "En mora desde" },
  { campo: "diasAtraso", label: "Días de atraso", numerica: true },
];

const NOMBRE_ORDEN: Record<CampoOrden, string> = {
  unidad: "unidad",
  responsable: "responsable",
  cuotasVencidas: "cuotas vencidas",
  montoAdeudado: "monto adeudado",
  enMoraDesde: "fecha de inicio de la mora",
  diasAtraso: "días de atraso",
};

function estadoDe(error: unknown): "sesion" | "denegado" | null {
  if (error instanceof ApiError && error.status === 401) return "sesion";
  if (error instanceof ApiError && error.status === 403) return "denegado";
  return null;
}

export default async function MorosidadPage(props: PageProps<"/morosidad">) {
  const filtros = leerFiltros(await props.searchParams);

  // Solo el administrador ve la morosidad (el backend también lo exige con 403).
  const usuario = await getCurrentUser();
  let acceso: "ok" | "sesion" | "denegado" = usuario?.role && usuario.role !== "ADMINISTRADOR" ? "denegado" : "ok";

  let pagina: PaginaMora | null = null;
  let resumen: ResumenMora | null = null;
  let unidades: Unidad[] | null = null;
  if (acceso === "ok") {
    const filtroBackend = { torre: filtros.torre, antiguedadMinDias: filtros.antiguedadMinDias };
    const [rPagina, rResumen, rUnidades] = await Promise.allSettled([
      listarUnidadesMorosas({ ...filtroBackend, orden: filtros.orden, pagina: filtros.pagina, tamano: TAMANO_PAGINA_MORA }),
      resumenMora(filtroBackend),
      listarUnidades(),
    ]);
    for (const r of [rPagina, rResumen, rUnidades]) {
      if (r.status === "rejected") {
        const estado = estadoDe(r.reason);
        if (estado) acceso = estado;
        else console.error("Error al cargar la morosidad:", r.reason);
      }
    }
    if (rPagina.status === "fulfilled") pagina = rPagina.value;
    if (rResumen.status === "fulfilled") resumen = rResumen.value;
    if (rUnidades.status === "fulfilled") unidades = rUnidades.value ?? [];
  }

  const torres = [...new Set((unidades ?? []).map((u) => u.tower))].sort((a, b) => a.localeCompare(b, "es"));
  if (filtros.torre && !torres.some((t) => t.toLowerCase() === filtros.torre!.toLowerCase())) torres.push(filtros.torre);
  const torreSeleccionada = torres.find((t) => t.toLowerCase() === filtros.torre?.toLowerCase()) ?? "";
  const unidadesEnAlcance = unidades
    ? filtros.torre
      ? unidades.filter((u) => u.tower.toLowerCase() === filtros.torre!.toLowerCase()).length
      : unidades.length
    : null;

  const hayFiltros = Boolean(filtros.torre) || filtros.antiguedadMinDias !== undefined;
  const sinFiltros: Partial<FiltrosMora> = { orden: filtros.orden };

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">Seguimiento de cuotas</p>
          <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-[40px]">Unidades morosas</h1>
          <p className="mt-2 text-sm text-secondary">
            Identifica saldos vencidos y desde cuándo, para dar seguimiento a cada unidad.
          </p>
        </div>

        {acceso === "denegado" ? (
          <Aviso>
            <p className="font-semibold">Acceso restringido</p>
            <p className="text-secondary">Solo la administración del condominio puede consultar la morosidad.</p>
          </Aviso>
        ) : acceso === "sesion" ? (
          <Aviso>
            <p>Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
            <form action={logout}>
              <button type="submit" className="font-semibold text-secondary underline underline-offset-4">
                Ir a iniciar sesión
              </button>
            </form>
          </Aviso>
        ) : !pagina ? (
          <ErrorCarga mensaje="No se pudieron cargar las unidades en mora. Revisa tu conexión e intenta de nuevo." />
        ) : (
          <>
            {resumen ? (
              <Resumen resumen={resumen} unidadesEnAlcance={unidadesEnAlcance} hayFiltros={hayFiltros} />
            ) : (
              <p className="flex items-center gap-3 rounded-lg bg-sand/30 px-5 py-3 text-xs text-secondary">
                <AlertIcon className="size-4 shrink-0 text-danger" />
                No se pudieron calcular los totales. La tabla sí está actualizada.
              </p>
            )}

            <section aria-label="Filtros" className="rounded-xl border border-border bg-surface p-6">
              <div className="grid gap-4 md:grid-cols-2">
                {unidades ? (
                  <SelectorUrl
                    parametro="torre"
                    etiqueta="Torre"
                    valor={torreSeleccionada}
                    opciones={[{ valor: "", texto: "Todas las torres" }, ...torres.map((t) => ({ valor: t, texto: t }))]}
                    reiniciar={["pagina"]}
                  />
                ) : (
                  <p className="self-end text-xs text-danger">
                    No se pudo cargar la lista de torres; el filtro por torre no está disponible.
                  </p>
                )}
                <SelectorUrl
                  parametro="antiguedad"
                  etiqueta="Antigüedad de la mora"
                  valor={filtros.antiguedadMinDias === undefined ? "" : String(filtros.antiguedadMinDias)}
                  opciones={[
                    { valor: "", texto: "Cualquier antigüedad" },
                    ...(filtros.antiguedadMinDias !== undefined &&
                    !ANTIGUEDADES.some((a) => a.dias === filtros.antiguedadMinDias)
                      ? [{ valor: String(filtros.antiguedadMinDias), texto: etiquetaAntiguedad(filtros.antiguedadMinDias) }]
                      : []),
                    ...ANTIGUEDADES.map((a) => ({ valor: String(a.dias), texto: a.label })),
                  ]}
                  reiniciar={["pagina"]}
                />
              </div>

              {hayFiltros && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-secondary">Filtros activos:</span>
                  {filtros.torre && (
                    <Chip href={hrefMora({ ...filtros, torre: undefined, pagina: 1 })} quitar={`el filtro ${torreSeleccionada}`}>
                      {torreSeleccionada}
                    </Chip>
                  )}
                  {filtros.antiguedadMinDias !== undefined && (
                    <Chip
                      href={hrefMora({ ...filtros, antiguedadMinDias: undefined, pagina: 1 })}
                      quitar="el filtro de antigüedad"
                    >
                      {etiquetaAntiguedad(filtros.antiguedadMinDias)}
                    </Chip>
                  )}
                  <Link
                    href={hrefMora(sinFiltros)}
                    className="ml-1 font-semibold text-foreground underline underline-offset-4"
                  >
                    Limpiar filtros
                  </Link>
                </div>
              )}
            </section>

            <Tabla pagina={pagina} filtros={filtros} torre={torreSeleccionada} hayFiltros={hayFiltros} sinFiltros={sinFiltros} />

            <div className="flex items-start gap-4 rounded-xl bg-sand/30 px-6 py-5">
              <InfoIcon className="size-5 shrink-0 text-foreground" />
              <div>
                <p className="text-sm font-semibold">Solo cuenta lo vencido</p>
                <p className="mt-1 text-xs leading-relaxed text-secondary">
                  Una unidad está en mora si tiene al menos una cuota pendiente o parcial que venció antes de hoy.
                  Una cuota que vence hoy todavía no cuenta. El monto adeudado suma solo los saldos vencidos: no
                  incluye cuotas por vencer, intereses ni sanciones. Cuando la unidad paga todo lo vencido, deja de
                  aparecer.
                </p>
              </div>
            </div>
          </>
        )}

        <p className="text-[11px] text-muted">
          Información al {marcaHoraCondominio()} · Hora local de {CONDOMINIO.nombre} · Importes en {MONEDA}.
        </p>
      </div>
    </>
  );
}

function Resumen({
  resumen,
  unidadesEnAlcance,
  hayFiltros,
}: {
  resumen: ResumenMora;
  unidadesEnAlcance: number | null;
  hayFiltros: boolean;
}) {
  const porcentaje =
    unidadesEnAlcance && unidadesEnAlcance > 0
      ? new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(
          (resumen.unidades / unidadesEnAlcance) * 100,
        )
      : null;
  const mayor = resumen.mayorAtraso;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section aria-label="Total vencido" className="rounded-xl bg-forest p-6 text-cream">
        <p className="text-sm">Total vencido{hayFiltros ? " (con los filtros)" : ""}</p>
        <p className="mt-3 font-serif text-4xl break-words">{formatMonto(resumen.totalAdeudado)}</p>
        <p className="mt-3 text-xs text-sand">
          {plural(resumen.cuotasVencidas, "cuota vencida", "cuotas vencidas")} · {MONEDA}
        </p>
      </section>
      <section aria-label="Unidades con adeudo" className="rounded-xl bg-sand/30 p-6">
        <p className="text-sm text-secondary">Unidades con adeudo</p>
        <p className="mt-3 font-serif text-4xl">
          {resumen.unidades}
          {unidadesEnAlcance !== null && ` de ${unidadesEnAlcance}`}
        </p>
        <p className="mt-3 text-xs text-secondary">
          {porcentaje !== null
            ? `${porcentaje}% de las unidades${hayFiltros ? " de la selección" : " del condominio"}`
            : "Unidades con al menos una cuota vencida"}
        </p>
      </section>
      <section aria-label="Mayor antigüedad" className="rounded-xl border border-border bg-surface p-6">
        <p className="text-sm text-secondary">Mayor antigüedad</p>
        <p className="mt-3 font-serif text-4xl">{mayor ? plural(mayor.diasAtraso, "día", "días") : "—"}</p>
        <p className="mt-3 text-xs text-secondary">
          {mayor ? `${mayor.codigoUnidad} · En mora desde el ${fechaCorta(mayor.enMoraDesde)}` : "Sin unidades en mora"}
        </p>
      </section>
    </div>
  );
}

function Tabla({
  pagina,
  filtros,
  torre,
  hayFiltros,
  sinFiltros,
}: {
  pagina: PaginaMora;
  filtros: FiltrosMora;
  torre: string;
  hayFiltros: boolean;
  sinFiltros: Partial<FiltrosMora>;
}) {
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.tamano));
  const campo = campoDe(filtros.orden);
  const descendente = esDescendente(filtros.orden);

  return (
    <section aria-labelledby="titulo-detalle" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="px-6 pt-6 pb-4">
        <h2 id="titulo-detalle" className="text-lg font-semibold">
          Detalle de unidades con adeudo
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Torres: {torre || "todas"} · Antigüedad:{" "}
          {filtros.antiguedadMinDias === undefined ? "cualquiera" : etiquetaAntiguedad(filtros.antiguedadMinDias)} ·
          Orden: {NOMBRE_ORDEN[campo]} ({descendente ? "descendente" : "ascendente"}) · Corte:{" "}
          {fechaCorta(pagina.fechaCorte)}
        </p>
      </div>

      {pagina.total === 0 ? (
        <div className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
          {hayFiltros ? (
            <>
              <p>Ninguna unidad en mora cumple los filtros.</p>
              <Link
                href={hrefMora(sinFiltros)}
                className="mt-2 inline-block font-semibold text-foreground underline underline-offset-4"
              >
                Limpiar filtros
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">No hay unidades en mora</p>
              <p className="mt-1">Todas las unidades están al día con sus cuotas vencidas.</p>
            </>
          )}
        </div>
      ) : pagina.items.length === 0 ? (
        <p className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
          No hay unidades en esta página.{" "}
          <Link
            href={hrefMora({ ...filtros, pagina: 1 })}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Ir a la primera
          </Link>
        </p>
      ) : (
        <>
          {/* relative: los textos sr-only (absolutos) quedan dentro del scroll y no ensanchan la página. */}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-sand/30 text-[11px] font-semibold tracking-wide uppercase">
                <tr>
                  {COLUMNAS.map((c) => {
                    const activa = c.campo === campo;
                    return (
                      <th
                        key={c.campo}
                        scope="col"
                        aria-sort={activa ? (descendente ? "descending" : "ascending") : undefined}
                        className={`px-4 py-4 first:pl-6 ${c.numerica ? "text-right" : ""}`}
                      >
                        <Link
                          href={hrefMora({ ...filtros, orden: siguienteOrden(filtros.orden, c.campo), pagina: 1 })}
                          scroll={false}
                          className={`inline-flex items-center gap-1 hover:text-secondary ${activa ? "" : "text-foreground/80"}`}
                        >
                          {c.label}
                          <span aria-hidden="true" className={activa ? "" : "opacity-30"}>
                            {activa ? (descendente ? "↓" : "↑") : "↕"}
                          </span>
                          <span className="sr-only">
                            {activa
                              ? `, orden ${descendente ? "descendente" : "ascendente"}. Cambiar el orden`
                              : ". Ordenar por esta columna"}
                          </span>
                        </Link>
                      </th>
                    );
                  })}
                  <th scope="col" className="px-6 py-4">
                    Consultar
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagina.items.map((u) => (
                  <tr key={u.unidadId} className="border-b border-border last:border-0">
                    <td className="py-4 pr-4 pl-6">
                      <p className="font-semibold">{u.codigoUnidad}</p>
                      <p className="mt-1 text-xs text-muted">{u.torre}</p>
                    </td>
                    <td className="px-4 py-4 text-secondary">
                      {u.responsable ?? <span className="text-muted">Sin residente asignado</span>}
                    </td>
                    <td className="px-4 py-4 text-right">{u.cuotasVencidas}</td>
                    <td className="px-4 py-4 text-right font-semibold">{formatMonto(u.montoAdeudado)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{fechaCorta(u.enMoraDesde)}</td>
                    <td className={`px-4 py-4 text-right ${u.diasAtraso > 60 ? "font-semibold text-danger" : ""}`}>
                      {plural(u.diasAtraso, "día", "días")}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={hrefEstadoCuenta(u.unidadId)}
                        className="font-semibold whitespace-nowrap text-secondary underline underline-offset-4 hover:text-foreground"
                      >
                        Ver cuenta
                        <span className="sr-only"> de {u.codigoUnidad}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion
            pagina={pagina.pagina}
            totalPaginas={totalPaginas}
            total={pagina.total}
            tamano={pagina.tamano}
            unidad={pagina.total === 1 ? "unidad" : "unidades"}
            href={(n) => hrefMora({ ...filtros, pagina: n })}
          />
        </>
      )}
    </section>
  );
}

function Chip({ href, quitar, children }: { href: string; quitar: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-sage/30 px-3 py-1 font-semibold hover:bg-sage/50"
    >
      {children}
      <span aria-hidden="true">×</span>
      <span className="sr-only">Quitar {quitar}</span>
    </Link>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg bg-sand/30 px-5 py-3 text-sm text-foreground">
      <AlertIcon className="size-5 shrink-0 text-danger" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
