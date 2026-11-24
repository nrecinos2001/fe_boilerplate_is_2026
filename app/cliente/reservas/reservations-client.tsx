"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";

type Reservation = {
  id: string;
  branchId: string;
  branchName: string;
  tableId: string;
  tableNumber: number;
  dateTime: string;
  durationMinutes: number;
  peopleCount: number;
  status: string;
};

type ReservationList = { items: Reservation[] };

function getMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.filter((v) => typeof v === "string").join(" ") || fallback;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function localParts(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/El_Salvador", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const timeGet = (type: string) => timeParts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${timeGet("hour")}:${timeGet("minute")}` };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "long", timeStyle: "short", timeZone: "America/El_Salvador",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  switch (status) {
    case "CONFIRMED": return "Confirmada";
    case "CANCELLED": return "Cancelada";
    case "COMPLETED": return "Completada";
    default: return status;
  }
}

function canManage(reservation: Reservation) {
  return reservation.status === "CONFIRMED" && new Date(reservation.dateTime).getTime() > Date.now();
}

function canCancel(reservation: Reservation) {
  return canManage(reservation) && new Date(reservation.dateTime).getTime() - Date.now() >= 2 * 60 * 60 * 1000;
}

export default function MisReservasClient() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [peopleCount, setPeopleCount] = useState("2");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/cliente/reservations", { cache: "no-store" });
      const payload: unknown = await response.json().catch(() => null);
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok) throw new Error(getMessage(payload, "No se pudieron cargar tus reservas."));
      const result = payload as ReservationList | null;
      if (!result || !Array.isArray(result.items)) throw new Error("El servidor devolvió una lista de reservas inválida.");
      setReservations(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar tus reservas.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadReservations(); }, [loadReservations]);

  function startEdit(reservation: Reservation) {
    const parts = localParts(reservation.dateTime);
    setEditing(reservation);
    setDate(parts.date);
    setTime(parts.time);
    setPeopleCount(String(reservation.peopleCount));
    setError("");
    setSuccess("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const count = Number(peopleCount);
    if (!date || !time) { setError("Selecciona una fecha y una hora."); return; }
    if (date < localParts(new Date().toISOString()).date) { setError("La fecha no puede ser anterior a hoy."); return; }
    if (!Number.isInteger(count) || count < 1) { setError("La cantidad de personas debe ser un entero mayor o igual a 1."); return; }

    setSavingId(editing.id);
    setError("");
    setSuccess("");
    try {
      const dateTime = `${date}T${time}:00-06:00`;
      const response = await fetch(`/api/cliente/reservations/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateTime, peopleCount: count }),
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok) throw new Error(getMessage(payload, "No se pudo modificar la reserva."));
      setEditing(null);
      setSuccess("Tu reserva se modificó correctamente.");
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo modificar la reserva. Tu reserva original se conserva.");
    } finally {
      setSavingId("");
    }
  }

  async function cancelReservation(reservation: Reservation) {
    const confirmed = window.confirm(`¿Seguro que deseas cancelar tu reserva en ${reservation.branchName} para el ${formatDate(reservation.dateTime)}?`);
    if (!confirmed) return;

    setSavingId(reservation.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/cliente/reservations/${reservation.id}/cancel`, {
        method: "PATCH",
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok) throw new Error(getMessage(payload, "No se pudo cancelar la reserva."));
      setSuccess("Tu reserva se canceló correctamente.");
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar la reserva.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Núcleo Digital / Cliente / Mis reservas</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Mis reservas</h1>
              <p className="mt-2 text-sm text-slate-500">Consulta, modifica o cancela tus próximas visitas.</p>
            </div>
            <CampanaNotificaciones />
          </header>

          {success && <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</p>}
          {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

          {editing && (
            <section className="mb-6 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#20233e]">Modificar reserva</h2>
                  <p className="mt-1 text-sm text-slate-500">{editing.branchName} · Mesa {editing.tableNumber}</p>
                </div>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar</button>
              </div>
              <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">Nueva fecha
                  <input type="date" min={localParts(new Date().toISOString()).date} value={date} onChange={(e) => setDate(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-[#7564e8]" />
                </label>
                <label className="text-sm font-semibold text-slate-700">Nueva hora
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-[#7564e8]" />
                </label>
                <label className="text-sm font-semibold text-slate-700">Cantidad de personas
                  <input type="number" min="1" step="1" value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-[#7564e8]" />
                </label>
                <div className="flex flex-wrap gap-3 sm:col-span-3">
                  <button type="submit" disabled={savingId === editing.id} className="rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6453d5] disabled:opacity-50">{savingId === editing.id ? "Guardando…" : "Guardar cambios"}</button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Descartar</button>
                </div>
              </form>
              <p className="mt-4 text-xs text-slate-500">La modificación está sujeta al horario de la sucursal, capacidad y disponibilidad de mesas.</p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#20233e]">Historial de reservas</h2>
                <p className="mt-1 text-sm text-slate-500">Solo se muestran las reservas de tu cuenta.</p>
              </div>
              <button type="button" onClick={() => void loadReservations()} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{loading ? "Actualizando…" : "Actualizar"}</button>
            </div>

            {loading ? (
              <p role="status" className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Cargando tus reservas…</p>
            ) : reservations.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="font-semibold text-slate-700">Todavía no tienes reservas.</p>
                <a href="/reservas/nueva" className="mt-3 inline-flex rounded-xl bg-[#7564e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6453d5]">Registrar una reserva</a>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => {
                  const manageable = canManage(reservation);
                  const cancellable = canCancel(reservation);
                  return (
                    <article key={reservation.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-[#20233e]">{reservation.branchName}</h3>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(reservation.dateTime)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${reservation.status === "CONFIRMED" ? "bg-green-50 text-green-700" : reservation.status === "CANCELLED" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel(reservation.status)}</span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-400">Mesa asignada</span><strong className="mt-1 block text-slate-700">Mesa {reservation.tableNumber}</strong></p>
                        <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-400">Personas</span><strong className="mt-1 block text-slate-700">{reservation.peopleCount}</strong></p>
                        <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-400">Duración</span><strong className="mt-1 block text-slate-700">{reservation.durationMinutes} minutos</strong></p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {manageable && <button type="button" onClick={() => startEdit(reservation)} disabled={Boolean(savingId)} className="rounded-xl bg-[#7564e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6453d5] disabled:opacity-50">Modificar</button>}
                        {cancellable && <button type="button" onClick={() => void cancelReservation(reservation)} disabled={Boolean(savingId)} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{savingId === reservation.id ? "Cancelando…" : "Cancelar reserva"}</button>}
                        {manageable && !cancellable && <p className="self-center text-xs text-amber-700">Ya no puedes cancelar: se requieren al menos 2 horas de anticipación.</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
