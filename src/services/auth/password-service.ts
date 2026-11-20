import { apiFetch } from "@/src/services/http/api-client";
import { readErrorMessage } from "@/src/services/http/error-message";
import type { ServiceResult } from "@/src/types/service-result";

export const WRONG_CURRENT_PASSWORD_MESSAGE = "La contraseña actual no es correcta.";
export const CHANGE_PASSWORD_SERVER_ERROR = "No pudimos cambiar tu contraseña. Intenta de nuevo.";

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

/**
 * PATCH /auth/password (BE-1.2). Responde 204 sin cuerpo.
 *
 * El 400 trae el motivo del servidor (contraseña actual incorrecta, nueva igual
 * a la actual o que no cumple las reglas); si no trae uno legible, se asume que
 * la contraseña actual no coincide.
 */
export async function changePassword(input: ChangePasswordInput): Promise<ServiceResult<null>> {
  try {
    const res = await apiFetch("auth/password", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    if (res.status === 204) return { ok: true, data: null, status: 204 };
    if (res.status === 400) {
      const error = (await readErrorMessage(res)) ?? WRONG_CURRENT_PASSWORD_MESSAGE;
      return { ok: false, error, status: 400 };
    }
    return { ok: false, error: CHANGE_PASSWORD_SERVER_ERROR, status: res.status };
  } catch {
    return { ok: false, error: CHANGE_PASSWORD_SERVER_ERROR, status: 0 };
  }
}
