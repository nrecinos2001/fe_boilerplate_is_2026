"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  formatGymDayHeading,
  formatGymShortDate,
  formatGymTimeRange,
  formatUsdPrice,
} from "@/src/lib/gym-datetime";
import {
  bookPersonalSession,
  fetchActiveTrainers,
  fetchSessionPricing,
  fetchTrainerSlots,
} from "@/src/services/trainers/personal-sessions-service";
import type {
  PersonalSession,
  SessionPricingResponse,
  TrainerSlot,
  TrainerSummary,
} from "@/src/types/personal-sessions";
import {
  getChargeStatusLabel,
  groupTrainerSlotsByDate,
  LatestTrainerSlotsCoordinator,
  runBookPersonalSessionFlow,
} from "./personal-sessions-logic";
import { MemberSessionsNav } from "./member-sessions-nav";

export const EMPTY_TRAINERS_MESSAGE =
  "No hay entrenadores disponibles en este momento.";
export const EMPTY_SLOTS_MESSAGE =
  "Este entrenador no tiene espacios disponibles de 60 minutos en los próximos 14 días.";
export const PRICING_UNAVAILABLE_BANNER =
  "El agendamiento no está disponible en este momento porque aún no se ha configurado la tarifa de sesión personal.";

export interface BookPersonalSessionPanelProps {
  trainers: TrainerSummary[];
  selectedTrainerId: string;
  slots: TrainerSlot[];
  selectedSlot: TrainerSlot | null;
  pricing: SessionPricingResponse | null;
  initialLoading: boolean;
  slotsLoading: boolean;
  loadError: string | null;
  slotsError: string | null;
  sessionExpired: boolean;
  submitting: boolean;
  bookingError: string | null;
  bookedConfirmation: PersonalSession | null;
  onSelectTrainer: (trainerId: string) => void;
  onSelectSlot: (slot: TrainerSlot) => void;
  onConfirmBooking: () => void;
  onRetryInitial: () => void;
  onRetrySlots: () => void;
  onDismissFeedback: () => void;
}

/**
 * Vista presentacional pura para elegir entrenador, consultar espacios de 60 min
 * (próximos 14 días) y confirmar agendamiento (H11 / FE-11.1).
 */
export function BookPersonalSessionPanel({
  trainers,
  selectedTrainerId,
  slots,
  selectedSlot,
  pricing,
  initialLoading,
  slotsLoading,
  loadError,
  slotsError,
  sessionExpired,
  submitting,
  bookingError,
  bookedConfirmation,
  onSelectTrainer,
  onSelectSlot,
  onConfirmBooking,
  onRetryInitial,
  onRetrySlots,
  onDismissFeedback,
}: BookPersonalSessionPanelProps) {
  const selectedTrainer = useMemo(
    () => trainers.find((t) => t.id === selectedTrainerId) ?? null,
    [trainers, selectedTrainerId],
  );
  const slotGroups = useMemo(() => groupTrainerSlotsByDate(slots), [slots]);

  const isPricingConfigured =
    pricing !== null &&
    pricing.configured &&
    typeof pricing.price === "number" &&
    pricing.price > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 sm:p-6">
      <MemberSessionsNav active="book" />

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Agendar sesión personal
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sesiones individuales de 60 minutos disponibles en los próximos 14 días (horario de El
            Salvador).
          </p>
        </div>

        <Link
          href="/miembro/sesiones"
          className="self-start rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:self-auto transition-colors"
        >
          Ver Mis sesiones
        </Link>
      </header>

      {sessionExpired && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="font-semibold">Tu sesión expiró.</p>
          <p className="mt-1">Vuelve a iniciar sesión para agendar una sesión personal.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      {!initialLoading && pricing && !isPricingConfigured && !sessionExpired && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="font-semibold">Agendamiento no disponible</p>
          <p className="mt-1">{PRICING_UNAVAILABLE_BANNER}</p>
        </div>
      )}

      {bookedConfirmation && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-base font-bold">Sesión personal agendada con éxito</p>
              <p>
                Entrenador: <strong>{bookedConfirmation.trainer.fullName}</strong> ·{" "}
                {formatGymShortDate(bookedConfirmation.startsAt)} (
                {formatGymTimeRange(bookedConfirmation.startsAt, bookedConfirmation.endsAt)} · 60
                minutos)
              </p>
              <p>
                Tarifa confirmada:{" "}
                <strong>
                  {bookedConfirmation.price !== null
                    ? formatUsdPrice(bookedConfirmation.price)
                    : "No disponible"}
                </strong>
                {bookedConfirmation.chargeId !== null && (
                  <span>
                    {" "}
                    · Cobro #{bookedConfirmation.chargeId} (
                    {getChargeStatusLabel(bookedConfirmation.chargeStatus)})
                  </span>
                )}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <Link
                  href="/miembro/sesiones"
                  className="inline-flex rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                >
                  Ir a Mis sesiones →
                </Link>
                <span className="text-xs text-emerald-800 dark:text-emerald-300">
                  El cobro generado queda registrado en estado pendiente de pago.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismissFeedback}
              className="self-end rounded-md px-2 py-1 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 sm:self-start"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {bookingError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="font-semibold">{bookingError}</p>
          <button
            type="button"
            onClick={onDismissFeedback}
            className="self-end rounded-md px-2 py-1 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 sm:self-center"
          >
            Cerrar
          </button>
        </div>
      )}

      {initialLoading && (
        <div
          role="status"
          className="flex min-h-56 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="animate-pulse text-sm font-medium text-zinc-500">
            Cargando entrenadores y tarifas...
          </p>
        </div>
      )}

      {!initialLoading && loadError && !sessionExpired && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30"
        >
          <p className="font-semibold text-red-800 dark:text-red-200">{loadError}</p>
          <button
            type="button"
            onClick={onRetryInitial}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {!initialLoading && !loadError && trainers.length === 0 && !sessionExpired && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {EMPTY_TRAINERS_MESSAGE}
          </p>
        </div>
      )}

      {!initialLoading && !loadError && trainers.length > 0 && !sessionExpired && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Columna principal: selector de entrenador y espacios libres */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section
              aria-labelledby="trainer-selector-heading"
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label
                    id="trainer-selector-heading"
                    htmlFor="trainer-select"
                    className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    Selecciona un entrenador activo
                  </label>
                  <select
                    id="trainer-select"
                    value={selectedTrainerId}
                    onChange={(e) => onSelectTrainer(e.target.value)}
                    disabled={submitting}
                    className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {trainers.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.fullName} ({trainer.email})
                      </option>
                    ))}
                  </select>
                </div>

                {isPricingConfigured && pricing?.price !== null && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm dark:border-indigo-800 dark:bg-indigo-950/40">
                    <span className="text-zinc-600 dark:text-zinc-300">Tarifa (60 min): </span>
                    <strong className="font-bold text-indigo-700 dark:text-indigo-300">
                      {formatUsdPrice(pricing.price)}
                    </strong>
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="slots-heading" className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2
                    id="slots-heading"
                    className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
                  >
                    Espacios disponibles (60 minutos)
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Próximos 14 días · Cada sesión se agenda con al menos 12 horas de anticipación.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onRetrySlots}
                  disabled={slotsLoading || submitting || !selectedTrainerId}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  Actualizar horarios
                </button>
              </div>

              {slotsLoading && (
                <div
                  role="status"
                  className="flex min-h-40 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="animate-pulse text-sm font-medium text-zinc-500">
                    Consultando espacios disponibles...
                  </p>
                </div>
              )}

              {!slotsLoading && slotsError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-900/50 dark:bg-red-950/30"
                >
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {slotsError}
                  </p>
                  <button
                    type="button"
                    onClick={onRetrySlots}
                    className="mt-3 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!slotsLoading && !slotsError && slotGroups.length === 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {EMPTY_SLOTS_MESSAGE}
                  </p>
                </div>
              )}

              {!slotsLoading && !slotsError && slotGroups.length > 0 && (
                <div className="flex flex-col gap-4">
                  {slotGroups.map((group) => (
                    <div
                      key={group.date}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <h3 className="mb-3 border-b border-zinc-100 pb-2 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                        {group.label}
                      </h3>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                        {group.slots.map((slot) => {
                          const isSelected = selectedSlot?.startsAt === slot.startsAt;
                          return (
                            <button
                              key={`${slot.availabilityBlockId}-${slot.startsAt}`}
                              type="button"
                              aria-pressed={isSelected}
                              disabled={submitting}
                              onClick={() => onSelectSlot(slot)}
                              className={`flex flex-col items-start rounded-xl border px-3.5 py-2.5 text-left transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60 ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-50 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-100"
                                  : "border-zinc-200 bg-zinc-50/70 text-zinc-800 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:border-indigo-600"
                              }`}
                            >
                              <span className="text-sm font-bold">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                Duración: 60 min
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Panel lateral/inferior de confirmación */}
          <aside
            aria-labelledby="booking-summary-heading"
            className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2
              id="booking-summary-heading"
              className="border-b border-zinc-200 pb-3 text-base font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            >
              Resumen antes de confirmar
            </h2>

            {!selectedSlot ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Elige un espacio disponible de 60 minutos para revisar el detalle y confirmar tu
                sesión.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Entrenador:</dt>
                    <dd className="text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedTrainer?.fullName ?? "Entrenador seleccionado"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Fecha:</dt>
                    <dd className="text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatGymDayHeading(selectedSlot.date)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Horario:</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedSlot.startTime} - {selectedSlot.endTime}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Duración:</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">60 minutos</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                    <dt className="text-zinc-500 dark:text-zinc-400">Tarifa:</dt>
                    <dd className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                      {isPricingConfigured && pricing?.price !== null
                        ? formatUsdPrice(pricing.price)
                        : "No configurada"}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  disabled={submitting || !isPricingConfigured}
                  onClick={onConfirmBooking}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 transition-colors"
                >
                  {submitting
                    ? "Confirmando sesión..."
                    : !isPricingConfigured
                      ? "Tarifa no configurada"
                      : "Confirmar sesión"}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/**
 * Contenedor con estado, protección contra respuestas viejas y confirmación real (FE-11.1).
 */
export function BookPersonalSessionView() {
  const [trainers, setTrainers] = useState<TrainerSummary[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [slots, setSlots] = useState<TrainerSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TrainerSlot | null>(null);
  const [pricing, setPricing] = useState<SessionPricingResponse | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedConfirmation, setBookedConfirmation] = useState<PersonalSession | null>(null);

  const [initialReloadKey, setInitialReloadKey] = useState(0);
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);

  const bookingInFlightRef = useRef(false);
  const slotsCoordinatorRef = useRef(new LatestTrainerSlotsCoordinator());
  const slotsAbortRef = useRef<AbortController | null>(null);

  // Carga inicial de entrenadores activos y tarifa
  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchActiveTrainers(), fetchSessionPricing()]).then(
      ([trainersRes, pricingRes]) => {
        if (cancelled) return;

        if (trainersRes.sessionExpired || pricingRes.sessionExpired) {
          setSessionExpired(true);
          setInitialLoading(false);
          return;
        }

        if (pricingRes.ok && pricingRes.data) {
          setPricing(pricingRes.data);
        } else {
          setPricing({ configured: false, price: null });
        }

        if (trainersRes.ok && trainersRes.data) {
          setTrainers(trainersRes.data);
          setSelectedTrainerId((prev) => {
            if (prev && trainersRes.data?.some((t) => t.id === prev)) return prev;
            return trainersRes.data?.[0]?.id ?? "";
          });
          setLoadError(null);
        } else {
          setLoadError(trainersRes.error ?? "No se pudieron cargar los entrenadores.");
        }

        setInitialLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [initialReloadKey]);

  // Carga espacios del entrenador seleccionado protegiendo contra carreras de respuestas viejas
  useEffect(() => {
    if (!selectedTrainerId) return;

    slotsAbortRef.current?.abort();
    const controller = new AbortController();
    slotsAbortRef.current = controller;

    const coordinator = slotsCoordinatorRef.current;
    const requestId = coordinator.nextRequestId();

    fetchTrainerSlots(selectedTrainerId, { signal: controller.signal }).then((res) => {
      if (res.aborted || !coordinator.isLatest(requestId)) {
        return;
      }

      if (res.sessionExpired) {
        setSessionExpired(true);
        setSlotsLoading(false);
        return;
      }

      if (res.ok && res.data) {
        setSlots(res.data.slots);
        setSlotsError(null);
      } else {
        setSlots([]);
        setSlotsError(res.error ?? "No se pudieron cargar los espacios disponibles.");
      }

      setSlotsLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [selectedTrainerId, slotsReloadKey]);

  const handleSelectTrainer = useCallback((trainerId: string) => {
    setSelectedTrainerId(trainerId);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);
    setBookingError(null);
    setSlotsLoading(Boolean(trainerId));
  }, []);

  const handleRetryInitial = useCallback(() => {
    setInitialLoading(true);
    setLoadError(null);
    setInitialReloadKey((k) => k + 1);
  }, []);

  const handleRetrySlots = useCallback(() => {
    if (!selectedTrainerId) return;
    setSlotsLoading(true);
    setSlotsError(null);
    setSlotsReloadKey((k) => k + 1);
  }, [selectedTrainerId]);

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedTrainerId || !selectedSlot) return;
    if (bookingInFlightRef.current) return;

    setSubmitting(true);
    setBookingError(null);
    setBookedConfirmation(null);

    const outcome = await runBookPersonalSessionFlow(
      {
        trainerId: selectedTrainerId,
        startsAt: selectedSlot.startsAt,
      },
      slots,
      bookingInFlightRef,
      {
        book: bookPersonalSession,
        reloadSlots: (trainerId) => fetchTrainerSlots(trainerId),
      },
    );

    if (outcome.ignoredAsDuplicateInFlight) return;

    setSubmitting(false);

    if (outcome.sessionExpired) {
      setSessionExpired(true);
      return;
    }

    if (outcome.pricingUnavailable) {
      setPricing({ configured: false, price: null });
    }

    if (outcome.refreshedSlots) {
      setSlots(outcome.refreshedSlots);
    }

    if (outcome.clearSelectedSlot) {
      setSelectedSlot(null);
    }

    if (outcome.ok && outcome.booked) {
      setBookedConfirmation(outcome.booked);
    } else if (outcome.errorMessage) {
      setBookingError(outcome.errorMessage);
    }
  }, [selectedTrainerId, selectedSlot, slots]);

  return (
    <BookPersonalSessionPanel
      trainers={trainers}
      selectedTrainerId={selectedTrainerId}
      slots={slots}
      selectedSlot={selectedSlot}
      pricing={pricing}
      initialLoading={initialLoading}
      slotsLoading={slotsLoading}
      loadError={loadError}
      slotsError={slotsError}
      sessionExpired={sessionExpired}
      submitting={submitting}
      bookingError={bookingError}
      bookedConfirmation={bookedConfirmation}
      onSelectTrainer={handleSelectTrainer}
      onSelectSlot={(slot) => {
        setSelectedSlot(slot);
        setBookingError(null);
      }}
      onConfirmBooking={handleConfirmBooking}
      onRetryInitial={handleRetryInitial}
      onRetrySlots={handleRetrySlots}
      onDismissFeedback={() => {
        setBookingError(null);
        setBookedConfirmation(null);
      }}
    />
  );
}
