"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { useSesion } from "@/lib/stores/sesion";
import {
  obtenerSucursalesAsignadas,
  type SucursalAsignada,
} from "@/lib/services/branches";

type BloqueOcupacion = {
  startTime: string;
  endTime: string;
  reservedTables: number;
  occupancy: number;
};

type ReporteOcupacion = {
  branchId: string;
  date: string;
  totalTables: number;
  slots: BloqueOcupacion[];
  message?: string;
};

const SIN_PERMISO = "No tiene permiso para consultar la ocupación de esta sucursal.";
const ERROR_SERVIDOR = "No se pudo generar el reporte de ocupación. Intente de nuevo.";

function hoy(): string {
  const fecha = new Date();
  const dos = (valor: number) => String(valor).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

function fechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function mensajeDeError(datos: unknown): string {
  if (datos && typeof datos === "object" && "message" in datos) {
    const mensaje = (datos as { message?: unknown }).message;
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
    if (Array.isArray(mensaje)) {
      const textos = mensaje.filter((item): item is string => typeof item === "string");
      if (textos.length) return textos.join(" ");
    }
  }
  return ERROR_SERVIDOR;
}

function fechaVisible(valor: string): string {
  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

function GraficaOcupacion({ bloques }: { bloques: BloqueOcupacion[] }) {
  const puntos = useMemo(() => {
    const izquierda = 54;
    const derecha = 884;
    const arriba = 18;
    const abajo = 218;
    return bloques.map((bloque, indice) => {
      const x = bloques.length <= 1
        ? (izquierda + derecha) / 2
        : izquierda + (indice * (derecha - izquierda)) / (bloques.length - 1);
      const porcentaje = Math.min(100, Math.max(0, bloque.occupancy));
      const y = abajo - (porcentaje / 100) * (abajo - arriba);
      return { x, y, bloque, indice };
    });
  }, [bloques]);

  if (bloques.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        No hay bloques horarios para mostrar.
      </div>
    );
  }

  const linea = puntos.map((punto, indice) => `${indice === 0 ? "M" : "L"}${punto.x},${punto.y}`).join(" ");
  const area = `${linea} L ${puntos[puntos.length - 1].x},218 L ${puntos[0].x},218 Z`;
  const pasoEtiqueta = Math.max(1, Math.ceil(bloques.length / 8));

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox="0 0 920 260" role="img" aria-label="Gráfica de ocupación proyectada por hora" className="h-auto w-full">
        {[0, 25, 50, 75, 100].map((valor) => {
          const y = 218 - (valor / 100) * 200;
          return (
            <g key={valor}>
              <line x1="54" y1={y} x2="884" y2={y} stroke="#e8eaf2" strokeDasharray="4 5" />
              <text x="42" y={y + 4} textAnchor="end" fontSize="11" fill="#8990a5">{valor}%</text>
            </g>
          );
        })}
        <path d={area} fill="rgba(117,100,232,0.12)" />
        <path d={linea} fill="none" stroke="#7564e8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {puntos.map((punto) => (
          <g key={`${punto.bloque.startTime}-${punto.indice}`}>
            <circle cx={punto.x} cy={punto.y} r="5" fill="#ffffff" stroke="#7564e8" strokeWidth="3" />
            {(punto.indice % pasoEtiqueta === 0 || punto.indice === puntos.length - 1) && (
              <text x={punto.x} y="246" textAnchor="middle" fontSize="11" fill="#7b8297">
                {punto.bloque.startTime}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-500">
        <span className="h-2.5 w-2.5 rounded-full bg-[#7564e8]" />
        Porcentaje de mesas ocupadas
      </div>
    </div>
  );
}

export default function OcupacionProyectadaPage() {
  const router = useRouter();
  const cargarUsuario = useSesion((estado) => estado.cargarUsuario);

  const [sucursales, setSucursales] = useState<SucursalAsignada[]>([]);
  const [sucursal, setSucursal] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [cargandoSucursales, setCargandoSucursales] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [reporte, setReporte] = useState<ReporteOcupacion | null>(null);
  const [error, setError] = useState("");
  const [errorSucursal, setErrorSucursal] = useState("");
  const [errorFecha, setErrorFecha] = useState("");
  const [sinPermiso, setSinPermiso] = useState(false);

  useEffect(() => {
    let activo = true;
    queueMicrotask(async () => {
      const actual = await cargarUsuario();
      if (!activo) return;
      if (actual && actual.role !== "GERENTE") {
        setSinPermiso(true);
        setCargandoSucursales(false);
        return;
      }

      try {
        const asignadas = await obtenerSucursalesAsignadas();
        if (!activo) return;
        setSucursales(asignadas);
      } catch (err) {
        if (!activo) return;
        const status = err && typeof err === "object" && "status" in err
          ? Number((err as { status: unknown }).status)
          : 0;
        if (status === 401) {
          router.push("/login");
          return;
        }
        if (status === 403) {
          setSinPermiso(true);
          return;
        }
        setError(err instanceof Error ? err.message : "No se pudieron cargar las sucursales asignadas.");
      } finally {
        if (activo) setCargandoSucursales(false);
      }
    });
    return () => {
      activo = false;
    };
  }, [cargarUsuario, router]);

  async function generarReporte(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setErrorSucursal("");
    setErrorFecha("");

    let valido = true;
    if (!sucursal) {
      setErrorSucursal("Seleccione una sucursal asignada.");
      valido = false;
    } else if (!sucursales.some((item) => item.id === sucursal)) {
      setErrorSucursal("La sucursal seleccionada no está asignada a su usuario.");
      valido = false;
    }
    if (!fecha) {
      setErrorFecha("Seleccione una fecha.");
      valido = false;
    } else if (!fechaValida(fecha)) {
      setErrorFecha("Ingrese una fecha válida con formato YYYY-MM-DD.");
      valido = false;
    }
    if (!valido) return;

    setCargando(true);
    setReporte(null);
    try {
      const parametros = new URLSearchParams({ date: fecha });
      const respuesta = await fetch(
        `/api/reportes/branches/${encodeURIComponent(sucursal)}/occupancy?${parametros.toString()}`,
        { cache: "no-store" },
      );

      if (respuesta.status === 401) {
        router.push("/login");
        return;
      }
      if (respuesta.status === 403) {
        setSinPermiso(true);
        return;
      }

      const datos: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(mensajeDeError(datos));
      }

      if (
        !datos || typeof datos !== "object" ||
        !Array.isArray((datos as ReporteOcupacion).slots) ||
        typeof (datos as ReporteOcupacion).totalTables !== "number"
      ) {
        throw new Error("El servidor devolvió un reporte de ocupación con formato inválido.");
      }

      const reporteRecibido = datos as ReporteOcupacion;
      setReporte({
        ...reporteRecibido,
        totalTables: Math.max(0, reporteRecibido.totalTables),
        slots: reporteRecibido.slots.map((bloque) => ({
          ...bloque,
          reservedTables: Math.max(0, bloque.reservedTables),
          occupancy: Math.min(100, Math.max(0, bloque.occupancy)),
        })),
      });
    } catch (err) {
      setReporte(null);
      setError(err instanceof Error ? err.message : ERROR_SERVIDOR);
    } finally {
      setCargando(false);
    }
  }

  const bloques = reporte?.slots ?? [];
  const ocupacionPromedio = bloques.length
    ? bloques.reduce((suma, bloque) => suma + bloque.occupancy, 0) / bloques.length
    : 0;
  const bloqueMaximo = bloques.reduce<BloqueOcupacion | null>(
    (maximo, bloque) => !maximo || bloque.occupancy > maximo.occupancy ? bloque : maximo,
    null,
  );
  const formatoPorcentaje = (valor: number) => `${valor.toFixed(2)}%`;

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Reportes / Ocupación proyectada</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Ocupación proyectada</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Consulta la ocupación estimada de las mesas por sucursal y horario para planificar la atención del restaurante.
              </p>
            </div>
            <CampanaNotificaciones />
          </div>

          {sinPermiso ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {SIN_PERMISO}
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <form onSubmit={generarReporte} className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
                  <div>
                    <label htmlFor="sucursal-ocupacion" className="mb-2 block text-sm font-semibold text-[#252944]">
                      Sucursal
                    </label>
                    <select
                      id="sucursal-ocupacion"
                      value={sucursal}
                      disabled={cargandoSucursales || sucursales.length === 0}
                      onChange={(evento) => {
                        setSucursal(evento.target.value);
                        setReporte(null);
                        setError("");
                        setErrorSucursal("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 outline-none focus:border-[#7564e8] disabled:bg-slate-50"
                    >
                      <option value="">
                        {cargandoSucursales ? "Cargando sucursales..." : "Seleccione una sucursal"}
                      </option>
                      {sucursales.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    {errorSucursal && <p className="mt-2 text-xs text-red-600">{errorSucursal}</p>}
                    {!cargandoSucursales && sucursales.length === 0 && !error && (
                      <p className="mt-2 text-xs text-amber-700">No tiene sucursales asignadas para consultar.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="fecha-ocupacion" className="mb-2 block text-sm font-semibold text-[#252944]">
                      Fecha
                    </label>
                    <input
                      id="fecha-ocupacion"
                      type="date"
                      value={fecha}
                      onChange={(evento) => {
                        setFecha(evento.target.value);
                        setReporte(null);
                        setError("");
                        setErrorFecha("");
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600 outline-none focus:border-[#7564e8]"
                    />
                    {errorFecha && <p className="mt-2 text-xs text-red-600">{errorFecha}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={cargando || cargandoSucursales || sucursales.length === 0}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#7564e8] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6554d6] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cargando ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Generando...
                      </>
                    ) : "Generar reporte"}
                  </button>
                </form>
              </section>

              {cargando && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#e5e1ff] bg-white p-5 text-sm text-slate-600 shadow-sm" role="status">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#7564e8]/30 border-t-[#7564e8]" />
                  Calculando la ocupación proyectada...
                </div>
              )}

              {reporte && !cargando && (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-[#20233e]">
                        {sucursales.find((item) => item.id === reporte.branchId)?.name ?? "Sucursal seleccionada"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">Proyección para el {fechaVisible(reporte.date)}</p>
                    </div>
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-[#6858d8]">Solo reservas confirmadas</span>
                  </div>

                  {reporte.totalTables === 0 ? (
                    <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-700">!</span>
                        <div>
                          <h3 className="font-semibold text-amber-900">No hay mesas para calcular la ocupación</h3>
                          <p className="mt-1 text-sm text-amber-800">{reporte.message ?? "La sucursal no tiene mesas registradas. No es posible calcular el porcentaje de ocupación."}</p>
                        </div>
                      </div>
                    </div>
                  ) : bloques.length === 0 ? (
                    <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                      {reporte.message ?? "La sucursal no tiene bloques horarios disponibles para la fecha seleccionada."}
                    </div>
                  ) : (
                    <>
                      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-sm font-medium text-slate-500">Mesas registradas</p>
                          <p className="mt-2 text-3xl font-bold text-[#20233e]">{reporte.totalTables}</p>
                          <p className="mt-1 text-xs text-slate-400">Capacidad total de la sucursal</p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-sm font-medium text-slate-500">Ocupación promedio</p>
                          <p className="mt-2 text-3xl font-bold text-[#7564e8]">{formatoPorcentaje(ocupacionPromedio)}</p>
                          <p className="mt-1 text-xs text-slate-400">Promedio de los bloques horarios</p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-sm font-medium text-slate-500">Ocupación máxima</p>
                          <p className="mt-2 text-3xl font-bold text-[#20233e]">{formatoPorcentaje(bloqueMaximo?.occupancy ?? 0)}</p>
                          <p className="mt-1 text-xs text-slate-400">Mayor porcentaje proyectado</p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-sm font-medium text-slate-500">Horario de mayor demanda</p>
                          <p className="mt-2 text-2xl font-bold text-[#20233e]">{bloqueMaximo ? `${bloqueMaximo.startTime} – ${bloqueMaximo.endTime}` : "—"}</p>
                          <p className="mt-1 text-xs text-slate-400">Bloque con mayor ocupación</p>
                        </article>
                      </section>

                      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-[#20233e]">Ocupación por horario</h3>
                            <p className="mt-1 text-sm text-slate-500">Porcentaje de mesas reservadas en cada bloque de una hora.</p>
                          </div>
                          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">Escala: 0% – 100%</span>
                        </div>
                        <GraficaOcupacion bloques={bloques} />
                      </section>

                      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                          <h3 className="text-lg font-bold text-[#20233e]">Detalle por bloque horario</h3>
                          <p className="mt-1 text-sm text-slate-500">Cada mesa se contabiliza una sola vez por bloque.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-6 py-4 font-semibold">Horario</th>
                                <th className="px-6 py-4 text-center font-semibold">Mesas reservadas</th>
                                <th className="px-6 py-4 text-center font-semibold">Total de mesas</th>
                                <th className="px-6 py-4 text-right font-semibold">Ocupación</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {bloques.map((bloque) => (
                                <tr key={`${bloque.startTime}-${bloque.endTime}`} className="transition hover:bg-slate-50/70">
                                  <td className="px-6 py-4 font-semibold text-[#252944]">{bloque.startTime} – {bloque.endTime}</td>
                                  <td className="px-6 py-4 text-center text-slate-600">{bloque.reservedTables}</td>
                                  <td className="px-6 py-4 text-center text-slate-600">{reporte.totalTables}</td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1.5 text-xs font-bold ${bloque.occupancy >= 75 ? "bg-rose-50 text-rose-700" : bloque.occupancy >= 40 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                                      {formatoPorcentaje(bloque.occupancy)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
