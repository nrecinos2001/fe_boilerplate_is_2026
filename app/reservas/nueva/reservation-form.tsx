"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";

type Branch = {
  id: string;
  name: string;
};

type ReservationResponse = {
  id: string;
  branchId: string;
  tableId: string;
  tableNumber: number;
  dateTime: string;
  durationMinutes: number;
  peopleCount: number;
  status: string;
};

const MIN_TIME = 7 * 60;
const LAST_START_TIME = 20 * 60 + 30; // Deja completar los 90 minutos antes de las 22:00.
const TIME_STEP = 30;

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTimeOptions() {
  const options: string[] = [];
  for (let minutes = MIN_TIME; minutes <= LAST_START_TIME; minutes += TIME_STEP) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const remainder = String(minutes % 60).padStart(2, "0");
    options.push(`${hours}:${remainder}`);
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) return message.filter(Boolean).join(", ") || fallback;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function Icon({
  name,
  size = 20,
}: {
  name: "calendar" | "clock" | "store" | "people" | "check" | "alert";
  size?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "calendar":
      return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case "clock":
      return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "store":
      return <svg {...props}><path d="M3 10h18l-2-7H5l-2 7Z" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></svg>;
    case "people":
      return <svg {...props}><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></svg>;
    case "check":
      return <svg {...props}><path d="m5 12 4 4L19 6" /></svg>;
    case "alert":
      return <svg {...props}><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17h.01" /></svg>;
  }
}

export default function ReservationForm() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(() => localDateValue(new Date()));
  const [time, setTime] = useState("");
  const [peopleCount, setPeopleCount] = useState("2");
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branchError, setBranchError] = useState("");
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === branchId),
    [branches, branchId],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadBranches() {
      try {
        const response = await fetch("/api/menu/branches", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data: unknown = await response.json();

        if (!response.ok || !Array.isArray(data)) {
          throw new Error(errorMessage(data, "No se pudieron cargar las sucursales."));
        }

        const activeBranches = data.filter(
          (item): item is Branch =>
            item !== null &&
            typeof item === "object" &&
            typeof (item as Branch).id === "string" &&
            typeof (item as Branch).name === "string",
        );

        if (!controller.signal.aborted) {
          setBranches(activeBranches);
          if (activeBranches.length === 0) {
            setBranchError("No hay sucursales activas disponibles.");
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setBranchError(
            err instanceof Error ? err.message : "No se pudieron cargar las sucursales.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingBranches(false);
      }
    }

    void loadBranches();
    return () => controller.abort();
  }, []);

  function validateForm() {
    if (!branchId) return "Selecciona una sucursal.";
    if (!date) return "Selecciona una fecha.";
    if (date < localDateValue(new Date())) return "La fecha no puede ser anterior a hoy.";
    if (!time) return "Selecciona una hora.";

    const count = Number(peopleCount);
    if (!Number.isInteger(count) || count < 1) {
      return "La cantidad de personas debe ser un entero mayor o igual a 1.";
    }
    return "";
  }

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setReservation(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      // El backend interpreta el instante y valida el horario en America/El_Salvador.
      const dateTime = `${date}T${time}:00-06:00`;
      const response = await fetch("/api/cliente/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          dateTime,
          peopleCount: Number(peopleCount),
        }),
        cache: "no-store",
      });

      const payload: unknown = await response.json().catch(() => null);

      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (response.status === 403) {
        throw new Error("Tu usuario no tiene permiso para registrar reservas.");
      }
      if (!response.ok) {
        throw new Error(
          errorMessage(payload, "No se pudo registrar la reserva. Intenta de nuevo."),
        );
      }

      const result = payload as ReservationResponse | null;
      if (
        !result ||
        typeof result.id !== "string" ||
        typeof result.tableNumber !== "number"
      ) {
        throw new Error("El servidor respondió, pero los datos de la reserva están incompletos.");
      }
      setReservation(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la reserva. Intenta de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setReservation(null);
    setError("");
    setTime("");
    setPeopleCount("2");
    setDate(localDateValue(new Date()));
  }

  const formattedReservationDate = reservation
    ? new Intl.DateTimeFormat("es-SV", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/El_Salvador",
      }).format(new Date(reservation.dateTime))
    : "";

  return (
    <div className="min-h-screen bg-[#f4f5fb] text-[#20233e] lg:flex">
      <BarraLateral />

      <main className="min-w-0 flex-1">
        <header className="bg-[#171b36] px-5 py-7 text-white sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-indigo-200">Proyecto 3 · Núcleo Digital</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                H10. Registro de reservas
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Reserva una mesa en la sucursal que prefieras.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
                Rol: Cliente
              </span>
              <CampanaNotificaciones />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-7 lg:px-10">
          <div className="mb-5 inline-flex rounded-full bg-[#6927c9] px-5 py-2 text-sm font-bold text-white shadow-sm">
            Registro de reservas
          </div>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0eaff] text-[#6927c9]">
                  <Icon name="calendar" size={25} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#20233e]">Registrar reserva</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Completa los datos para solicitar una mesa. La asignación se confirma al guardar.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={submitReservation} className="p-5 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#252944]">Sucursal <span className="text-rose-500">*</span></span>
                  <span className="relative block">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="store" size={18} /></span>
                    <select
                      value={branchId}
                      onChange={(event) => { setBranchId(event.target.value); setError(""); setReservation(null); }}
                      disabled={loadingBranches || branches.length === 0 || submitting}
                      className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-[#252944] outline-none transition focus:border-[#8051dc] focus:ring-4 focus:ring-purple-100 disabled:bg-slate-100"
                      required
                    >
                      <option value="">{loadingBranches ? "Cargando sucursales..." : "Seleccione una sucursal"}</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#252944]">Fecha <span className="text-rose-500">*</span></span>
                  <span className="relative block">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="calendar" size={18} /></span>
                    <input
                      type="date"
                      value={date}
                      min={localDateValue(new Date())}
                      onChange={(event) => { setDate(event.target.value); setError(""); setReservation(null); }}
                      disabled={submitting}
                      required
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-[#252944] outline-none transition focus:border-[#8051dc] focus:ring-4 focus:ring-purple-100 disabled:bg-slate-100"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#252944]">Hora <span className="text-rose-500">*</span></span>
                  <span className="relative block">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="clock" size={18} /></span>
                    <select
                      value={time}
                      onChange={(event) => { setTime(event.target.value); setError(""); setReservation(null); }}
                      disabled={submitting}
                      required
                      className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-[#252944] outline-none transition focus:border-[#8051dc] focus:ring-4 focus:ring-purple-100 disabled:bg-slate-100"
                    >
                      <option value="">Seleccione una hora</option>
                      {TIME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#252944]">Cantidad de personas <span className="text-rose-500">*</span></span>
                  <span className="relative block">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="people" size={18} /></span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={peopleCount}
                      onChange={(event) => { setPeopleCount(event.target.value); setError(""); setReservation(null); }}
                      disabled={submitting}
                      required
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-[#252944] outline-none transition focus:border-[#8051dc] focus:ring-4 focus:ring-purple-100 disabled:bg-slate-100"
                    />
                  </span>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>Las reservas duran 90 minutos y están sujetas a disponibilidad.</span>
                <span>Horario de referencia: 07:00 a 22:00.</span>
              </div>

              {branchError && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                  {branchError}
                </div>
              )}

              {error && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert" aria-live="assertive">
                  <span className="mt-0.5 shrink-0"><Icon name="alert" size={21} /></span>
                  <div>
                    <p className="font-bold">No se pudo confirmar la reserva</p>
                    <p className="mt-1 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3">
                {reservation && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-12 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Registrar otra reserva
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || loadingBranches || branches.length === 0 || Boolean(branchError) || Boolean(reservation)}
                  className="inline-flex h-12 min-w-52 items-center justify-center gap-2 rounded-xl bg-[#6927c9] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#5720aa] focus:outline-none focus:ring-4 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "Registrando reserva..." : <><Icon name="check" size={18} /> Confirmar reserva</>}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-6" aria-live="polite">
            <h2 className="mb-3 text-lg font-bold text-[#20233e]">Resultado de la reserva</h2>
            {reservation ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" size={25} /></span>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-900">¡Reserva confirmada!</h3>
                      <p className="mt-1 text-sm text-emerald-800">Tu mesa ha sido asignada correctamente.</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white">Confirmada</span>
                </div>
                <div className="mt-5 grid gap-4 border-t border-emerald-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Identificador</p><p className="mt-1 break-all text-sm font-bold text-emerald-950">{reservation.id}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Sucursal</p><p className="mt-1 text-sm font-bold text-emerald-950">{selectedBranch?.name ?? "Sucursal"}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Fecha y hora</p><p className="mt-1 text-sm font-bold text-emerald-950">{formattedReservationDate}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mesa asignada</p><p className="mt-1 text-sm font-bold text-emerald-950">Mesa {reservation.tableNumber}</p></div>
                </div>
                <p className="mt-4 text-sm text-emerald-800">Duración: {reservation.durationMinutes} minutos · Personas: {reservation.peopleCount}</p>
              </div>
            ) : error ? null : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                Completa los datos y confirma tu reserva. Aquí aparecerán el identificador, la mesa asignada y el estado devuelto por el servidor.
              </div>
            )}
          </section>

          <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-slate-400">
            Núcleo Digital · Gestión de mesas y reservas
          </footer>
        </div>
      </main>
    </div>
  );
}
