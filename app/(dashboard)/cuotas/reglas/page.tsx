import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import {
  AlertIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  InfoIcon,
  PlusIcon,
  SlidersIcon,
} from "@/components/icons";
import { ApiError } from "@/lib/api";
import { CONDOMINIO, marcaHoraCondominio } from "@/lib/condominio";
import { getCurrentUser } from "@/lib/current-user";
import {
  ESTADO_REGLA,
  MONEDA,
  RUTA_REGLAS,
  describirAlcance,
  describirImporte,
  folioRegla,
  type EstadoRegla,
  type ReglaCuota,
  type UnidadCondominio,
} from "@/lib/reglas-cuota";
import { listReglasCuota, listUnidades } from "@/lib/reglas-cuota-api";
import { RUTA_GENERACION } from "@/lib/generacion-cuotas";
import { EstadoReglaPanel } from "./estado-regla";
import { ReglaForm } from "./regla-form";

export const metadata: Metadata = {
  title: "Reglas de cuotas",
};

const PAGE_SIZE = 10;

const MENSAJES_OK: Record<string, string> = {
  creada: "Regla creada. Se aplicará en su próximo día de generación si está activa.",
  actualizada: "Cambios guardados. Solo afectan los cargos que se generen de ahora en adelante.",
  activa: "Regla activada.",
  pausada: "Regla pausada. No generará cargos hasta que la reanudes.",
  inactiva: "Regla desactivada. Sus cargos ya emitidos se conservan.",
};

const FILTROS: { valor: EstadoRegla | "todas"; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "ACTIVA", label: "Activas" },
  { valor: "PAUSADA", label: "Pausadas" },
  { valor: "INACTIVA", label: "Inactivas" },
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function href(params: { regla?: string | number; estado?: string; pagina?: number }) {
  const sp = new URLSearchParams();
  if (params.regla !== undefined) sp.set("regla", String(params.regla));
  if (params.estado && params.estado !== "todas") sp.set("estado", params.estado);
  if (params.pagina && params.pagina > 1) sp.set("pagina", String(params.pagina));
  const qs = sp.toString();
  return `${RUTA_REGLAS}${qs ? `?${qs}` : ""}`;
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

export default async function ReglasCuotaPage(props: PageProps<"/cuotas/reglas">) {
  const searchParams = await props.searchParams;
  const reglaParam = first(searchParams.regla);
  const ok = MENSAJES_OK[first(searchParams.ok) ?? ""];
  const estadoParam = first(searchParams.estado);
  const filtro = FILTROS.find((f) => f.valor === estadoParam)?.valor ?? "todas";

  // Solo el administrador configura reglas (el backend también lo exige con 403).
  const usuario = await getCurrentUser();
  let acceso: "ok" | "denegado" | "sesion" = usuario?.role && usuario.role !== "ADMINISTRADOR" ? "denegado" : "ok";

  let reglas: ReglaCuota[] = [];
  let errorCarga = false;
  if (acceso === "ok") {
    try {
      reglas = (await listReglasCuota()) ?? [];
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) acceso = "sesion";
      else if (error instanceof ApiError && error.status === 403) acceso = "denegado";
      else {
        errorCarga = true;
        console.error("Error al listar reglas de cuota:", error);
      }
    }
  }
  reglas.sort((a, b) => a.id - b.id);

  const creando = reglaParam === "nueva";
  const seleccionada = reglas.find((r) => String(r.id) === reglaParam);
  // Una sola cosa a la vez: la lista o el formulario.
  const editando = acceso === "ok" && (creando || Boolean(seleccionada));

  let unidades: UnidadCondominio[] = [];
  let errorUnidades = false;
  if (editando) {
    try {
      unidades = (await listUnidades()) ?? [];
    } catch (error) {
      errorUnidades = true;
      console.error("Error al listar unidades:", error);
    }
  }

  const filtradas = filtro === "todas" ? reglas : reglas.filter((r) => r.estado === filtro);
  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pagina = Math.min(Math.max(1, Number(first(searchParams.pagina)) || 1), totalPages);
  const visibles = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
  const volverHref = href({ estado: filtro, pagina });

  const conteo = (estado: EstadoRegla) => reglas.filter((r) => r.estado === estado).length;
  const resumenEstados = [
    plural(conteo("ACTIVA"), "activa", "activas"),
    conteo("PAUSADA") > 0 && plural(conteo("PAUSADA"), "pausada", "pausadas"),
    plural(conteo("INACTIVA"), "inactiva", "inactivas"),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            {editando ? (
              <Link
                href={volverHref}
                className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-secondary uppercase hover:text-foreground"
              >
                <ChevronLeftIcon className="size-4" />
                Volver a las reglas
              </Link>
            ) : (
              <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
                Configuración financiera
              </p>
            )}
            <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-[40px]">
              {seleccionada ? seleccionada.concepto : creando && editando ? "Nueva regla" : "Reglas de cuotas"}
            </h1>
            <p className="mt-2 text-sm text-secondary">
              {seleccionada
                ? "Los cambios solo afectan los cargos que se generen a partir de ahora."
                : editando
                ? "Las cuotas se generarán solas cada mes según esta regla."
                : "Define conceptos, importes y a qué unidades aplican. Las cuotas se generan solas cada mes."}
            </p>
          </div>
          {!editando && acceso === "ok" && (
            <Link
              href={href({ regla: "nueva", estado: filtro })}
              className="inline-flex items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss"
            >
              <PlusIcon />
              Nueva regla
            </Link>
          )}
        </div>

        {acceso === "denegado" ? (
          <Aviso>
            <p className="font-semibold">Acceso restringido</p>
            <p className="text-secondary">
              Solo la administración del condominio puede configurar las reglas de cuotas.
            </p>
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
        ) : (
          <>
            {!editando && (
              <div className="flex items-start gap-4 rounded-xl bg-sage/20 px-6 py-5">
                <SlidersIcon className="size-5 shrink-0 text-foreground" />
                <div>
                  <p className="text-sm font-semibold">Configurar no es emitir</p>
                  <p className="mt-1 text-xs leading-relaxed text-secondary">
                    Guardar una regla no genera cargos. Cada regla activa genera las cuotas del mes
                    en su día de generación, una sola vez por unidad y periodo.
                  </p>
                </div>
              </div>
            )}

            {ok && !editando && (
              <p
                role="status"
                className="flex items-center gap-3 rounded-lg bg-sage/25 px-5 py-3 text-sm text-foreground"
              >
                <CheckCircleIcon className="size-5 text-secondary" />
                {ok}
              </p>
            )}

            {reglaParam && !editando && !errorCarga && (
              <Aviso>La regla que intentaste abrir ya no existe.</Aviso>
            )}

            {!editando && (
              <section className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Reglas del condominio</h2>
                    <p className="mt-1 text-xs text-secondary">
                      Estado: {FILTROS.find((f) => f.valor === filtro)?.label.toLowerCase()} · Moneda:{" "}
                      {MONEDA}
                      {reglas.length > 0 && ` · ${resumenEstados}`} · Orden: número de regla
                    </p>
                  </div>
                  <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
                    {FILTROS.map((f) => (
                      <Link
                        key={f.valor}
                        href={href({ estado: f.valor })}
                        aria-current={f.valor === filtro ? "page" : undefined}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          f.valor === filtro
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-secondary hover:bg-sand/20"
                        }`}
                      >
                        {f.label}
                      </Link>
                    ))}
                  </nav>
                </div>

                {errorCarga ? (
                  <p className="flex items-center gap-3 border-t border-border px-6 py-8 text-sm text-danger">
                    <AlertIcon />
                    No se pudieron cargar las reglas. Intenta recargar la página.
                  </p>
                ) : filtradas.length === 0 ? (
                  <div className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
                    {reglas.length === 0 ? (
                      <>
                        <p>Aún no hay reglas de cuota.</p>
                        <Link
                          href={href({ regla: "nueva" })}
                          className="mt-2 inline-block font-semibold text-foreground underline underline-offset-4"
                        >
                          Crear la primera regla
                        </Link>
                      </>
                    ) : (
                      <p>No hay reglas con ese estado.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="relative overflow-x-auto">
                      <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="bg-sand/30 text-[11px] font-semibold tracking-wide text-foreground uppercase">
                          <tr>
                            <th scope="col" className="px-6 py-4">
                              Concepto / regla <span aria-hidden="true">↑</span>
                            </th>
                            <th scope="col" className="px-4 py-4">Importe ({MONEDA})</th>
                            <th scope="col" className="px-4 py-4">Generación</th>
                            <th scope="col" className="px-4 py-4">Vencimiento</th>
                            <th scope="col" className="px-4 py-4">Estado</th>
                            <th scope="col" className="px-6 py-4">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibles.map((regla) => (
                            <tr key={regla.id} className="border-b border-border">
                              <td className="px-6 py-4">
                                <p className="font-semibold">{regla.concepto}</p>
                                <p className="mt-1 text-xs text-muted">
                                  {folioRegla(regla.id)} · {describirAlcance(regla)} ·{" "}
                                  {plural(regla.unidadesAplicables, "unidad", "unidades")}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-secondary">
                                {describirImporte(regla)}
                                {regla.tipoMonto === "POR_TIPO_UNIDAD" && (
                                  <p className="mt-1 text-xs text-muted">Según tipo de unidad</p>
                                )}
                              </td>
                              <td className="px-4 py-4 text-secondary">
                                Día {regla.diaGeneracion}
                                <p className="mt-1 text-xs text-muted">Mensual</p>
                              </td>
                              <td className="px-4 py-4 text-secondary">
                                Día {regla.diaVencimiento}
                                <p className="mt-1 text-xs text-muted">Del mismo mes</p>
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_REGLA[regla.estado].className}`}
                                >
                                  {ESTADO_REGLA[regla.estado].label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-start gap-1">
                                  <Link
                                    href={href({ regla: regla.id, estado: filtro, pagina })}
                                    className="font-semibold text-secondary underline underline-offset-4 hover:text-foreground"
                                  >
                                    Configurar
                                    <span className="sr-only"> {regla.concepto}</span>
                                  </Link>
                                  <Link
                                    href={`${RUTA_GENERACION}?regla=${regla.id}`}
                                    className="text-xs text-secondary underline underline-offset-4 hover:text-foreground"
                                  >
                                    {regla.estado === "ACTIVA" ? "Generar periodo" : "Ver ejecuciones"}
                                    <span className="sr-only"> de {regla.concepto}</span>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 text-xs text-secondary">
                      <span>
                        {(pagina - 1) * PAGE_SIZE + 1}–{(pagina - 1) * PAGE_SIZE + visibles.length} de{" "}
                        {plural(filtradas.length, "regla", "reglas")}
                      </span>
                      <nav aria-label="Paginación" className="flex items-center gap-3">
                        <PageLink href={href({ estado: filtro, pagina: pagina - 1 })} disabled={pagina === 1}>
                          Anterior
                        </PageLink>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                          <Link
                            key={n}
                            href={href({ estado: filtro, pagina: n })}
                            aria-current={n === pagina ? "page" : undefined}
                            className={`grid size-6 place-items-center rounded ${
                              n === pagina ? "bg-sage/30 text-foreground" : "hover:bg-sage/20"
                            }`}
                          >
                            {n}
                          </Link>
                        ))}
                        <PageLink
                          href={href({ estado: filtro, pagina: pagina + 1 })}
                          disabled={pagina === totalPages}
                        >
                          Siguiente
                        </PageLink>
                      </nav>
                    </div>
                  </>
                )}
              </section>
            )}

            {editando && (
              <ReglaForm
                key={seleccionada?.id ?? "nueva"}
                regla={seleccionada}
                unidades={unidades}
                errorUnidades={errorUnidades}
                volverHref={volverHref}
              >
                {seleccionada && (
                  <EstadoReglaPanel
                    key={`${seleccionada.id}-${seleccionada.estado}`}
                    id={seleccionada.id}
                    estado={seleccionada.estado}
                  />
                )}
                <aside className="flex gap-4 rounded-xl bg-sand/30 p-6 text-xs leading-relaxed text-secondary">
                  <InfoIcon className="size-5 shrink-0 text-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Los cargos existentes no cambian</p>
                    <p className="mt-2">
                      Una modificación de regla solo afecta las generaciones futuras. Una regla con
                      cargos generados no se elimina: se desactiva.
                    </p>
                  </div>
                </aside>
              </ReglaForm>
            )}
          </>
        )}

        <p className="text-[11px] text-muted">
          Información al {marcaHoraCondominio()} · Hora local de {CONDOMINIO.nombre} · Importes en{" "}
          {MONEDA}.
        </p>
      </div>
    </>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg bg-sand/30 px-5 py-3 text-sm text-foreground"
    >
      <AlertIcon className="size-5 shrink-0 text-danger" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function PageLink({
  href: destino,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) return <span className="text-muted/60">{children}</span>;
  return (
    <Link href={destino} className="hover:text-foreground">
      {children}
    </Link>
  );
}
