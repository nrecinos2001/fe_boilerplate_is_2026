import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import { apiFetch } from "@/src/services/http/api-client";
import { readErrorMessage } from "@/src/services/http/error-message";
import type { EnrolledMember, EnrollMemberInput } from "@/src/types/members";
import type { MemberSearchItem } from "@/src/types/membership-sales";
import type { ServiceResult } from "@/src/types/service-result";

export const EMAIL_TAKEN_MESSAGE = "Ese correo ya está registrado.";
export const ENROLL_SERVER_ERROR = "No pudimos inscribir al miembro. Intenta de nuevo.";

/**
 * POST /members (BE-1.1, Recepción y Administrador).
 *
 * - 201: devuelve el código de miembro y la contraseña temporal.
 * - 400: devuelve el motivo del servidor (p. ej. fecha de nacimiento futura).
 * - 403: el rol no puede inscribir.
 * - 409: el correo ya está registrado.
 */
export async function enrollMember(
  input: EnrollMemberInput,
): Promise<ServiceResult<EnrolledMember>> {
  try {
    const res = await apiFetch("members", {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (res.status === 201) {
      return { ok: true, data: (await res.json()) as EnrolledMember, status: 201 };
    }
    if (res.status === 409) return { ok: false, error: EMAIL_TAKEN_MESSAGE, status: 409 };
    if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
    if (res.status === 400) {
      const error = (await readErrorMessage(res)) ?? ENROLL_SERVER_ERROR;
      return { ok: false, error, status: 400 };
    }
    return { ok: false, error: ENROLL_SERVER_ERROR, status: res.status };
  } catch {
    return { ok: false, error: ENROLL_SERVER_ERROR, status: 0 };
  }
}

export const SEARCH_MEMBERS_ERROR = "No pudimos buscar miembros. Intenta de nuevo.";

/**
 * GET /members?q= (Recepción y Administrador): miembros activos por código
 * exacto o parte del nombre, máximo 10.
 */
export async function searchMembers(q: string): Promise<ServiceResult<MemberSearchItem[]>> {
  try {
    const res = await apiFetch(`members?${new URLSearchParams({ q: q.trim() }).toString()}`);
    if (!res.ok) {
      const error = res.status === 403 ? ACCESS_DENIED_MESSAGE : SEARCH_MEMBERS_ERROR;
      return { ok: false, error, status: res.status };
    }
    const body = (await res.json()) as { data: MemberSearchItem[] };
    return { ok: true, data: body.data, status: res.status };
  } catch {
    return { ok: false, error: SEARCH_MEMBERS_ERROR, status: 0 };
  }
}
