"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatGymShortDate, formatGymTime, formatGymTimeRange } from "@/src/lib/gym-datetime";
import { fetchTrainerAgenda, markTrainerSessionResult } from "@/src/services/trainers/trainer-agenda-service";
import type { TrainerAgendaSession, TrainerSessionOutcome } from "@/src/types/trainer-agenda";

export const EMPTY_TRAINER_AGENDA = "No tienes sesiones agendadas en los próximos 14 días.";

export function canMarkTrainerSession(session: TrainerAgendaSession, nowMs: number): boolean {
  const start = new Date(session.startsAt).getTime();
  return session.status === "SCHEDULED" && nowMs >= start && nowMs - start <= 24 * 60 * 60 * 1000;
}

export interface TrainerAgendaPanelProps {
  sessions: TrainerAgendaSession[];
  nowMs: number;
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  busyId: number | null;
  onRetry: () => void;
  onMark: (id: number, outcome: TrainerSessionOutcome) => void;
}

export function TrainerAgendaPanel({ sessions, nowMs, loading, error, sessionExpired, busyId, onRetry, onMark }: TrainerAgendaPanelProps) {
  const sorted = [...sessions].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || a.id - b.id);
  return <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
    <header className="mb-6 flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Mi agenda</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Sesiones personales de los próximos 14 días. Hora de El Salvador.</p></div>
      <button type="button" onClick={onRetry} disabled={loading} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">Actualizar</button>
    </header>
    {sessionExpired && <div role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Tu sesión expiró. <Link href="/login" className="underline">Iniciar sesión</Link></div>}
    {loading && <p role="status" className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">Cargando agenda...</p>}
    {!loading && error && !sessionExpired && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-950/40 dark:text-red-200"><p>{error}</p><button type="button" onClick={onRetry} className="mt-2 underline">Reintentar</button></div>}
    {!loading && !error && !sessionExpired && sorted.length === 0 && <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">{EMPTY_TRAINER_AGENDA}</p>}
    {!loading && !sessionExpired && sorted.length > 0 && <ul className="grid gap-4 md:grid-cols-2">
      {sorted.map((session) => <li key={session.id} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex justify-between gap-3"><h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{session.member.fullName}</h2><span className="text-sm text-zinc-500">#{session.id}</span></div>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{formatGymShortDate(session.startsAt)} · {formatGymTimeRange(session.startsAt, session.endsAt)}</p>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Cobro: {session.chargeStatus === "PAID" ? "Pagado" : session.chargeStatus === "PENDING" ? "Pendiente" : "Sin cobro asociado"}</p>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">Estado: {session.outcome === "COMPLETED" ? "Realizada" : session.outcome === "NO_SHOW" ? "No asistió" : "Programada"}</p>
        {session.resultRecordedAt && <p className="mt-1 text-xs text-zinc-500">Registrado: {formatGymShortDate(session.resultRecordedAt)} {formatGymTime(session.resultRecordedAt)}</p>}
        {session.status === "SCHEDULED" && <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!canMarkTrainerSession(session, nowMs) || busyId !== null} onClick={() => onMark(session.id, "COMPLETED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Realizada</button>
          <button type="button" disabled={!canMarkTrainerSession(session, nowMs) || busyId !== null} onClick={() => onMark(session.id, "NO_SHOW")} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700">No asistió</button>
        </div>}
        {session.status === "SCHEDULED" && !canMarkTrainerSession(session, nowMs) && <p className="mt-2 text-xs text-zinc-500">El resultado se registra desde el inicio de la sesión y hasta 24 horas después.</p>}
      </li>)}
    </ul>}
  </main>;
}

export function TrainerAgendaView() {
  const [sessions, setSessions] = useState<TrainerAgendaSession[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchTrainerAgenda().then((result) => {
      if (cancelled) return;
      setNowMs(Date.now());
      if (result.sessionExpired) setSessionExpired(true);
      else if (result.ok && result.data) { setSessions(result.data); setError(null); }
      else setError(result.error ?? "No se pudo cargar la agenda.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const onRetry = useCallback(() => { setLoading(true); setReloadKey((key) => key + 1); }, []);
  const onMark = useCallback(async (id: number, outcome: TrainerSessionOutcome) => {
    if (busyId !== null) return;
    setBusyId(id);
    setError(null);
    const result = await markTrainerSessionResult(id, outcome);
    if (result.sessionExpired) setSessionExpired(true);
    else if (result.ok && result.data) {
      const updated = result.data;
      setSessions((items) => items.map((item) => item.id === id ? updated : item));
      setNowMs(Date.now());
    } else setError(result.error ?? "No se pudo registrar el resultado.");
    setBusyId(null);
  }, [busyId]);

  return <TrainerAgendaPanel sessions={sessions} nowMs={nowMs} loading={loading} error={error} sessionExpired={sessionExpired} busyId={busyId} onRetry={onRetry} onMark={(id, outcome) => { void onMark(id, outcome); }} />;
}
