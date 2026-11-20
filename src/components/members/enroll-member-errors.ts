import { EMAIL_TAKEN_MESSAGE } from "@/src/services/members/members-service";
import { FUTURE_BIRTH_DATE_MESSAGE, type EnrollMemberErrors } from "./enroll-member-logic";

export type PlacedEnrollError = {
  /** Errores que se muestran bajo su campo. */
  fieldErrors: EnrollMemberErrors;
  /** Mensaje general bajo el formulario, o null si ya quedó en un campo. */
  message: string | null;
};

/**
 * Ubica el error del servidor: el correo repetido (409) y la fecha futura (400)
 * van bajo su campo; el resto (403, 500, sin conexión) queda como mensaje general.
 */
export function applyEnrollError(result: { status: number; error: string }): PlacedEnrollError {
  if (result.status === 409) {
    return { fieldErrors: { email: EMAIL_TAKEN_MESSAGE }, message: null };
  }
  if (result.status === 400 && result.error.includes(FUTURE_BIRTH_DATE_MESSAGE)) {
    return { fieldErrors: { birthDate: FUTURE_BIRTH_DATE_MESSAGE }, message: null };
  }
  return { fieldErrors: {}, message: result.error };
}
