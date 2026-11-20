import { formatGymDayHeading, getGymDateKey } from "@/src/lib/gym-datetime";
import { getClassSpotsLeft } from "@/src/services/classes/classes-service";
import type {
  ClassReservation,
  ClassServiceResult,
  GymClass,
  ReservationStatus,
} from "@/src/types/classes";

export interface MemberClassDayGroup {
  dateKey: string;
  label: string;
  classes: GymClass[];
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

export type ReserveDisabledReason = "reserving" | "already-reserved" | "full" | "past" | null;

export interface ReserveButtonState {
  disabled: boolean;
  reason: ReserveDisabledReason;
  label: string;
}

/**
 * Agrupa las clases SCHEDULED por fecha en `America/El_Salvador` y las ordena cronológicamente.
 */
export function groupMemberClassesByDay(classes: GymClass[]): MemberClassDayGroup[] {
  const byDay = new Map<string, GymClass[]>();

  for (const item of classes) {
    if (item.status !== "SCHEDULED") continue;
    const key = getGymDateKey(item.startsAt);
    if (!key) continue;
    const existing = byDay.get(key) ?? [];
    existing.push(item);
    byDay.set(key, existing);
  }

  const sortedKeys = Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((dateKey) => {
    const items = (byDay.get(dateKey) ?? []).slice().sort((a, b) => {
      const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      return diff !== 0 ? diff : a.id - b.id;
    });

    return {
      dateKey,
      label: formatGymDayHeading(dateKey),
      classes: items,
    };
  });
}

/**
 * Conjunto de IDs de clase donde el miembro ya tiene reserva CONFIRMED.
 */
export function getConfirmedReservationClassIds(reservations: ClassReservation[]): Set<number> {
  const ids = new Set<number>();
  for (const reservation of reservations) {
    if (reservation.status === "CONFIRMED") {
      ids.add(reservation.classId);
    }
  }
  return ids;
}

/**
 * Determina el estado y etiqueta del botón de reserva de una clase.
 */
export function getReserveButtonState(
  gymClass: GymClass,
  options: {
    nowMs: number;
    isReserving: boolean;
    isAlreadyReserved: boolean;
  },
): ReserveButtonState {
  if (options.isReserving) {
    return { disabled: true, reason: "reserving", label: "Reservando..." };
  }
  if (options.isAlreadyReserved) {
    return { disabled: true, reason: "already-reserved", label: "Ya reservada" };
  }
  if (new Date(gymClass.startsAt).getTime() <= options.nowMs) {
    return { disabled: true, reason: "past", label: "Clase finalizada" };
  }
  if (getClassSpotsLeft(gymClass) <= 0) {
    return { disabled: true, reason: "full", label: "Sin cupos" };
  }
  return { disabled: false, reason: null, label: "Reservar cupo" };
}

/**
 * Separa las reservas en próximas y pasadas, ordenadas en cada sección desde la
 * fecha de clase más cercana al momento actual.
 */
export function partitionReservations(
  reservations: ClassReservation[],
  nowMs: number = Date.now(),
): { upcoming: ClassReservation[]; past: ClassReservation[] } {
  const upcoming: ClassReservation[] = [];
  const past: ClassReservation[] = [];

  for (const reservation of reservations) {
    const startsAtMs = new Date(reservation.gymClass.startsAt).getTime();
    if (Number.isNaN(startsAtMs) || startsAtMs >= nowMs) {
      upcoming.push(reservation);
    } else {
      past.push(reservation);
    }
  }

  // Próximas: la más cercana hacia adelante primero (ascendente)
  upcoming.sort((a, b) => {
    const diff =
      new Date(a.gymClass.startsAt).getTime() - new Date(b.gymClass.startsAt).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });

  // Pasadas: la más cercana hacia atrás primero (descendente)
  past.sort((a, b) => {
    const diff =
      new Date(b.gymClass.startsAt).getTime() - new Date(a.gymClass.startsAt).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });

  return { upcoming, past };
}

export interface ReserveFlowOutcome {
  ignoredAsDuplicateInFlight: boolean;
  ok: boolean;
  message: string;
  sessionExpired?: boolean;
  classes?: GymClass[];
  reservations?: ClassReservation[];
}

/**
 * Ejecuta el flujo completo de reserva de cupo con bloqueo anti doble clic,
 * recarga de disponibilidad/reservas tras éxito o 409, y conservación segura de estado ante errores.
 */
export async function runReserveClassFlow(
  classId: number,
  inFlightSet: Set<number>,
  deps: {
    reserve: (id: number) => Promise<ClassServiceResult<ClassReservation>>;
    reloadClasses: () => Promise<ClassServiceResult<GymClass[]>>;
    reloadReservations: () => Promise<ClassServiceResult<ClassReservation[]>>;
  },
): Promise<ReserveFlowOutcome> {
  if (inFlightSet.has(classId)) {
    return {
      ignoredAsDuplicateInFlight: true,
      ok: false,
      message: "",
    };
  }

  inFlightSet.add(classId);

  try {
    const result = await deps.reserve(classId);

    if (result.ok && result.data) {
      const [classesRes, reservationsRes] = await Promise.all([
        deps.reloadClasses(),
        deps.reloadReservations(),
      ]);

      return {
        ignoredAsDuplicateInFlight: false,
        ok: true,
        message: `Cupo reservado con éxito en "${result.data.gymClass.name}".`,
        classes: classesRes.ok ? classesRes.data : undefined,
        reservations: reservationsRes.ok ? reservationsRes.data : undefined,
      };
    }

    if (result.sessionExpired) {
      return {
        ignoredAsDuplicateInFlight: false,
        ok: false,
        sessionExpired: true,
        message: result.error ?? "La sesión expiró. Inicia sesión de nuevo.",
      };
    }

    if (
      result.code === "CLASS_FULL" ||
      result.code === "ALREADY_RESERVED" ||
      result.code === "CLASS_ALREADY_STARTED" ||
      result.code === "CLASS_NOT_SCHEDULED"
    ) {
      const [classesRes, reservationsRes] = await Promise.all([
        deps.reloadClasses(),
        deps.reloadReservations(),
      ]);

      return {
        ignoredAsDuplicateInFlight: false,
        ok: false,
        message: result.error ?? "No se pudo completar la reserva.",
        classes: classesRes.ok ? classesRes.data : undefined,
        reservations: reservationsRes.ok ? reservationsRes.data : undefined,
      };
    }

    return {
      ignoredAsDuplicateInFlight: false,
      ok: false,
      message: result.error ?? "No se pudo completar la reserva.",
    };
  } finally {
    inFlightSet.delete(classId);
  }
}
