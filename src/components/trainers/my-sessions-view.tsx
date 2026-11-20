"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  formatGymShortDate,
  formatGymTimeRange,
  formatUsdPrice,
} from "@/src/lib/gym-datetime";
import { fetchMyPersonalSessions } from "@/src/services/trainers/personal-sessions-service";
import type { PersonalSession } from "@/src/types/personal-sessions";
import {
  getChargeStatusLabel,
  partitionPersonalSessions,
  SESSION_STATUS_LABELS,
} from "./personal-sessions-logic";
import { MemberSessionsNav } from "./member-sessions-nav";

export const EMPTY_SESSIONS_MESSAGE =
  "Aún no tienes sesiones personales agendadas.";

export interface MySessionsPanelProps {
  sessions: PersonalSession[];
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  nowMs: number;
  onRetry: () => void;
}

function SessionSection({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: PersonalSession[];
}) {
  return (
    <section aria-labelledby={`section-${title}`} className="flex flex-col gap-3">
      <h2
        id={`section-${title}`}
        className="border-b border-zinc-200 pb-2 text-lg font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
      >
        {title}
      </h2>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((session) => {
            const sessionBadgeClass =
              session.status === "SCHEDULED"
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                : session.status === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

            const chargeBadgeClass =
              session.chargeStatus === "PAID"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : session.chargeStatus === "PENDING"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

            return (
              <li
                key={session.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {session.trainer.fullName}
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sessionBadgeClass}`}>
                      {SESSION_STATUS_LABELS[session.status]}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-medium text-zinc-500 dark:text-zinc-400">Fecha:</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                        {formatGymShortDate(session.startsAt)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-medium text-zinc-500 dark:text-zinc-400">Horario:</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                        {formatGymTimeRange(session.startsAt, session.endsAt)} (60 min)
                      </dd>
                    </div>
                    {session.price !== null && (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Tarifa:</dt>
                        <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatUsdPrice(session.price)}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                      <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                        Estado del cobro:
                      </dt>
                      <dd>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${chargeBadgeClass}`}
                        >
                          {getChargeStatusLabel(session.chargeStatus)}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Vista presentacional pura de "Mis sesiones" para MEMBER (H11 / FE-11.2).
 * No incluye botones ni acciones de cancelación en esta versión.
 */
export function MySessionsPanel({
  sessions,
  loading,
  error,
  sessionExpired,
  nowMs,
  onRetry,
}: MySessionsPanelProps) {
  const { upcoming, past } = useMemo(
    () => partitionPersonalSessions(sessions, nowMs),
    [sessions, nowMs],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 sm:p-6">
      <MemberSessionsNav active="mine" />

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Mis sesiones</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sesiones personales agendadas y estado de sus cobros (horario de El Salvador).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/miembro/sesiones/agendar"
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Agendar nueva sesión
          </Link>
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </header>

      {sessionExpired && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="font-semibold">Tu sesión expiró.</p>
          <p className="mt-1">Vuelve a iniciar sesión para ver tus sesiones personales.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      {loading && (
        <div
          role="status"
          className="flex min-h-48 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="animate-pulse text-sm font-medium text-zinc-500">
            Cargando tus sesiones personales...
          </p>
        </div>
      )}

      {!loading && error && !sessionExpired && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30"
        >
          <p className="font-semibold text-red-800 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && !sessionExpired && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {EMPTY_SESSIONS_MESSAGE}
          </p>
          <Link
            href="/miembro/sesiones/agendar"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Agendar una sesión
          </Link>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="flex flex-col gap-8">
          <SessionSection
            title="Próximas sesiones"
            emptyLabel="No tienes sesiones personales próximas."
            items={upcoming}
          />
          <SessionSection
            title="Sesiones pasadas"
            emptyLabel="Aún no tienes sesiones pasadas."
            items={past}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Contenedor con carga desde servidor para "Mis sesiones" (FE-11.2).
 */
export function MySessionsView() {
  const [sessions, setSessions] = useState<PersonalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchMyPersonalSessions().then((res) => {
      if (cancelled) return;
      setNowMs(Date.now());

      if (res.sessionExpired) {
        setSessionExpired(true);
        setLoading(false);
        return;
      }

      if (res.ok && res.data) {
        setSessions(res.data);
        setError(null);
      } else {
        setError(res.error ?? "No se pudieron cargar tus sesiones personales.");
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <MySessionsPanel
      sessions={sessions}
      loading={loading}
      error={error}
      sessionExpired={sessionExpired}
      nowMs={nowMs}
      onRetry={handleRetry}
    />
  );
}
