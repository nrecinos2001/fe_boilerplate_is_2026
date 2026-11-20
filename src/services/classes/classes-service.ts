import { apiFetch, SessionExpiredError } from "@/src/services/http/api-client";
import { buildMemberClassesRange } from "@/src/lib/gym-datetime";
import type {
  ClassReservation,
  ClassReservationErrorCode,
  ClassServiceResult,
  CreateClassInput,
  GymClass,
  TrainerOption,
  UpdateClassInput,
} from "@/src/types/classes";

interface BackendErrorPayload {
  message?: string | string[];
  error?: string;
  code?: string;
}

const UNEXPECTED_RESPONSE_MESSAGE = "La respuesta del servidor tuvo un formato inesperado.";
const MEMBERSHIP_UNAVAILABLE_UI_MESSAGE =
  "La reserva está temporalmente indisponible porque la verificación de membresías aún no está disponible. Intenta más tarde.";

async function readErrorPayload(res: Response): Promise<{ message: string; code?: string }> {
  try {
    const data = (await res.json()) as BackendErrorPayload;
    if (data && typeof data === "object") {
      const code = typeof data.code === "string" ? data.code : undefined;
      if (Array.isArray(data.message) && data.message.length > 0) {
        return { message: data.message.join(" "), code };
      }
      if (typeof data.message === "string" && data.message.trim().length > 0) {
        return { message: data.message, code };
      }
      if (typeof data.error === "string" && data.error.trim().length > 0) {
        return { message: data.error, code };
      }
    }
  } catch {
    // Error al parsear JSON, usar fallback por status
  }
  return { message: `Error en la solicitud (${res.status}).` };
}

async function parseErrorMessage(res: Response): Promise<string> {
  const { message } = await readErrorPayload(res);
  return message;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidTrainerSummary(value: unknown): boolean {
  if (!isObjectRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.fullName === "string" &&
    typeof value.email === "string"
  );
}

function isValidGymClassShape(value: unknown): value is GymClass {
  if (!isObjectRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.startsAt === "string" &&
    typeof value.endsAt === "string" &&
    typeof value.capacity === "number" &&
    typeof value.confirmedReservations === "number" &&
    (value.status === "SCHEDULED" || value.status === "CANCELLED") &&
    isValidTrainerSummary(value.trainer)
  );
}

function isValidReservationShape(value: unknown): value is ClassReservation {
  if (!isObjectRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    typeof value.classId === "number" &&
    (value.status === "CONFIRMED" || value.status === "CANCELLED") &&
    typeof value.createdAt === "string" &&
    isValidGymClassShape(value.gymClass)
  );
}

/**
 * Calcula los cupos disponibles usando `spotsLeft` del backend cuando está presente.
 */
export function getClassSpotsLeft(
  gymClass: Pick<GymClass, "capacity" | "confirmedReservations" | "spotsLeft">,
): number {
  if (typeof gymClass.spotsLeft === "number" && Number.isFinite(gymClass.spotsLeft)) {
    return Math.max(0, gymClass.spotsLeft);
  }
  return Math.max(0, gymClass.capacity - gymClass.confirmedReservations);
}

function classifyReservationError(
  status: number,
  message: string,
  backendCode?: string,
): { code: ClassReservationErrorCode; message: string } {
  if (status === 503) {
    return {
      code: "MEMBERSHIP_UNAVAILABLE",
      message: MEMBERSHIP_UNAVAILABLE_UI_MESSAGE,
    };
  }

  if (status === 403) {
    const normalized = message.toLowerCase();
    if (normalized.includes("suelta")) {
      return {
        code: "DROP_IN_NOT_ALLOWED",
        message: "La clase suelta se compra en recepción y no permite reservar.",
      };
    }
    return {
      code: "MEMBERSHIP_INACTIVE",
      message:
        normalized.includes("membresía") || normalized.includes("membresia")
          ? message
          : "Necesitas una membresía activa para reservar.",
    };
  }

  if (status === 409) {
    if (backendCode === "CLASS_FULL" || message === "La clase está llena.") {
      return { code: "CLASS_FULL", message: "La clase está llena." };
    }
    const normalized = message.toLowerCase();
    if (normalized.includes("ya tienes una reserva")) {
      return { code: "ALREADY_RESERVED", message: "Ya tienes una reserva en esta clase." };
    }
    if (normalized.includes("ya comenzó") || normalized.includes("ya comenzo")) {
      return { code: "CLASS_ALREADY_STARTED", message };
    }
    if (normalized.includes("programada")) {
      return { code: "CLASS_NOT_SCHEDULED", message };
    }
  }

  return { code: "UNKNOWN", message };
}

function mapCaughtError<T>(err: unknown, fallbackMessage: string): ClassServiceResult<T> {
  if (err instanceof SessionExpiredError) {
    return {
      ok: false,
      error: err.message,
      status: 401,
      code: "SESSION_EXPIRED",
      sessionExpired: true,
    };
  }
  const message = err instanceof Error && err.message ? err.message : fallbackMessage;
  return {
    ok: false,
    error: message,
    code: "NETWORK_ERROR",
  };
}

/**
 * Consulta las clases programadas para una semana dada según el rango [from, to] (H06 ADMIN).
 */
export async function fetchWeeklyClasses(
  from: Date,
  to: Date,
): Promise<ClassServiceResult<GymClass[]>> {
  try {
    const query = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const res = await apiFetch(`classes?${query.toString()}`);
    if (!res.ok) {
      const error = await parseErrorMessage(res);
      return { ok: false, error, status: res.status };
    }

    const data = (await res.json()) as GymClass[];
    return { ok: true, data, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al cargar las clases.";
    return { ok: false, error: message, status: 500 };
  }
}

/**
 * Consulta las clases SCHEDULED de los próximos 7 días para el miembro (H07 / FE-7.1).
 */
export async function fetchMemberClasses(
  now: Date = new Date(),
): Promise<ClassServiceResult<GymClass[]>> {
  try {
    const { from, to } = buildMemberClassesRange(now);
    const query = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const res = await apiFetch(`classes?${query.toString()}`);
    if (!res.ok) {
      const error = await parseErrorMessage(res);
      return { ok: false, error, status: res.status, code: "UNKNOWN" };
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    if (!Array.isArray(payload) || !payload.every(isValidGymClassShape)) {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    const scheduledClasses = payload.filter((gymClass) => gymClass.status === "SCHEDULED");
    return { ok: true, data: scheduledClasses, status: res.status };
  } catch (err) {
    return mapCaughtError(err, "No se pudieron cargar las clases disponibles.");
  }
}

/**
 * Reserva un cupo para el miembro autenticado en una clase grupal (H07 / BE-7.2).
 * No envía `memberId`: el backend lo extrae del JWT.
 */
export async function reserveClassSpot(
  classId: number,
): Promise<ClassServiceResult<ClassReservation>> {
  try {
    const res = await apiFetch(`classes/${classId}/reservations`, {
      method: "POST",
    });

    if (!res.ok) {
      const { message, code } = await readErrorPayload(res);
      const mapped = classifyReservationError(res.status, message, code);
      return {
        ok: false,
        error: mapped.message,
        status: res.status,
        code: mapped.code,
      };
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    if (!isValidReservationShape(payload)) {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    return { ok: true, data: payload, status: res.status };
  } catch (err) {
    return mapCaughtError(err, "No se pudo completar la reserva. Verifica tu conexión.");
  }
}

/**
 * Obtiene las reservas del miembro autenticado para "Mis reservas" (H07 / FE-7.2).
 */
export async function fetchMyReservations(): Promise<ClassServiceResult<ClassReservation[]>> {
  try {
    const res = await apiFetch("classes/reservations/me");
    if (!res.ok) {
      const error = await parseErrorMessage(res);
      return { ok: false, error, status: res.status, code: "UNKNOWN" };
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    if (
      !isObjectRecord(payload) ||
      !Array.isArray(payload.data) ||
      !payload.data.every(isValidReservationShape)
    ) {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    return { ok: true, data: payload.data, status: res.status };
  } catch (err) {
    return mapCaughtError(err, "No se pudieron cargar tus reservas.");
  }
}

/** Cancela una reserva propia (H08 / FE-8.1); el backend obtiene al miembro del JWT. */
export async function cancelMyReservation(
  reservationId: number,
): Promise<ClassServiceResult<ClassReservation>> {
  try {
    const res = await apiFetch(`classes/reservations/${reservationId}/cancel`, {
      method: "PATCH",
    });
    if (!res.ok) {
      const { message } = await readErrorPayload(res);
      return { ok: false, error: message, status: res.status };
    }
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      return { ok: false, error: UNEXPECTED_RESPONSE_MESSAGE, status: res.status };
    }
    if (!isValidReservationShape(payload)) {
      return { ok: false, error: UNEXPECTED_RESPONSE_MESSAGE, status: res.status };
    }
    return { ok: true, data: payload, status: res.status };
  } catch (err) {
    return mapCaughtError(err, "No se pudo cancelar la reserva. Verifica tu conexión.");
  }
}

/**
 * Programa una nueva clase grupal (H06 / SCRUM-74).
 * Si hay conflicto (HTTP 409) o error de validación (HTTP 400), devuelve el mensaje para el formulario.
 */
export async function createClass(
  input: CreateClassInput,
): Promise<ClassServiceResult<GymClass>> {
  try {
    const res = await apiFetch("classes", {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const error = await parseErrorMessage(res);
      return { ok: false, error, status: res.status };
    }

    const data = (await res.json()) as GymClass;
    return { ok: true, data, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
    return { ok: false, error: message, status: 500 };
  }
}

/**
 * Edita los datos o cupo de una clase grupal programada (H06 / SCRUM-74).
 * En caso de conflicto HTTP 409 (ej. cupo menor a reservas confirmadas o cruce), conserva el mensaje.
 */
export async function updateClass(
  classId: number,
  input: UpdateClassInput,
): Promise<ClassServiceResult<GymClass>> {
  try {
    const res = await apiFetch(`classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const error = await parseErrorMessage(res);
      return { ok: false, error, status: res.status };
    }

    const data = (await res.json()) as GymClass;
    return { ok: true, data, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
    return { ok: false, error: message, status: 500 };
  }
}

/**
 * Obtiene el listado de entrenadores activos disponibles en el sistema.
 */
export async function fetchTrainers(): Promise<TrainerOption[]> {
  try {
    const res = await apiFetch("staff?page=1&pageSize=100");
    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as {
      data?: Array<{ id: string; fullName: string; email: string; role: string; isActive?: boolean }>;
    };

    if (!json || !Array.isArray(json.data)) {
      return [];
    }

    return json.data
      .filter((u) => u.role === "TRAINER" && u.isActive !== false)
      .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email }));
  } catch {
    return [];
  }
}
