"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { useSesion } from "@/lib/stores/sesion";

type Branch = {
  id: string;
  name: string;
  openingTime: string;
  closingTime: string;
};

type TableStatus = "Libre" | "Ocupada" | "Reservada";

type TableAvailability = {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  available: boolean;
};

type AvailabilityResponse = { items: TableAvailability[] };

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function meseroApi<T>(path: string): Promise<T> {
  const response = await fetch(`/api/mesero/${path}`, { cache: "no-store" });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((part): part is string => typeof part === "string").join(", ")
      : typeof rawMessage === "string"
        ? rawMessage
        : `Error ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

function fechaLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutoRedondeado(date: Date) {
  const total = date.getHours() * 60 + date.getMinutes();
  return Math.ceil(total / 30) * 30;
}

function horaTexto(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function minutosHora(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function opcionesHora(apertura: string, cierre: string) {
  const inicio = minutosHora(apertura);
  const fin = minutosHora(cierre);
  const values = new Set<string>([apertura, cierre]);
  for (let minute = Math.ceil(inicio / 30) * 30; minute <= fin; minute += 30) {
    values.add(horaTexto(minute));
  }
  return [...values].sort((a, b) => minutosHora(a) - minutosHora(b));
}

function horaInicial(branch: Branch, date: string, today: string) {
  const values = opcionesHora(branch.openingTime, branch.closingTime);
  if (date !== today) return values[0] ?? branch.openingTime;

  const now = new Date();
  const target = Math.max(minutoRedondeado(now), minutosHora(branch.openingTime));
  const selected = values.find((value) => minutosHora(value) >= target);
  return selected ?? values.at(-1) ?? branch.closingTime;
}

function estadoVisual(status: TableStatus) {
  if (status === "Libre") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "Ocupada") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function DisponibilidadMesasPage() {
  const router = useRouter();
  const cargarUsuario = useSesion((state) => state.cargarUsuario);
  const guardarSucursal = useSesion((state) => state.guardarSucursal);

  const [branch, setBranch] = useState<Branch | null>(null);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [items, setItems] = useState<TableAvailability[]>([]);
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const hasLoaded = useRef(false);
  const requestInFlight = useRef(false);
  const hours = useMemo(
    () => (branch ? opcionesHora(branch.openingTime, branch.closingTime) : []),
    [branch],
  );

  useEffect(() => {
    let cancelled = false;

    const loadBranch = async () => {
      setLoadingBranch(true);
      try {
        const session = await cargarUsuario();
        if (!session) {
          router.push("/login");
          return;
        }
        if (session.role !== "MESERO") {
          setForbidden(true);
          return;
        }

        const assigned = await meseroApi<Branch>("my-branch");
        if (cancelled) return;
        setBranch(assigned);
        guardarSucursal({ id: assigned.id, name: assigned.name });
        const initialDate = fechaLocal(new Date());
        setToday(initialDate);
        setDate(initialDate);
        setTime(horaInicial(assigned, initialDate, initialDate));
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 401) {
          router.push("/login");
          return;
        }
        if (cause instanceof ApiError && cause.status === 403) {
          setForbidden(true);
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo obtener la sucursal asignada.",
        );
      } finally {
        if (!cancelled) setLoadingBranch(false);
      }
    };

    void loadBranch();
    return () => {
      cancelled = true;
    };
  }, [cargarUsuario, guardarSucursal, router]);

  const consultar = useCallback(
    async (automatic = false) => {
      if (!branch || !date || !time || requestInFlight.current) return;
      requestInFlight.current = true;
      if (hasLoaded.current || automatic) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const localDateTime = new Date(`${date}T${time}:00`);
        if (Number.isNaN(localDateTime.getTime())) {
          throw new Error("La fecha y hora seleccionadas no son válidas.");
        }
        const params = new URLSearchParams({
          dateTime: localDateTime.toISOString(),
        });
        const response = await meseroApi<AvailabilityResponse>(
          `branches/${branch.id}/tables/availability?${params.toString()}`,
        );
        if (!Array.isArray(response.items)) {
          throw new Error("El servidor devolvió una respuesta de disponibilidad inválida.");
        }
        setItems(response.items);
        setLastUpdated(new Date().toLocaleTimeString("es-SV", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }));
        hasLoaded.current = true;
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) {
          router.push("/login");
          return;
        }
        if (cause instanceof ApiError && cause.status === 403) {
          setForbidden(true);
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo consultar la disponibilidad.",
        );
      } finally {
        requestInFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch, date, time, router],
  );

  useEffect(() => {
    if (!branch || !date || !time || forbidden) return;
    void consultar();
    const interval = window.setInterval(() => {
      void consultar(true);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [branch, date, time, forbidden, consultar]);

  const availableCount = items.filter((table) => table.available).length;
  const occupiedCount = items.filter((table) => table.status === "Ocupada").length;
  const reservedCount = items.filter((table) => table.status === "Reservada").length;

  function changeDate(value: string) {
    setDate(value);
    if (branch) setTime(horaInicial(branch, value, today));
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />

      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Mesero / Gestión de mesas</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">
                Disponibilidad de mesas
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Consulta cuáles mesas están libres, ocupadas o reservadas para una fecha y hora determinadas.
              </p>
              {branch && (
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f0edff] px-3 py-1.5 text-xs font-semibold text-[#7564e8]">
                  Sucursal asignada: {branch.name}
                </span>
              )}
            </div>
            <CampanaNotificaciones />
          </div>

          {forbidden ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              No tiene permiso para consultar esta sucursal.
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-[#20233e]">Consultar disponibilidad</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    La consulta se actualiza automáticamente cada 5 segundos.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                  <label className="block text-sm font-semibold text-slate-600">
                    Sucursal
                    <select
                      value={branch?.id ?? ""}
                      disabled
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm text-slate-600 disabled:cursor-not-allowed"
                    >
                      {branch ? (
                        <option value={branch.id}>{branch.name}</option>
                      ) : (
                        <option value="">{loadingBranch ? "Cargando sucursal..." : "Sin sucursal asignada"}</option>
                      )}
                    </select>
                    <span className="mt-1 block text-xs font-normal text-slate-400">Solo puedes consultar tu sucursal asignada.</span>
                  </label>

                  <label className="block text-sm font-semibold text-slate-600">
                    Fecha
                    <input
                      type="date"
                      min={today}
                      value={date}
                      onChange={(event) => changeDate(event.target.value)}
                      disabled={!branch || loadingBranch}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#7564e8] disabled:bg-slate-100"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-600">
                    Hora
                    <select
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      disabled={!branch || loadingBranch || hours.length === 0}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#7564e8] disabled:bg-slate-100"
                    >
                      {hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => void consultar()}
                    disabled={!branch || loadingBranch || loading || refreshing || !date || !time}
                    className="rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6250d5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading || refreshing ? "Consultando..." : "Consultar"}
                  </button>
                </div>
              </section>

              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Mesas libres</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">{availableCount}</p>
                </article>
                <article className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Mesas ocupadas</p>
                  <p className="mt-2 text-3xl font-bold text-rose-600">{occupiedCount}</p>
                </article>
                <article className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Mesas reservadas</p>
                  <p className="mt-2 text-3xl font-bold text-amber-600">{reservedCount}</p>
                </article>
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#20233e]">Estado de las mesas</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {date && time ? `Consulta para ${date} a las ${time}` : "Selecciona fecha y hora."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {lastUpdated && (
                      <span className="text-xs text-slate-400">Actualizado: {lastUpdated}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => void consultar()}
                      disabled={!branch || loading || refreshing}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Actualizar ahora
                    </button>
                  </div>
                </div>

                {loadingBranch || loading ? (
                  <div className="px-5 py-16 text-center text-sm text-slate-500">Cargando disponibilidad de mesas...</div>
                ) : items.length === 0 ? (
                  <div className="px-5 py-16 text-center text-sm text-slate-500">
                    No hay mesas registradas para esta sucursal.
                  </div>
                ) : (
                  <>
                    {availableCount === 0 && (
                      <div role="status" className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                        No hay mesas disponibles para el horario seleccionado.
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left">
                        <thead className="bg-[#f9f9fd]">
                          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-4">Mesa</th>
                            <th className="px-5 py-4">Capacidad</th>
                            <th className="px-5 py-4">Estado</th>
                            <th className="px-5 py-4">Disponibilidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((table) => (
                            <tr key={table.id} className="transition hover:bg-slate-50/70">
                              <td className="px-5 py-4 text-sm font-semibold text-[#252944]">Mesa {table.number}</td>
                              <td className="px-5 py-4 text-sm text-slate-600">{table.capacity} personas</td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${estadoVisual(table.status)}`}>
                                  {table.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm font-medium">
                                <span className={table.available ? "text-emerald-700" : "text-slate-400"}>
                                  {table.available ? "Disponible" : "No disponible"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
                      Se muestran {items.length} mesa(s). La disponibilidad se vuelve a consultar cada 5 segundos.
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
