import { apiFetch } from "@/src/services/http/api-client";
import { parseErrorMessage } from "@/src/services/http/parse-error";
import type {
  AvailabilityBlock,
  CreateAvailabilityBlockInput,
  ServiceResult,
} from "@/src/types/availability";

const CONNECTION_ERROR = "Error al conectar con el servidor.";

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : CONNECTION_ERROR;
}

/** Bloques de disponibilidad del entrenador autenticado (GET /availability-blocks). */
export async function fetchAvailabilityBlocks(): Promise<ServiceResult<AvailabilityBlock[]>> {
  try {
    const res = await apiFetch("availability-blocks");
    if (!res.ok) {
      return { ok: false, error: await parseErrorMessage(res), status: res.status };
    }
    return { ok: true, data: (await res.json()) as AvailabilityBlock[], status: res.status };
  } catch (err) {
    return { ok: false, error: messageOf(err), status: 500 };
  }
}

/** Crea un bloque. 409 = cruce con otro bloque del mismo día; 400 = validación. */
export async function createAvailabilityBlock(
  input: CreateAvailabilityBlockInput,
): Promise<ServiceResult<AvailabilityBlock>> {
  try {
    const res = await apiFetch("availability-blocks", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return { ok: false, error: await parseErrorMessage(res), status: res.status };
    }
    return { ok: true, data: (await res.json()) as AvailabilityBlock, status: res.status };
  } catch (err) {
    return { ok: false, error: messageOf(err), status: 500 };
  }
}

/** Elimina un bloque. 409 = tiene sesiones agendadas; 404 = no existe o no es del usuario. */
export async function deleteAvailabilityBlock(blockId: string): Promise<ServiceResult<null>> {
  try {
    const res = await apiFetch(`availability-blocks/${encodeURIComponent(blockId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      return { ok: false, error: await parseErrorMessage(res), status: res.status };
    }
    return { ok: true, data: null, status: res.status };
  } catch (err) {
    return { ok: false, error: messageOf(err), status: 500 };
  }
}
