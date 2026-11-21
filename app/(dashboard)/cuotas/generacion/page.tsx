import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import Paginacion from "@/app/components/pagos/Paginacion";
import SelectorUrl from "@/app/components/pagos/SelectorUrl";
import { AlertIcon, FilePlusIcon, InfoIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { CONDOMINIO, hoyEnCondominio, marcaHoraCondominio } from "@/lib/condominio";
import { getCurrentUser } from "@/lib/current-user";
import { fechaCorta, nombrePeriodo } from "@/lib/estado-cuenta";
import {
  ESTADO_EJECUCION,
  MOTIVO_EXCEPCION,
  ORIGEN_EJECUCION,
  RESULTADO_EXCEPCION,
  RUTA_GENERACION,
  desglosarVista,
  esPeriodoValido,
  fechaHoraEjecucion,
  periodoActual,
  periodoEnTexto,
  periodosSeleccionables,
  plural,
  type DesgloseVista,
  type PaginaEjecuciones,
  type VistaPrevia,
} from "@/lib/generacion-cuotas";
import { listarEjecuciones, obtenerVistaPrevia } from "@/lib/generacion-cuotas-api";
import { MONEDA, formatMonto } from "@/lib/moneda";
import {
  ESTADO_REGLA,
  RUTA_REGLAS,
  describirAlcance,
  folioRegla,
  type ReglaCuota,
} from "@/lib/reglas-cuota";
import { listReglasCuota } from "@/lib/reglas-cuota-api";
import { ConfirmarGeneracion } from "./confirmar-generacion";
import { RecalcularVista } from "./recalcular-vista";

export const metadata: Metadata = {
  title: "Generación manual de cuotas",
};

const TAMANO_HISTORIAL = 10;

type ErrorCarga = "sesion" | "denegado" | "general";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function href(params: { regla?: number; periodo?: string; pagina?: number }) {
  const sp = new URLSearchParams();
  if (params.regla) sp.set("regla", String(params.regla));
  if (params.periodo) sp.set("periodo", params.periodo);
  if (params.pagina && params.pagina > 1) sp.set("pagina", String(params.pagina));
  const qs = sp.toString();
  return `${RUTA_GENERACION}${qs ? `?${qs}` : ""}`;
}

function clasificar(error: unknown, contexto: string): ErrorCarga {
  if (error instanceof ApiError && error.status === 401) return "sesion";
  if (error instanceof ApiError && error.status === 403) return "denegado";
  console.error(`Error al cargar ${contexto}:`, error);
  return "general";
}

export default async function GeneracionManualPage(props: PageProps<"/cuotas/generacion">) {
  const searchParams = await props.searchParams;
  const actual = periodoActual();

  // Solo el administrador genera cuotas (el backend también lo exige con 403).
  const usuario = await getCurrentUser();
  let acceso: "ok" | ErrorCarga = usuario?.role && usuario.role !== "ADMINISTRADOR" ? "denegado" : "ok";

  let reglas: ReglaCuota[] = [];
  if (acceso === "ok") {
    try {
      reglas = ((await listReglasCuota()) ?? []).sort((a, b) => a.id - b.id);
    } catch (error) {
      acceso = clasificar(error, "las reglas de cuota");
    }
  }

  // Regla: la de la URL o, si no hay, la primera activa.
  const reglaParam = first(searchParams.regla);
  const regla = reglaParam
    ? reglas.find((r) => String(r.id) === reglaParam)
    : (reglas.find((r) => r.estado === "ACTIVA") ?? reglas[0]);
  const reglaPerdida = Boolean(reglaParam) && !regla && acceso === "ok";

  // Periodo: el de la URL o el actual. Nunca futuro.
  const periodoParam = first(searchParams.periodo);
  const periodo = esPeriodoValido(periodoParam) ? periodoParam : actual;
  const periodoFuturo = periodo > actual;
  const periodoInvalido = periodoParam !== undefined && !esPeriodoValido(periodoParam);
  const pagina = Math.max(1, Math.floor(Number(first(searchParams.pagina))) || 1);

  // Vista previa (solo reglas activas: el backend respondería 422) e historial en paralelo.
  let vista: VistaPrevia | null = null;
  let errorVista: { titulo: string; mensaje: string } | null = null;
  let historial: PaginaEjecuciones | null = null;
  let errorHistorial = false;
  if (acceso === "ok" && regla) {
    const [rVista, rHistorial] = await Promise.allSettled([
      regla.estado === "ACTIVA" && !periodoFuturo ? obtenerVistaPrevia(regla.id, periodo) : null,
      listarEjecuciones(regla.id, pagina, TAMANO_HISTORIAL),
    ]);

    if (rVista.status === "fulfilled") vista = rVista.value;
    else {
      const e = rVista.reason;
      if (e instanceof ApiError && e.codigo === "REGLA_INACTIVA") {
        errorVista = { titulo: "No se puede generar este periodo", mensaje: e.message };
      } else if (e instanceof ApiError && e.codigo === "REGLA_INEXISTENTE") {
        errorVista = { titulo: "La regla ya no existe", mensaje: "Vuelve a la lista de reglas y recárgala." };
      } else if (e instanceof ApiError && e.codigo === "SOLICITUD_INVALIDA") {
        errorVista = { titulo: "Revisa el periodo", mensaje: e.message };
      } else {
        const tipo = clasificar(e, "la vista previa de generación");
        if (tipo !== "general") acceso = tipo;
        errorVista = {
          titulo: "No se pudo calcular la vista previa",
          mensaje: "Revisa tu conexión y vuelve a calcularla. No se generó ninguna cuota.",
        };
      }
    }

    if (rHistorial.status === "fulfilled") historial = rHistorial.value;
    else {
      const tipo = clasificar(rHistorial.reason, "el historial de ejecuciones");
      if (tipo !== "general") acceso = tipo;
      errorHistorial = true;
    }
  }

  const periodos = periodosSeleccionables(actual);
  if (!periodos.includes(periodo) && !periodoFuturo) periodos.push(periodo);
  const configurarHref = regla ? `${RUTA_REGLAS}?regla=${regla.id}` : RUTA_REGLAS;
  const d = vista ? desglosarVista(vista) : null;

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
              Cuotas · Revisión previa
            </p>
            <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-[40px]">Generación manual</h1>
            <p className="mt-2 text-sm text-secondary">
              Genera las cuotas de un periodo que no se generó solo. Revisa la vista previa y confirma
              antes de emitirlas.
            </p>
          </div>
          <span className="rounded-full bg-sand/40 px-3 py-1 text-xs font-semibold">
            Vista previa · Sin emitir
          </span>
        </div>

        {acceso === "denegado" ? (
          <Aviso>
            <p className="font-semibold">Acceso restringido</p>
            <p className="text-secondary">Solo la administración del condominio puede generar cuotas.</p>
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
        ) : acceso === "general" ? (
          <Aviso>
            <p className="font-semibold">No se pudieron cargar las reglas de cuota</p>
            <p className="text-secondary">Revisa tu conexión y recarga la página.</p>
          </Aviso>
        ) : reglas.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center text-sm text-secondary">
            <p>Aún no hay reglas de cuota. Las cuotas se generan a partir de una regla activa.</p>
            <Link
              href={`${RUTA_REGLAS}?regla=nueva`}
              className="mt-2 inline-block font-semibold text-foreground underline underline-offset-4"
            >
              Crear una regla
            </Link>
          </div>
        ) : (
          <>
            <section
              aria-labelledby="titulo-periodo"
              className="rounded-xl border border-border bg-surface p-6"
            >
              <h2 id="titulo-periodo" className="text-lg font-semibold">
                Regla y periodo
              </h2>
              <p className="mt-1 text-xs text-secondary">
                {regla
                  ? `${folioRegla(regla.id)} · ${describirAlcance(regla)} · ${plural(regla.unidadesAplicables, "unidad", "unidades")} en el alcance hoy · Vence el día ${regla.diaVencimiento}`
                  : "Elige la regla que quieres generar."}
              </p>
              <div className="mt-5 grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <SelectorUrl
                  parametro="regla"
                  etiqueta="Regla a generar"
                  valor={regla ? String(regla.id) : ""}
                  opciones={[
                    ...(regla ? [] : [{ valor: "", texto: "Elige una regla" }]),
                    ...reglas.map((r) => ({
                      valor: String(r.id),
                      texto: `${r.concepto} · ${folioRegla(r.id)}${
                        r.estado === "ACTIVA" ? "" : ` (${ESTADO_REGLA[r.estado].label.toLowerCase()})`
                      }`,
                    })),
                  ]}
                  reiniciar={["pagina"]}
                />
                <SelectorUrl
                  parametro="periodo"
                  etiqueta="Periodo a generar"
                  valor={periodoFuturo ? "" : periodo}
                  opciones={[
                    ...(periodoFuturo ? [{ valor: "", texto: "Elige un periodo" }] : []),
                    ...periodos.map((p) => ({
                      valor: p,
                      texto: `${nombrePeriodo(p)}${p === actual ? " (actual)" : ""}`,
                    })),
                  ]}
                />
                <RecalcularVista />
              </div>
              <p className="mt-3 text-[11px] text-muted">
                Solo el periodo en curso y los anteriores: un periodo futuro se genera solo en su día.
              </p>
            </section>

            {reglaPerdida && <Aviso>La regla que intentaste abrir ya no existe. Elige otra.</Aviso>}
            {(periodoFuturo || periodoInvalido) && (
              <Aviso>
                {periodoFuturo
                  ? `No se puede generar ${periodoEnTexto(periodo)}: es un periodo futuro. Elige el periodo actual o uno anterior.`
                  : "El periodo de la dirección no es válido. Se muestra el periodo actual."}
              </Aviso>
            )}

            {regla && regla.estado !== "ACTIVA" && (
              <div className="flex items-start gap-4 rounded-xl bg-sand/30 px-6 py-5">
                <InfoIcon className="size-5 shrink-0 text-foreground" />
                <div className="text-sm">
                  <p className="font-semibold">
                    La regla está {ESTADO_REGLA[regla.estado].label.toLowerCase()}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-secondary">
                    Solo se generan cuotas de reglas activas, igual que en la generación automática.
                    Puedes revisar su historial abajo.
                  </p>
                  <Link
                    href={configurarHref}
                    className="mt-2 inline-block text-xs font-semibold underline underline-offset-4"
                  >
                    Configurar la regla
                  </Link>
                </div>
              </div>
            )}

            {errorVista && (
              <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/5 px-6 py-5 text-sm">
                <AlertIcon className="size-5 shrink-0 text-danger" />
                <div>
                  <p className="font-semibold text-danger">{errorVista.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-secondary">{errorVista.mensaje}</p>
                </div>
              </div>
            )}

            {regla && vista && d && (
              <>
                <EstadoPeriodo vista={vista} d={d} />

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
                  <div className="flex min-w-0 flex-col gap-6">
                    <VistaPreviaCard regla={regla} vista={vista} d={d} />
                    <Excepciones vista={vista} />
                  </div>

                  <div className="flex flex-col gap-6">
                    <section
                      aria-labelledby="titulo-por-generar"
                      className="rounded-xl bg-forest p-6 text-cream"
                    >
                      <h2 id="titulo-por-generar" className="text-lg font-semibold">
                        Resumen por generar
                      </h2>
                      <p className="mt-4 text-[11px] tracking-wide text-sand uppercase">
                        {nombrePeriodo(vista.periodo)} · {MONEDA}
                      </p>
                      <p className="mt-1 font-serif text-4xl break-words">{formatMonto(vista.montoTotal)}</p>
                      <p className="mt-4 text-sm">
                        {regla.concepto} · {plural(d.porCrear, "cuota", "cuotas")}
                      </p>
                      <p className="mt-1 text-xs text-sand">Vencen el {fechaCorta(vista.fechaVencimiento)}</p>
                    </section>

                    <ConfirmarGeneracion
                      key={`${regla.id}-${vista.periodo}`}
                      reglaId={regla.id}
                      vista={vista}
                      configurarHref={configurarHref}
                    />
                  </div>
                </div>
              </>
            )}

            {regla && (
              <Historial
                regla={regla}
                periodo={periodo}
                historial={historial}
                error={errorHistorial}
                hrefPagina={(n) => `${href({ regla: regla.id, periodo, pagina: n })}#historial`}
              />
            )}
          </>
        )}

        <p className="text-[11px] text-muted">
          Información al {marcaHoraCondominio()} · Hora local de {CONDOMINIO.nombre} · Importes en {MONEDA}.
        </p>
      </div>
    </>
  );
}

function EstadoPeriodo({ vista, d }: { vista: VistaPrevia; d: DesgloseVista }) {
  const texto = periodoEnTexto(vista.periodo);
  const [titulo, detalle] =
    d.porCrear > 0 && d.yaGeneradas === 0
      ? [`Todavía no se han generado cuotas de ${texto}`, `Se crearán ${plural(d.porCrear, "cuota", "cuotas")}.`]
      : d.porCrear > 0
        ? [
            `${texto[0].toUpperCase()}${texto.slice(1)} está generado a medias`,
            `${plural(d.yaGeneradas, "unidad ya tiene", "unidades ya tienen")} su cuota; solo se crearán las ${d.porCrear} que faltan.`,
          ]
        : d.yaGeneradas > 0
          ? [`${texto[0].toUpperCase()}${texto.slice(1)} ya está generado`, "Todas las unidades que reciben la cuota ya la tienen."]
          : ["No hay cuotas que generar", "Ninguna unidad del alcance recibe cuota en este periodo."];

  return (
    <div className="flex items-start gap-4 rounded-xl bg-sage/20 px-6 py-5">
      <FilePlusIcon className="size-5 shrink-0 text-foreground" />
      <div>
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          {detalle} Vista previa: {plural(d.enAlcance, "unidad", "unidades")} en el alcance,{" "}
          {d.yaGeneradas} ya generadas y {plural(vista.excepciones.length, "excepción", "excepciones")}. El
          estado de cuenta de los residentes no ha cambiado.
        </p>
      </div>
    </div>
  );
}

function VistaPreviaCard({ regla, vista, d }: { regla: ReglaCuota; vista: VistaPrevia; d: DesgloseVista }) {
  const vencida = vista.fechaVencimiento < hoyEnCondominio();
  const filas: { etiqueta: string; valor: number; nota?: string }[] = [
    { etiqueta: "Unidades en el alcance", valor: d.enAlcance },
    { etiqueta: "Ya tienen la cuota del periodo", valor: d.yaGeneradas, nota: "Se omiten" },
    { etiqueta: "Se omitirán por la política de la regla", valor: d.omitidas },
    { etiqueta: "Quedarán con error", valor: d.conError },
  ];

  return (
    <section aria-labelledby="titulo-vista" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="px-6 pt-6 pb-4">
        <h2 id="titulo-vista" className="text-lg font-semibold">
          Vista previa de la generación
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Periodo: {periodoEnTexto(vista.periodo)} · Alcance: {describirAlcance(regla)} · Moneda: {MONEDA}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand/30 text-[11px] font-semibold tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-6 py-4">Concepto / vencimiento</th>
              <th scope="col" className="px-4 py-4 text-right">Cuotas por crear</th>
              <th scope="col" className="px-6 py-4 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-6 py-4">
                <p className="font-semibold">{regla.concepto}</p>
                <p className="mt-1 text-xs text-muted">
                  {folioRegla(regla.id)} · Vence {fechaCorta(vista.fechaVencimiento)}
                </p>
              </td>
              <td className="px-4 py-4 text-right text-secondary">{d.porCrear}</td>
              <td className="px-6 py-4 text-right font-semibold">{formatMonto(vista.montoTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl className="grid gap-x-6 gap-y-2 px-6 py-5 text-sm sm:grid-cols-2">
        {filas.map((f) => (
          <div key={f.etiqueta} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
            <dt className="text-secondary">
              {f.etiqueta}
              {f.nota && <span className="ml-1 text-[11px] text-muted">({f.nota.toLowerCase()})</span>}
            </dt>
            <dd className="font-semibold">{f.valor}</dd>
          </div>
        ))}
      </dl>

      {vencida && d.porCrear > 0 && (
        <p className="mx-6 mb-6 flex items-start gap-3 rounded-lg bg-sand/40 px-4 py-3 text-xs leading-relaxed">
          <AlertIcon className="size-4 shrink-0 text-danger" />
          <span>
            <span className="font-semibold">El vencimiento ({fechaCorta(vista.fechaVencimiento)}) ya pasó.</span>{" "}
            Las cuotas aparecerán como vencidas en el estado de cuenta de los residentes en cuanto se generen.
          </span>
        </p>
      )}
    </section>
  );
}

function Excepciones({ vista }: { vista: VistaPrevia }) {
  return (
    <section
      aria-labelledby="titulo-excepciones"
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="px-6 pt-6 pb-4">
        <h2 id="titulo-excepciones" className="text-lg font-semibold">
          Excepciones
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Unidades del alcance que no recibirán cuota en este periodo, y cómo quedarán al ejecutar.
        </p>
      </div>
      {vista.excepciones.length === 0 ? (
        <p className="border-t border-border px-6 py-8 text-center text-sm text-secondary">
          Sin excepciones: todas las unidades pendientes recibirán su cuota.
        </p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-sand/30 text-[11px] font-semibold tracking-wide uppercase backdrop-blur">
              <tr>
                <th scope="col" className="px-6 py-3">Unidad</th>
                <th scope="col" className="px-4 py-3">Motivo</th>
                <th scope="col" className="px-6 py-3">Al ejecutar</th>
              </tr>
            </thead>
            <tbody>
              {vista.excepciones.map((e) => (
                <tr key={e.unidadId} className="border-b border-border last:border-0">
                  <td className="px-6 py-3 font-semibold">{e.codigoUnidad}</td>
                  <td className="px-4 py-3 text-secondary">{MOTIVO_EXCEPCION[e.motivo] ?? e.motivo}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${RESULTADO_EXCEPCION[e.resultado].className}`}
                    >
                      {RESULTADO_EXCEPCION[e.resultado].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Historial({
  regla,
  periodo,
  historial,
  error,
  hrefPagina,
}: {
  regla: ReglaCuota;
  periodo: string;
  historial: PaginaEjecuciones | null;
  error: boolean;
  hrefPagina: (n: number) => string;
}) {
  const totalPaginas = historial ? Math.max(1, Math.ceil(historial.total / historial.tamano)) : 1;

  return (
    <section
      id="historial"
      aria-labelledby="titulo-historial"
      className="scroll-mt-6 overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="px-6 pt-6 pb-4">
        <h2 id="titulo-historial" className="text-lg font-semibold">
          Historial de ejecuciones
        </h2>
        <p className="mt-1 text-xs text-secondary">
          {regla.concepto} · {folioRegla(regla.id)} · Automáticas y manuales, de la más reciente a la más antigua
        </p>
      </div>

      {error || !historial ? (
        <p className="flex items-center gap-3 border-t border-border px-6 py-8 text-sm text-danger">
          <AlertIcon />
          No se pudo cargar el historial. Intenta recargar la página.
        </p>
      ) : historial.total === 0 ? (
        <p className="border-t border-border px-6 py-8 text-center text-sm text-secondary">
          Esta regla todavía no tiene ejecuciones.
        </p>
      ) : historial.items.length === 0 ? (
        <p className="border-t border-border px-6 py-8 text-center text-sm text-secondary">
          No hay ejecuciones en esta página.{" "}
          <Link href={hrefPagina(1)} className="font-semibold text-foreground underline underline-offset-4">
            Ir a la primera
          </Link>
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-sand/30 text-[11px] font-semibold tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-6 py-4">Fecha</th>
                  <th scope="col" className="px-4 py-4">Periodo</th>
                  <th scope="col" className="px-4 py-4">Origen</th>
                  <th scope="col" className="px-4 py-4">Usuario</th>
                  <th scope="col" className="px-4 py-4">Estado</th>
                  <th scope="col" className="px-4 py-4 text-right">Creadas</th>
                  <th scope="col" className="px-4 py-4 text-right">Omitidas</th>
                  <th scope="col" className="px-6 py-4 text-right">Con error</th>
                </tr>
              </thead>
              <tbody>
                {historial.items.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b border-border last:border-0 ${e.periodo === periodo ? "bg-sage/10" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fechaHoraEjecucion(e.fecha)}
                      <span className="block text-xs text-muted">Ejecución #{e.id}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{nombrePeriodo(e.periodo)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${ORIGEN_EJECUCION[e.origen].className}`}
                      >
                        {ORIGEN_EJECUCION[e.origen].label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-secondary">{e.usuario ?? "Sistema"}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${ESTADO_EJECUCION[e.estado].className}`}
                      >
                        {ESTADO_EJECUCION[e.estado].label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">{e.creadas}</td>
                    <td className="px-4 py-4 text-right">{e.omitidas}</td>
                    <td className={`px-6 py-4 text-right ${e.conError > 0 ? "font-semibold text-danger" : ""}`}>
                      {e.conError}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion
            pagina={historial.pagina}
            totalPaginas={totalPaginas}
            total={historial.total}
            tamano={historial.tamano}
            unidad="ejecuciones"
            href={hrefPagina}
          />
        </>
      )}
    </section>
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
