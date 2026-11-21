import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { AlertIcon, CheckCircleIcon, ChevronLeftIcon, InfoIcon, PlusIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { listAreas, listBloqueos } from "@/lib/areas-api";
import { ESTADO_AREA, formatHoras, resumirHorarios, type Area } from "@/lib/areas";
import { bloqueosVigentes, type BloqueoVista } from "@/lib/bloqueos";
import { CONDOMINIO, hoyEnCondominio } from "@/lib/condominio";
import { AreaForm } from "./area-form";
import { Bloqueos } from "./bloqueos";
import { DeleteArea } from "./delete-area";

export const metadata: Metadata = {
  title: "Áreas comunes",
};

const PAGE_SIZE = 10;

const MENSAJES_OK: Record<string, string> = {
  creada: "Área creada correctamente.",
  actualizada: "Cambios guardados.",
  eliminada: "Área eliminada. Sus reservas históricas se conservan.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function href(params: { area?: string | number; pagina?: number }) {
  const sp = new URLSearchParams();
  if (params.area !== undefined) sp.set("area", String(params.area));
  if (params.pagina && params.pagina > 1) sp.set("pagina", String(params.pagina));
  const qs = sp.toString();
  return `/areas${qs ? `?${qs}` : ""}`;
}

export default async function AreasPage(props: PageProps<"/areas">) {
  const searchParams = await props.searchParams;
  const areaParam = first(searchParams.area);
  const ok = MENSAJES_OK[first(searchParams.ok) ?? ""];

  let areas: Area[] = [];
  let loadError: "sesion" | "general" | null = null;
  try {
    areas = (await listAreas()) ?? [];
  } catch (error) {
    loadError = error instanceof ApiError && error.status === 401 ? "sesion" : "general";
    if (loadError === "general") console.error("Error al listar áreas:", error);
  }

  areas = areas
    .filter((a) => a.estado !== "ELIMINADA")
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const totalPages = Math.max(1, Math.ceil(areas.length / PAGE_SIZE));
  const pagina = Math.min(Math.max(1, Number(first(searchParams.pagina)) || 1), totalPages);
  const visibles = areas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const creando = areaParam === "nueva";
  const seleccionada = areas.find((a) => String(a.id) === areaParam);
  // La página muestra una sola cosa a la vez: la lista o el formulario.
  const editando = creando || Boolean(seleccionada);
  const volverHref = href({ pagina });

  // Bloqueos vigentes (los que aún no terminan) del área seleccionada.
  let bloqueos: BloqueoVista[] = [];
  let errorBloqueos = false;
  if (seleccionada) {
    try {
      bloqueos = bloqueosVigentes((await listBloqueos(seleccionada.id)) ?? []);
    } catch (error) {
      errorBloqueos = true;
      console.error("Error al listar bloqueos:", error);
    }
  }

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
                Volver a la lista
              </Link>
            ) : (
              <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
                Espacios de la comunidad
              </p>
            )}
            <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-[40px]">
              {seleccionada ? seleccionada.nombre : creando ? "Nueva área común" : "Administrar áreas comunes"}
            </h1>
            <p className="mt-2 text-sm text-secondary">
              {editando
                ? "Define la capacidad, los horarios y las condiciones de uso del área."
                : "Configura las áreas, sus horarios y sus condiciones de uso."}
            </p>
          </div>
          {!editando && (
            <Link
              href={href({ area: "nueva", pagina })}
              className="inline-flex items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss"
            >
              <PlusIcon />
              Agregar área
            </Link>
          )}
        </div>

        {ok && !editando && (
          <p
            role="status"
            className="flex items-center gap-3 rounded-lg bg-sage/25 px-5 py-3 text-sm text-foreground"
          >
            <CheckCircleIcon className="size-5 text-secondary" />
            {ok}
          </p>
        )}

        {areaParam && !editando && !loadError && (
          <p
            role="status"
            className="flex items-center gap-3 rounded-lg bg-sand/30 px-5 py-3 text-sm text-foreground"
          >
            <AlertIcon className="size-5 text-danger" />
            El área que intentaste abrir ya no existe.
          </p>
        )}

        {!editando && (
          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold">Áreas de {CONDOMINIO.nombre}</h2>
              <p className="mt-1 text-xs text-secondary">
                Orden: nombre A–Z · {areas.length}{" "}
                {areas.length === 1 ? "área habilitada" : "áreas habilitadas"}
              </p>
            </div>

            {loadError === "sesion" ? (
              <div className="flex flex-col items-start gap-3 border-t border-border px-6 py-8 text-sm">
                <p>Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
                <form action={logout}>
                  <button type="submit" className="font-semibold text-secondary underline underline-offset-4">
                    Ir a iniciar sesión
                  </button>
                </form>
              </div>
            ) : loadError ? (
              <p className="flex items-center gap-3 border-t border-border px-6 py-8 text-sm text-danger">
                <AlertIcon />
                No se pudieron cargar las áreas. Intenta recargar la página.
              </p>
            ) : areas.length === 0 ? (
              <div className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
                <p>Aún no hay áreas comunes registradas.</p>
                <Link
                  href={href({ area: "nueva" })}
                  className="mt-2 inline-block font-semibold text-foreground underline underline-offset-4"
                >
                  Agregar la primera área
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-sand/30 text-[11px] font-semibold tracking-wide text-foreground uppercase">
                      <tr>
                        <th scope="col" className="px-6 py-4">
                          Área común A–Z <span aria-hidden="true">↑</span>
                        </th>
                        <th scope="col" className="px-4 py-4">Aforo</th>
                        <th scope="col" className="px-4 py-4">Horario</th>
                        <th scope="col" className="px-4 py-4">Bloque</th>
                        <th scope="col" className="px-4 py-4">Estado</th>
                        <th scope="col" className="px-6 py-4">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((area) => (
                          <tr key={area.id} className="border-b border-border">
                            <td className="px-6 py-4">
                              <p className="font-semibold">{area.nombre}</p>
                              {area.ubicacion && (
                                <p className="mt-1 text-xs text-muted">{area.ubicacion}</p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-secondary">{area.capacidad} personas</td>
                            <td className="px-4 py-4 text-secondary">
                              {resumirHorarios(area.horarios).map(({ franja, dias }) => (
                                <p key={franja} className="whitespace-nowrap">
                                  {franja} <span className="text-xs text-muted">· {dias}</span>
                                </p>
                              ))}
                            </td>
                            <td className="px-4 py-4 text-secondary">
                              {area.duracionBloque ? formatHoras(area.duracionBloque) : "—"}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-block rounded-full bg-sage/30 px-3 py-1 text-xs font-semibold">
                                {ESTADO_AREA[area.estado] ?? area.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={href({ area: area.id, pagina })}
                                className="font-semibold text-secondary underline underline-offset-4 hover:text-foreground"
                              >
                                Administrar
                                <span className="sr-only"> {area.nombre}</span>
                              </Link>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-6 py-4 text-xs text-secondary">
                  <span>
                    {(pagina - 1) * PAGE_SIZE + 1}–{(pagina - 1) * PAGE_SIZE + visibles.length} de{" "}
                    {areas.length} áreas
                  </span>
                  <nav aria-label="Paginación" className="flex items-center gap-3">
                    <PageLink pagina={pagina - 1} disabled={pagina === 1}>
                      Anterior
                    </PageLink>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <Link
                        key={n}
                        href={href({ pagina: n })}
                        aria-current={n === pagina ? "page" : undefined}
                        className={`grid size-6 place-items-center rounded ${
                          n === pagina ? "bg-sage/30 text-foreground" : "hover:bg-sage/20"
                        }`}
                      >
                        {n}
                      </Link>
                    ))}
                    <PageLink pagina={pagina + 1} disabled={pagina === totalPages}>
                      Siguiente
                    </PageLink>
                  </nav>
                </div>
              </>
            )}
          </section>
        )}

        {editando && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
            <AreaForm key={seleccionada?.id ?? "nueva"} area={seleccionada} volverHref={volverHref} />

            <div className="flex flex-col gap-6">
              {seleccionada && (
                <>
                  <Bloqueos
                    key={seleccionada.id}
                    areaId={seleccionada.id}
                    nombre={seleccionada.nombre}
                    horarios={seleccionada.horarios ?? []}
                    duracionBloque={seleccionada.duracionBloque || 1}
                    hoy={hoyEnCondominio()}
                    bloqueos={bloqueos}
                    errorCarga={errorBloqueos}
                  />
                  <DeleteArea key={`eliminar-${seleccionada.id}`} id={seleccionada.id} nombre={seleccionada.nombre} />
                </>
              )}
              <aside className="flex gap-4 rounded-xl bg-sage/20 p-6 text-xs leading-relaxed text-secondary">
                <InfoIcon className="size-5 shrink-0 text-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Gestión, no reserva</p>
                  <p className="mt-2">
                    Los cambios de capacidad u horario no cancelan reservas confirmadas
                    automáticamente y quedan registrados en el historial. Revisa las afectaciones
                    antes de aplicarlos.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PageLink({
  pagina,
  disabled,
  children,
}: {
  pagina: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted/60">{children}</span>;
  }
  return (
    <Link href={href({ pagina })} className="hover:text-foreground">
      {children}
    </Link>
  );
}
