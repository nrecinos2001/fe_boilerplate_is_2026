import { buildTrainerSlotsRange, MS_PER_DAY, TRAINER_SLOTS_RANGE_DAYS } from "@/src/lib/gym-datetime";
import { apiFetch, SessionExpiredError } from "@/src/services/http/api-client";
import type {
  CreatePersonalSessionInput,
  PersonalSession,
  PersonalSessionErrorCode,
  PersonalSessionServiceResult,
  SessionPricingResponse,
  TrainerSlot,
  TrainerSlotsResponse,
  TrainerSummary,
} from "@/src/types/personal-sessions";

interface BackendErrorPayload {
  message?: string | string[];
  error?: string;
}

const UNEXPECTED_RESPONSE_MESSAGE = "La respuesta del servidor tuvo un formato inesperado.";
const SLOT_TAKEN_MESSAGE = "Ese horario ya fue tomado.";
const MIN_ADVANCE_MESSAGE = "Las sesiones se agendan con al menos 12 horas de anticipación.";
const PRICING_UNAVAILABLE_MESSAGE =
  "Aún no se puede agendar porque el precio de la sesión personal no está configurado.";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidTrainerSummary(value: unknown): value is TrainerSummary {
  if (!isObjectRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.fullName === "string" &&
    typeof value.email === "string"
  );
}

function isValidTrainerSlot(value: unknown): value is TrainerSlot {
  if (!isObjectRecord(value)) return false;
  return (
    typeof value.availabilityBlockId === "string" &&
    typeof value.date === "string" &&
    typeof value.startTime === "string" &&
    typeof value.endTime === "string" &&
    typeof value.startsAt === "string" &&
    typeof value.endsAt === "string"
  );
}

function isValidPersonalSession(value: unknown): value is PersonalSession {
  if (!isObjectRecord(value)) return false;
  const validStatus =
    value.status === "SCHEDULED" ||
    value.status === "CANCELLED" ||
    value.status === "COMPLETED";
  const validChargeStatus =
    value.chargeStatus === null ||
    value.chargeStatus === "PENDING" ||
    value.chargeStatus === "PAID";
  const validPrice = value.price === null || typeof value.price === "number";
  const validChargeId = value.chargeId === null || typeof value.chargeId === "number";

  return (
    typeof value.id === "number" &&
    typeof value.trainerId === "string" &&
    isValidTrainerSummary(value.trainer) &&
    typeof value.startsAt === "string" &&
    typeof value.endsAt === "string" &&
    validPrice &&
    validChargeId &&
    validChargeStatus &&
    validStatus &&
    typeof value.createdAt === "string"
  );
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as BackendErrorPayload;
    if (isObjectRecord(data)) {
      if (Array.isArray(data.message) && data.message.length > 0) {
        return data.message.join(" ");
      }
      if (typeof data.message === "string" && data.message.trim().length > 0) {
        return data.message;
      }
      if (typeof data.error === "string" && data.error.trim().length > 0) {
        return data.error;
      }
    }
  } catch {
    // Usar fallback si el cuerpo no es JSON válido
  }
  return `Error en la solicitud (${res.status}).`;
}

function classifyBookingError(
  status: number,
  message: string,
): { code: PersonalSessionErrorCode; message: string } {
  if (status === 409) {
    return {
      code: "SLOT_ALREADY_TAKEN",
      message: message.includes("tomado") ? SLOT_TAKEN_MESSAGE : message,
    };
  }

  if (status === 503) {
    return {
      code: "PRICING_UNAVAILABLE",
      message: PRICING_UNAVAILABLE_MESSAGE,
    };
  }

  if (status === 400) {
    const normalized = message.toLowerCase();
    if (normalized.includes("12 horas")) {
      return {
        code: "MIN_ADVANCE_REQUIRED",
        message: MIN_ADVANCE_MESSAGE,
      };
    }
    if (normalized.includes("60 minutos") || normalized.includes("espacio libre")) {
      return {
        code: "SLOT_NOT_AVAILABLE",
        message,
      };
    }
    if (normalized.includes("rol trainer")) {
      return {
        code: "INVALID_TRAINER",
        message,
      };
    }
  }

  if (status === 404) {
    return { code: "TRAINER_NOT_FOUND", message };
  }

  return { code: "UNKNOWN", message };
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function mapCaughtError<T>(
  err: unknown,
  fallbackMessage: string,
): PersonalSessionServiceResult<T> {
  if (isAbortError(err)) {
    return {
      ok: false,
      aborted: true,
      code: "ABORTED",
    };
  }
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
 * Obtiene la lista de entrenadores activos para sesiones personales (`GET /api/v1/trainers`).
 */
export async function fetchActiveTrainers(): Promise<
  PersonalSessionServiceResult<TrainerSummary[]>
> {
  try {
    const res = await apiFetch("trainers");
    if (!res.ok) {
      const error = await readErrorMessage(res);
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
      !payload.data.every(isValidTrainerSummary)
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
    return mapCaughtError(err, "No se pudieron cargar los entrenadores.");
  }
}

export interface FetchTrainerSlotsOptions {
  from?: Date;
  to?: Date;
  now?: Date;
  signal?: AbortSignal;
}

/**
 * Consulta los espacios libres de 60 minutos de un entrenador para un máximo de 14 días.
 */
export async function fetchTrainerSlots(
  trainerId: string,
  options: FetchTrainerSlotsOptions = {},
): Promise<PersonalSessionServiceResult<TrainerSlotsResponse>> {
  try {
    const defaults = buildTrainerSlotsRange(options.now);
    const from = options.from ?? defaults.from;
    const rawTo = options.to ?? defaults.to;
    const maxToMs = from.getTime() + TRAINER_SLOTS_RANGE_DAYS * MS_PER_DAY;
    const to = rawTo.getTime() > maxToMs ? new Date(maxToMs) : rawTo;

    const query = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const res = await apiFetch(`trainers/${trainerId}/slots?${query.toString()}`, {
      signal: options.signal,
    });

    if (!res.ok) {
      const error = await readErrorMessage(res);
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
      !isValidTrainerSummary(payload.trainer) ||
      typeof payload.from !== "string" ||
      typeof payload.to !== "string" ||
      !Array.isArray(payload.slots) ||
      !payload.slots.every(isValidTrainerSlot)
    ) {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    return {
      ok: true,
      data: {
        trainer: payload.trainer,
        from: payload.from,
        to: payload.to,
        slots: payload.slots,
      },
      status: res.status,
    };
  } catch (err) {
    return mapCaughtError(err, "No se pudieron cargar los horarios disponibles.");
  }
}

/**
 * Consulta la tarifa vigente de sesión personal (`GET /api/v1/personal-sessions/pricing`).
 */
export async function fetchSessionPricing(): Promise<
  PersonalSessionServiceResult<SessionPricingResponse>
> {
  try {
    const res = await apiFetch("personal-sessions/pricing");
    if (!res.ok) {
      const error = await readErrorMessage(res);
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
      typeof payload.configured !== "boolean" ||
      !(payload.price === null || typeof payload.price === "number")
    ) {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    return {
      ok: true,
      data: {
        configured: payload.configured,
        price: payload.price,
      },
      status: res.status,
    };
  } catch (err) {
    return mapCaughtError(err, "No se pudo consultar la tarifa de sesiones personales.");
  }
}

/**
 * Agenda una sesión personal de 60 minutos (`POST /api/v1/personal-sessions`).
 * Envía únicamente `{ trainerId, startsAt }`: el backend asigna `memberId`, `price` y `chargeId`.
 */
export async function bookPersonalSession(
  input: CreatePersonalSessionInput,
): Promise<PersonalSessionServiceResult<PersonalSession>> {
  try {
    const res = await apiFetch("personal-sessions", {
      method: "POST",
      body: JSON.stringify({
        trainerId: input.trainerId,
        startsAt: input.startsAt,
      }),
    });

    if (!res.ok) {
      const rawMessage = await readErrorMessage(res);
      const mapped = classifyBookingError(res.status, rawMessage);
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

    if (!isValidPersonalSession(payload)) {
      return {
        ok: false,
        error: UNEXPECTED_RESPONSE_MESSAGE,
        status: res.status,
        code: "UNEXPECTED_RESPONSE",
      };
    }

    return { ok: true, data: payload, status: res.status };
  } catch (err) {
    return mapCaughtError(err, "No se pudo agendar la sesión personal.");
  }
}

/**
 * Lista las sesiones personales del miembro autenticado (`GET /api/v1/personal-sessions/me`).
 */
export async function fetchMyPersonalSessions(): Promise<
  PersonalSessionServiceResult<PersonalSession[]>
> {
  try {
    const res = await apiFetch("personal-sessions/me");
    if (!res.ok) {
      const error = await readErrorMessage(res);
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
      !payload.data.every(isValidPersonalSession)
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
    return mapCaughtError(err, "No se pudieron cargar tus sesiones personales.");
  }
}
