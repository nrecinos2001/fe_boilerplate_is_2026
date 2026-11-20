"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  formatGymShortDate,
  formatGymTimeRange,
} from "@/src/lib/gym-datetime";
import {
  fetchMemberClasses,
  fetchMyReservations,
  getClassSpotsLeft,
  reserveClassSpot,
} from "@/src/services/classes/classes-service";
import type { ClassReservation, GymClass } from "@/src/types/classes";
import {
  getConfirmedReservationClassIds,
  getReserveButtonState,
  groupMemberClassesByDay,
  partitionReservations,
  runReserveClassFlow,
} from "./member-classes-logic";
import { MemberClassesNav } from "./member-classes-nav";

export const EMPTY_MEMBER_CLASSES_MESSAGE =
  "No hay clases programadas en los próximos 7 días.";

export interface MemberClassesPanelProps {
  classes: GymClass[];
  myReservations: ClassReservation[];
  loading: boolean;
  loadError: string | null;
  sessionExpired: boolean;
  reservingClassId: number | null;
  feedback: { type: "success" | "error"; message: string } | null;
  nowMs: number;
  onReserve: (classId: number) => void;
  onRetry: () => void;
  onDismissFeedback: () => void;
}

/**
 * Vista presentacional pura del calendario de 7 días para MEMBER (FE-7.1).
 */
export function MemberClassesPanel({
  classes,
  myReservations,
  loading,
  loadError,
  sessionExpired,
  reservingClassId,
  feedback,
  nowMs,
  onReserve,
  onRetry,
  onDismissFeedback,
}: MemberClassesPanelProps) {
  const dayGroups = useMemo(() => groupMemberClassesByDay(classes), [classes]);
  const confirmedClassIds = useMemo(
    () => getConfirmedReservationClassIds(myReservations),
    [myReservations],
  );
  const upcomingConfirmedCount = useMemo(
    () =>
      partitionReservations(myReservations, nowMs).upcoming.filter(
        (r) => r.status === "CONFIRMED",
      ).length,
    [myReservations, nowMs],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 sm:p-6">
      <MemberClassesNav active="calendar" />

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Calendario de clases grupales
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Clases programadas para los próximos 7 días (horario de El Salvador).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/miembro/reservas"
            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Mis reservas confirmadas ({upcomingConfirmedCount})
          </Link>
          <button
            type="button"
            onClick={onRetry}
            disabled={loading || reservingClassId !== null}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 transition-colors"
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
          <p className="mt-1">Vuelve a iniciar sesión para consultar y reservar clases.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mb-6 flex flex-col gap-3 rounded-xl border p-4 text-sm shadow-xs sm:flex-row sm:items-center sm:justify-between ${
            feedback.type === "error"
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          <div>
            <p className="font-semibold">{feedback.message}</p>
            {feedback.type === "success" && (
              <Link
                href="/miembro/reservas"
                className="mt-1 inline-block text-xs font-semibold underline hover:no-underline"
              >
                Ver en Mis reservas →
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={onDismissFeedback}
            aria-label="Cerrar mensaje"
            className="self-end rounded-md px-2 py-1 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 sm:self-center"
          >
            Cerrar
          </button>
        </div>
      )}

      {loading && (
        <div
          role="status"
          className="flex min-h-56 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="animate-pulse text-sm font-medium text-zinc-500">
            Cargando clases disponibles...
          </p>
        </div>
      )}

      {!loading && loadError && classes.length === 0 && !sessionExpired && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30"
        >
          <p className="font-semibold text-red-800 dark:text-red-200">{loadError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !loadError && dayGroups.length === 0 && !sessionExpired && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {EMPTY_MEMBER_CLASSES_MESSAGE}
          </p>
        </div>
      )}

      {!loading && dayGroups.length > 0 && (
        <div className="flex flex-col gap-6">
          {loadError && (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              No se pudo actualizar la lista más reciente ({loadError}). Se muestran los últimos datos cargados.
            </div>
          )}

          {dayGroups.map((group) => (
            <section
              key={group.dateKey}
              aria-labelledby={`day-heading-${group.dateKey}`}
              className="flex flex-col gap-3"
            >
              <h2
                id={`day-heading-${group.dateKey}`}
                className="border-b border-zinc-200 pb-2 text-lg font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              >
                {group.label}
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.classes.map((gymClass) => {
                  const spotsLeft = getClassSpotsLeft(gymClass);
                  const isAlreadyReserved = confirmedClassIds.has(gymClass.id);
                  const buttonState = getReserveButtonState(gymClass, {
                    nowMs,
                    isReserving: reservingClassId === gymClass.id,
                    isAlreadyReserved,
                  });

                  return (
                    <article
                      key={gymClass.id}
                      className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            {gymClass.name}
                          </h3>
                          {isAlreadyReserved ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Reservada
                            </span>
                          ) : spotsLeft === 0 ? (
                            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                              Llena
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              Programada
                            </span>
                          )}
                        </div>

                        <dl className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center justify-between gap-2">
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Fecha:</dt>
                            <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                              {formatGymShortDate(gymClass.startsAt)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Horario:</dt>
                            <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                              {formatGymTimeRange(gymClass.startsAt, gymClass.endsAt)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                              Entrenador:
                            </dt>
                            <dd className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                              {gymClass.trainer.fullName}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                              Cupos disponibles:
                            </dt>
                            <dd
                              className={`font-bold ${
                                spotsLeft === 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {spotsLeft} / {gymClass.capacity}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <button
                        type="button"
                        disabled={buttonState.disabled}
                        onClick={() => onReserve(gymClass.id)}
                        className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 transition-colors"
                      >
                        {buttonState.label}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Contenedor con estado y sincronización con servidor para el calendario MEMBER (FE-7.1).
 */
export function MemberClassesView() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [myReservations, setMyReservations] = useState<ClassReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [reservingClassId, setReservingClassId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);

  const inFlightSetRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchMemberClasses(), fetchMyReservations()]).then(([classesRes, resvRes]) => {
      if (cancelled) return;

      setNowMs(Date.now());

      if (classesRes.sessionExpired || resvRes.sessionExpired) {
        setSessionExpired(true);
        setLoading(false);
        return;
      }

      if (classesRes.ok && classesRes.data) {
        setClasses(classesRes.data);
        setLoadError(null);
      } else {
        setLoadError(classesRes.error ?? "No se pudieron cargar las clases.");
      }

      if (resvRes.ok && resvRes.data) {
        setMyReservations(resvRes.data);
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

  const handleReserve = useCallback(async (classId: number) => {
    if (inFlightSetRef.current.has(classId)) return;

    setReservingClassId(classId);
    setFeedback(null);

    const outcome = await runReserveClassFlow(classId, inFlightSetRef.current, {
      reserve: reserveClassSpot,
      reloadClasses: () => fetchMemberClasses(),
      reloadReservations: () => fetchMyReservations(),
    });

    if (outcome.ignoredAsDuplicateInFlight) return;

    setNowMs(Date.now());
    setReservingClassId(null);

    if (outcome.sessionExpired) {
      setSessionExpired(true);
    }
    if (outcome.classes) {
      setClasses(outcome.classes);
    }
    if (outcome.reservations) {
      setMyReservations(outcome.reservations);
    }

    setFeedback({
      type: outcome.ok ? "success" : "error",
      message: outcome.message,
    });
  }, []);

  return (
    <MemberClassesPanel
      classes={classes}
      myReservations={myReservations}
      loading={loading}
      loadError={loadError}
      sessionExpired={sessionExpired}
      reservingClassId={reservingClassId}
      feedback={feedback}
      nowMs={nowMs}
      onReserve={handleReserve}
      onRetry={handleRetry}
      onDismissFeedback={() => setFeedback(null)}
    />
  );
}
