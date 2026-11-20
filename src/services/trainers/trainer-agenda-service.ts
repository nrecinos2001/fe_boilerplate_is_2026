import { apiFetch, SessionExpiredError } from "@/src/services/http/api-client";
import type { TrainerAgendaResult, TrainerAgendaSession, TrainerSessionOutcome } from "@/src/types/trainer-agenda";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validSession(value: unknown): value is TrainerAgendaSession {
  if (!record(value) || !record(value.member)) return false;
  return typeof value.id === "number" &&
    typeof value.startsAt === "string" &&
    typeof value.endsAt === "string" &&
    typeof value.member.id === "string" &&
    typeof value.member.fullName === "string" &&
    (value.chargeStatus === null || value.chargeStatus === "PENDING" || value.chargeStatus === "PAID") &&
    (value.status === "SCHEDULED" || value.status === "COMPLETED") &&
    (value.outcome === null || value.outcome === "COMPLETED" || value.outcome === "NO_SHOW") &&
    (value.resultRecordedAt === null || typeof value.resultRecordedAt === "string");
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json() as unknown;
    if (record(data) && typeof data.message === "string") return data.message;
  } catch { /* usar estado HTTP */ }
  return `Error en la solicitud (${response.status}).`;
}

function caught<T>(error: unknown): TrainerAgendaResult<T> {
  if (error instanceof SessionExpiredError) {
    return { ok: false, error: error.message, status: 401, sessionExpired: true };
  }
  return { ok: false, error: error instanceof Error ? error.message : "No se pudo conectar con el servidor." };
}

export async function fetchTrainerAgenda(): Promise<TrainerAgendaResult<TrainerAgendaSession[]>> {
  try {
    const response = await apiFetch("personal-sessions/trainer/me");
    if (!response.ok) return { ok: false, status: response.status, error: await errorMessage(response) };
    const payload = await response.json() as unknown;
    if (!record(payload) || !Array.isArray(payload.data) || !payload.data.every(validSession)) {
      return { ok: false, error: "La respuesta del servidor tuvo un formato inesperado." };
    }
    return { ok: true, data: payload.data };
  } catch (error) { return caught(error); }
}

export async function markTrainerSessionResult(
  sessionId: number,
  outcome: TrainerSessionOutcome,
): Promise<TrainerAgendaResult<TrainerAgendaSession>> {
  try {
    const response = await apiFetch(`personal-sessions/trainer/me/${sessionId}/result`, {
      method: "PATCH",
      body: JSON.stringify({ outcome }),
    });
    if (!response.ok) return { ok: false, status: response.status, error: await errorMessage(response) };
    const payload = await response.json() as unknown;
    if (!validSession(payload)) return { ok: false, error: "La respuesta del servidor tuvo un formato inesperado." };
    return { ok: true, data: payload };
  } catch (error) { return caught(error); }
}
