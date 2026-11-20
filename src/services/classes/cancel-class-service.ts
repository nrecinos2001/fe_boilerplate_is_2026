import { apiFetch } from "@/src/services/http/api-client";
import type { ClassServiceResult } from "@/src/types/classes";

export interface CancelClassResult {
  reservationsCancelled: number;
  noticesSent: number;
}

export async function cancelClass(
  classId: number,
  reason: string,
): Promise<ClassServiceResult<CancelClassResult>> {
  try {
    const res = await apiFetch(`classes/${classId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      let error = `No se pudo cancelar la clase (${res.status}).`;
      try {
        const payload = (await res.json()) as { message?: string | string[] };
        if (Array.isArray(payload.message)) error = payload.message.join(" ");
        else if (typeof payload.message === "string") error = payload.message;
      } catch {
        // Se conserva el mensaje de error por código HTTP.
      }
      return { ok: false, error, status: res.status };
    }
    return {
      ok: true,
      data: (await res.json()) as CancelClassResult,
      status: res.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo cancelar la clase.",
      status: 500,
    };
  }
}
