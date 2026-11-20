import { formatGymDayHeading } from "@/src/lib/gym-datetime";
import type {
  ChargeStatus,
  CreatePersonalSessionInput,
  PersonalSession,
  PersonalSessionServiceResult,
  PersonalSessionStatus,
  TrainerSlot,
  TrainerSlotsResponse,
} from "@/src/types/personal-sessions";

export interface TrainerSlotDayGroup {
  date: string;
  label: string;
  slots: TrainerSlot[];
}

export const SESSION_STATUS_LABELS: Record<PersonalSessionStatus, string> = {
  SCHEDULED: "Programada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
};

export function getChargeStatusLabel(status: ChargeStatus | null): string {
  if (!status) return "Sin cobro asociado";
  return CHARGE_STATUS_LABELS[status];
}

/**
 * Agrupa los espacios de 60 minutos por su `date` (`YYYY-MM-DD` en El Salvador) y los ordena por hora.
 */
export function groupTrainerSlotsByDate(slots: TrainerSlot[]): TrainerSlotDayGroup[] {
  const byDate = new Map<string, TrainerSlot[]>();

  for (const slot of slots) {
    const existing = byDate.get(slot.date) ?? [];
    existing.push(slot);
    byDate.set(slot.date, existing);
  }

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));

  return sortedDates.map((date) => {
    const daySlots = (byDate.get(date) ?? []).slice().sort((a, b) => {
      const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      return diff !== 0 ? diff : a.startTime.localeCompare(b.startTime);
    });

    return {
      date,
      label: formatGymDayHeading(date),
      slots: daySlots,
    };
  });
}

/**
 * Elimina inmediatamente el horario conflictivo tras un 409 ("Ese horario ya fue tomado.").
 */
export function removeTakenSlot(slots: TrainerSlot[], takenStartsAt: string): TrainerSlot[] {
  return slots.filter((slot) => slot.startsAt !== takenStartsAt);
}

/**
 * Separa las sesiones personales en próximas (más cercana primero) y pasadas (más reciente primero).
 */
export function partitionPersonalSessions(
  sessions: PersonalSession[],
  nowMs: number,
): { upcoming: PersonalSession[]; past: PersonalSession[] } {
  const upcoming: PersonalSession[] = [];
  const past: PersonalSession[] = [];

  for (const session of sessions) {
    const startsAtMs = new Date(session.startsAt).getTime();
    if (Number.isNaN(startsAtMs) || startsAtMs >= nowMs) {
      upcoming.push(session);
    } else {
      past.push(session);
    }
  }

  upcoming.sort((a, b) => {
    const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });

  past.sort((a, b) => {
    const diff = new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });

  return { upcoming, past };
}

/**
 * Coordina solicitudes secuenciales de slots para evitar que una respuesta vieja
 * sobrescriba el estado de una selección más reciente.
 */
export class LatestTrainerSlotsCoordinator {
  private currentSeq = 0;

  nextRequestId(): number {
    this.currentSeq += 1;
    return this.currentSeq;
  }

  isLatest(requestId: number): boolean {
    return requestId === this.currentSeq;
  }
}

export interface BookSessionFlowOutcome {
  ignoredAsDuplicateInFlight: boolean;
  ok: boolean;
  booked?: PersonalSession;
  errorMessage?: string;
  sessionExpired?: boolean;
  pricingUnavailable?: boolean;
  refreshedSlots?: TrainerSlot[];
  clearSelectedSlot: boolean;
}

/**
 * Ejecuta el agendamiento con bloqueo anti doble clic, manejo de 201, 409 (remueve y recarga),
 * 400 (<12h) y 503 (tarifa sin configurar).
 */
export async function runBookPersonalSessionFlow(
  input: CreatePersonalSessionInput,
  currentSlots: TrainerSlot[],
  inFlightRef: { current: boolean },
  deps: {
    book: (payload: CreatePersonalSessionInput) => Promise<PersonalSessionServiceResult<PersonalSession>>;
    reloadSlots: (trainerId: string) => Promise<PersonalSessionServiceResult<TrainerSlotsResponse>>;
  },
): Promise<BookSessionFlowOutcome> {
  if (inFlightRef.current) {
    return {
      ignoredAsDuplicateInFlight: true,
      ok: false,
      clearSelectedSlot: false,
    };
  }

  inFlightRef.current = true;

  try {
    const result = await deps.book({
      trainerId: input.trainerId,
      startsAt: input.startsAt,
    });

    if (result.ok && result.data) {
      const slotsRes = await deps.reloadSlots(input.trainerId);
      const refreshedSlots =
        slotsRes.ok && slotsRes.data
          ? slotsRes.data.slots
          : removeTakenSlot(currentSlots, input.startsAt);

      return {
        ignoredAsDuplicateInFlight: false,
        ok: true,
        booked: result.data,
        refreshedSlots,
        clearSelectedSlot: true,
      };
    }

    if (result.sessionExpired) {
      return {
        ignoredAsDuplicateInFlight: false,
        ok: false,
        sessionExpired: true,
        errorMessage: result.error,
        clearSelectedSlot: false,
      };
    }

    if (result.code === "SLOT_ALREADY_TAKEN" || result.status === 409) {
      const slotsWithoutTaken = removeTakenSlot(currentSlots, input.startsAt);
      const slotsRes = await deps.reloadSlots(input.trainerId);
      const refreshedSlots =
        slotsRes.ok && slotsRes.data
          ? removeTakenSlot(slotsRes.data.slots, input.startsAt)
          : slotsWithoutTaken;

      return {
        ignoredAsDuplicateInFlight: false,
        ok: false,
        errorMessage: result.error ?? "Ese horario ya fue tomado.",
        refreshedSlots,
        clearSelectedSlot: true,
      };
    }

    if (result.code === "PRICING_UNAVAILABLE" || result.status === 503) {
      return {
        ignoredAsDuplicateInFlight: false,
        ok: false,
        pricingUnavailable: true,
        errorMessage:
          result.error ??
          "Aún no se puede agendar porque el precio de la sesión personal no está configurado.",
        clearSelectedSlot: false,
      };
    }

    return {
      ignoredAsDuplicateInFlight: false,
      ok: false,
      errorMessage: result.error ?? "No se pudo agendar la sesión personal.",
      clearSelectedSlot: false,
    };
  } finally {
    inFlightRef.current = false;
  }
}
