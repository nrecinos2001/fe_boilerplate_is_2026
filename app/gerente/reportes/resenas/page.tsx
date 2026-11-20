"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import {
  BranchReviewsApiError,
  obtenerResenasSucursal,
  type ResumenResenasSucursal,
} from "@/lib/services/branch-reviews";
import {
  BranchesApiError,
  obtenerSucursalesAsignadas,
  type SucursalAsignada,
} from "@/lib/services/branches";
import { useSesion } from "@/lib/stores/sesion";

function fecha(valor: string) {
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ResenasSucursalPage() {
  const router = useRouter();
  const cargarUsuario = useSesion((estado) => estado.cargarUsuario);
  const [sucursales, setSucursales] = useState<SucursalAsignada[]>([]);
  const [sucursalId, setSucursalId] = useState("");
  const [cargandoSucursales, setCargandoSucursales] = useState(true);
  const [errorSucursales, setErrorSucursales] = useState("");
  const [sinPermiso, setSinPermiso] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [reintento, setReintento] = useState(0);
  const [reintentoSucursales, setReintentoSucursales] = useState(0);
  const [resumen, setResumen] = useState<ResumenResenasSucursal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activa = true;

    async function cargarSucursalesAutorizadas() {
      setCargandoSucursales(true);
      setErrorSucursales("");
      try {
        const usuario = await cargarUsuario();
        if (!activa) return;
        if (!usuario) {
          router.push("/login");
          return;
        }
        if (usuario.role !== "GERENTE") {
          setSinPermiso(true);
          return;
        }

        const asignadas = await obtenerSucursalesAsignadas();
        if (!activa) return;
        setSucursales(asignadas);
        setResumen(null);
        setPagina(1);
        setSucursalId(asignadas.length === 1 ? asignadas[0].id : "");
      } catch (err) {
        if (activa) {
          if (err instanceof BranchesApiError && err.status === 401) {
            router.push("/login");
          } else if (err instanceof BranchesApiError && err.status === 403) {
            setSinPermiso(true);
          } else {
            setErrorSucursales(
              err instanceof Error
                ? err.message
                : "No se pudieron cargar las sucursales asignadas.",
            );
          }
        }
      } finally {
        if (activa) setCargandoSucursales(false);
      }
    }

    queueMicrotask(() => void cargarSucursalesAutorizadas());
    return () => {
      activa = false;
    };
  }, [cargarUsuario, reintentoSucursales, router]);

  useEffect(() => {
    if (!sucursalId || sinPermiso) return;
    let activa = true;
    const controller = new AbortController();

    async function cargarResenas() {
      setCargando(true);
      setError("");
      try {
        const data = await obtenerResenasSucursal(sucursalId, pagina, controller.signal);
        if (!activa) return;
        if (data.branchId !== sucursalId || data.page !== pagina) {
          throw new Error("El servidor devolvió resultados para una sucursal o página distinta.");
        }
        setResumen(data);
      } catch (err) {
        if (!activa || (err instanceof DOMException && err.name === "AbortError")) return;
        if (err instanceof BranchReviewsApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        if (err instanceof BranchReviewsApiError && err.status === 403) {
          setSinPermiso(true);
          setResumen(null);
          return;
        }
        setResumen(null);
        setError(
          err instanceof BranchReviewsApiError && err.status === 404
            ? "No se encontró la sucursal seleccionada."
            : err instanceof Error && err.message
              ? err.message
              : "No se pudieron consultar las reseñas.",
        );
      } finally {
        if (activa) setCargando(false);
      }
    }

    queueMicrotask(() => void cargarResenas());
    return () => {
      activa = false;
      controller.abort();
    };
  }, [pagina, reintento, router, sinPermiso, sucursalId]);

  // Oculta resultados de una consulta previa en el mismo render donde cambia
  // la selección o la página, antes de que se ejecute el siguiente efecto.
  const resumenVisible =
    resumen?.branchId === sucursalId && resumen.page === pagina ? resumen : null;
  const totalPaginas = resumenVisible?.totalPages ?? 0;

  function reintentarResenas() {
    setResumen(null);
    setError("");
    setReintento((actual) => actual + 1);
  }

  function reintentarSucursales() {
    setSucursales([]);
    setSucursalId("");
    setResumen(null);
    setErrorSucursales("");
    setReintentoSucursales((actual) => actual + 1);
  }

  function cambiarSucursal(id: string) {
    setResumen(null);
    setError("");
    setSucursalId(id);
    setPagina(1);
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Reportes / Calificaciones y reseñas</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Calificaciones y reseñas</h1>
              <p className="mt-2 text-sm text-slate-500">Consulta la experiencia de los clientes en tu sucursal asignada.</p>
            </div>
            <CampanaNotificaciones />
          </header>

          {sinPermiso ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              No tienes permiso para consultar las reseñas de esta sucursal.
            </div>
          ) : (
            <>
              {errorSucursales && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p>{errorSucursales}</p>
                  <button type="button" onClick={reintentarSucursales} className="mt-3 font-semibold underline">Reintentar</button>
                </div>
              )}

              {cargandoSucursales ? (
                <p role="status" className="mb-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Cargando sucursales autorizadas…</p>
              ) : sucursales.length > 0 ? (
                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label htmlFor="sucursal-resenas" className="mb-2 block text-sm font-semibold text-slate-700">Sucursal asignada</label>
                  <select
                    id="sucursal-resenas"
                    value={sucursalId}
                    onChange={(event) => cambiarSucursal(event.target.value)}
                    className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7564e8] focus:ring-2 focus:ring-violet-100"
                  >
                    {sucursales.length > 1 && <option value="" disabled>Selecciona una sucursal</option>}
                    {sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.name}</option>)}
                  </select>
                </section>
              ) : !errorSucursales ? (
                <p className="mb-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No tienes sucursales asignadas para consultar reseñas.</p>
              ) : null}

              {sucursalId && !errorSucursales && (
                <>
                  {error && (
                    <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <p>{error}</p>
                      <button type="button" onClick={reintentarResenas} className="mt-3 font-semibold underline">Reintentar</button>
                    </div>
                  )}

                  {cargando ? (
                    <p role="status" className="mb-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Cargando calificaciones y reseñas…</p>
                  ) : resumenVisible ? (
                    <>
                      <section aria-label="Resumen de calificaciones" className="mb-6 grid gap-4 sm:grid-cols-2">
                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <p className="text-sm font-semibold text-[#7564e8]">Calificación promedio</p>
                          <p className="mt-2 text-4xl font-bold tracking-tight text-[#20233e]">
                            {resumenVisible.averageRating === null ? "—" : resumenVisible.averageRating.toFixed(1)}
                            <span className="ml-2 text-base font-medium text-slate-400">/ 5</span>
                          </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <p className="text-sm font-semibold text-[#7564e8]">Total de reseñas</p>
                          <p className="mt-2 text-4xl font-bold tracking-tight text-[#20233e]">{resumenVisible.totalReviews}</p>
                        </article>
                      </section>

                      <section aria-labelledby="lista-resenas-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h2 id="lista-resenas-heading" className="text-xl font-semibold text-[#20233e]">Reseñas de clientes</h2>
                            <p className="mt-1 text-sm text-slate-500">Ordenadas de la más reciente a la más antigua.</p>
                          </div>
                          {resumenVisible.totalPages > 0 && <p className="text-sm text-slate-500">Página {pagina} de {resumenVisible.totalPages}</p>}
                        </div>

                        {resumenVisible.reviews.length === 0 ? (
                          <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Esta sucursal todavía no tiene reseñas.</p>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {resumenVisible.reviews.map((resena) => (
                              <article key={resena.id} className="py-5 first:pt-0 last:pb-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-lg tracking-wide text-amber-400" aria-label={`${resena.rating} de 5 estrellas`}>
                                    {"★".repeat(resena.rating)}{"☆".repeat(5 - resena.rating)}
                                  </p>
                                  <time dateTime={resena.createdAt} className="text-sm text-slate-500">{fecha(resena.createdAt)}</time>
                                </div>
                                {resena.comment?.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{resena.comment}</p>}
                              </article>
                            ))}
                          </div>
                        )}

                        {resumenVisible.totalPages > 1 && (
                          <nav aria-label="Paginación de reseñas" className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                            <button
                              type="button"
                              disabled={cargando || pagina <= 1}
                              onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >Anterior</button>
                            <span className="text-sm text-slate-500">{pagina} / {totalPaginas}</span>
                            <button
                              type="button"
                              disabled={cargando || pagina >= totalPaginas}
                              onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >Siguiente</button>
                          </nav>
                        )}
                      </section>
                    </>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
