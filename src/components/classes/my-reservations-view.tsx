"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  formatGymShortDate,
  formatGymTimeRange,
} from "@/src/lib/gym-datetime";
import { cancelMyReservation, fetchMyReservations } from "@/src/services/classes/classes-service";
import type { ClassReservation } from "@/src/types/classes";
import {
  partitionReservations,
  RESERVATION_STATUS_LABELS,
} from "./member-classes-logic";
import { MemberClassesNav } from "./member-classes-nav";

export const EMPTY_RESERVATIONS_MESSAGE =
  "Aún no tienes reservas registradas en clases grupales.";

export interface MyReservationsPanelProps {
  reservations: ClassReservation[];
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  nowMs: number;
  onRetry: () => void;
  onCancel?: (reservationId: number) => Promise<void>;
  cancellingId?: number | null;
  cancelError?: string | null;
  cancelSuccess?: string | null;
}

const CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000;

export function canCancelReservation(reservation: ClassReservation, nowMs: number): boolean {
  return reservation.status === "CONFIRMED" &&
    reservation.origin !== "DROP_IN" &&
    reservation.gymClass.status === "SCHEDULED" &&
    new Date(reservation.gymClass.startsAt).getTime() - nowMs >= CANCELLATION_WINDOW_MS;
}

function ReservationListSection({
  title,
  emptyLabel,
  items,
  nowMs,
  onCancel,
  cancellingId,
}: {
  title: string;
  emptyLabel: string;
  items: ClassReservation[];
  nowMs: number;
  onCancel?: (reservationId: number) => Promise<void>;
  cancellingId?: number | null;
}) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
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
          {items.map((reservation) => {
            const isConfirmed = reservation.status === "CONFIRMED";
            const isClassCancelled = reservation.gymClass.status === "CANCELLED";

            return (
              <li
                key={reservation.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {reservation.gymClass.name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isConfirmed
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </span>
                  </div>

                  {isClassCancelled && (
                    <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      Clase cancelada por el gimnasio
                    </p>
                  )}

                  <dl className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-medium text-zinc-500 dark:text-zinc-400">Fecha:</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                        {formatGymShortDate(reservation.gymClass.startsAt)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-medium text-zinc-500 dark:text-zinc-400">Horario:</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                        {formatGymTimeRange(
                          reservation.gymClass.startsAt,
                          reservation.gymClass.endsAt,
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-medium text-zinc-500 dark:text-zinc-400">Entrenador:</dt>
                      <dd className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                        {reservation.gymClass.trainer.fullName}
                      </dd>
                    </div>
                  </dl>
                  {reservation.status === "CONFIRMED" && onCancel && (
                    <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                      {confirmingId === reservation.id ? (
                        <div className="space-y-2" role="group" aria-label="Confirmar cancelación">
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            ¿Seguro que deseas cancelar esta reserva?
                          </p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmingId(null)}
                              disabled={cancellingId === reservation.id}
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
                              Volver
                            </button>
                            <button type="button" onClick={async () => {
                              await onCancel(reservation.id);
                              setConfirmingId(null);
                            }} disabled={cancellingId === reservation.id}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                              {cancellingId === reservation.id ? "Cancelando..." : "Confirmar cancelación"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmingId(reservation.id)}
                          disabled={!canCancelReservation(reservation, nowMs) || cancellingId !== null}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-300">
                          Cancelar reserva
                        </button>
                      )}
                      {reservation.origin === "DROP_IN" && (
                        <p className="mt-1 text-xs text-zinc-500">La clase suelta no se puede cancelar.</p>
                      )}
                      {reservation.origin !== "DROP_IN" && !canCancelReservation(reservation, nowMs) && (
                        <p className="mt-1 text-xs text-zinc-500">Solo puedes cancelar hasta 2 horas antes de la clase.</p>
                      )}
                    </div>
                  )}
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
 * Vista presentacional pura de "Mis reservas" para MEMBER (FE-7.2).
 * Incluye confirmación de cancelación de reservas propias (H08 / FE-8.1).
 */
export function MyReservationsPanel({
  reservations,
  loading,
  error,
  sessionExpired,
  nowMs,
  onRetry,
  onCancel,
  cancellingId = null,
  cancelError = null,
  cancelSuccess = null,
}: MyReservationsPanelProps) {
  const { upcoming, past } = useMemo(
    () => partitionReservations(reservations, nowMs),
    [reservations, nowMs],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 sm:p-6">
      <MemberClassesNav active="reservations" />

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Mis reservas</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Historial y próximas reservas en clases grupales (horario de El Salvador).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/miembro/clases"
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Explorar clases
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

      {cancelError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">{cancelError}</p>}
      {cancelSuccess && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{cancelSuccess}</p>}

      {sessionExpired && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="font-semibold">Tu sesión expiró.</p>
          <p className="mt-1">Vuelve a iniciar sesión para ver tus reservas.</p>
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
            Cargando tus reservas...
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

      {!loading && !error && reservations.length === 0 && !sessionExpired && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {EMPTY_RESERVATIONS_MESSAGE}
          </p>
          <Link
            href="/miembro/clases"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Ver calendario de clases
          </Link>
        </div>
      )}

      {!loading && !error && reservations.length > 0 && (
        <div className="flex flex-col gap-8">
          <ReservationListSection
            title="Próximas reservas"
            emptyLabel="No tienes reservas próximas."
            items={upcoming}
            nowMs={nowMs}
            onCancel={onCancel}
            cancellingId={cancellingId}
          />
          <ReservationListSection
            title="Reservas pasadas"
            emptyLabel="Aún no tienes reservas pasadas."
            items={past}
            nowMs={nowMs}
            onCancel={onCancel}
            cancellingId={cancellingId}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Contenedor con carga desde servidor para "Mis reservas" (FE-7.2).
 */
export function MyReservationsView() {
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchMyReservations().then((res) => {
      if (cancelled) return;
      setNowMs(Date.now());

      if (res.sessionExpired) {
        setSessionExpired(true);
        setLoading(false);
        return;
      }

      if (res.ok && res.data) {
        setReservations(res.data);
        setError(null);
      } else {
        setError(res.error ?? "No se pudieron cargar tus reservas.");
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

  const handleCancel = useCallback(async (reservationId: number) => {
    if (cancellingId !== null) return;
    setCancellingId(reservationId);
    setCancelError(null);
    setCancelSuccess(null);
    const result = await cancelMyReservation(reservationId);
    if (result.sessionExpired) {
      setSessionExpired(true);
    } else if (result.ok && result.data) {
      const updated = result.data;
      setReservations((items) => items.map((item) => item.id === reservationId ? updated : item));
      setCancelSuccess("Reserva cancelada. El cupo ya está disponible.");
      setNowMs(Date.now());
    } else {
      setCancelError(result.error ?? "No se pudo cancelar la reserva.");
    }
    setCancellingId(null);
  }, [cancellingId]);

  return (
    <MyReservationsPanel
      reservations={reservations}
      loading={loading}
      error={error}
      sessionExpired={sessionExpired}
      nowMs={nowMs}
      onRetry={handleRetry}
      onCancel={handleCancel}
      cancellingId={cancellingId}
      cancelError={cancelError}
      cancelSuccess={cancelSuccess}
    />
  );
}
