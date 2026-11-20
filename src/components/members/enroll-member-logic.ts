import type { EnrollMemberInput, Sex } from "@/src/types/members";

// Reglas del formulario de inscripción (FE-1.1). Coinciden con CreateMemberDto
// del backend, que las vuelve a validar.

export type EnrollMemberValues = {
  fullName: string;
  sex: Sex | "";
  birthDate: string;
  email: string;
};

export type EnrollMemberErrors = Partial<Record<keyof EnrollMemberValues, string>>;

export const EMPTY_ENROLLMENT: EnrollMemberValues = {
  fullName: "",
  sex: "",
  birthDate: "",
  email: "",
};

export const FUTURE_BIRTH_DATE_MESSAGE = "La fecha de nacimiento no puede ser futura.";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha local de hoy en AAAA-MM-DD, el formato de un <input type="date">. */
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function validateEnrollment(
  values: EnrollMemberValues,
  today: string = todayIsoDate(),
): EnrollMemberErrors {
  const errors: EnrollMemberErrors = {};

  const name = values.fullName.trim();
  if (name.length < 3 || name.length > 100) {
    errors.fullName = "El nombre debe tener de 3 a 100 caracteres.";
  }

  if (values.sex !== "M" && values.sex !== "F") {
    errors.sex = "Selecciona el sexo.";
  }

  if (!ISO_DATE.test(values.birthDate)) {
    errors.birthDate = "Ingresa la fecha de nacimiento.";
  } else if (values.birthDate > today) {
    // Las fechas AAAA-MM-DD se pueden comparar como texto.
    errors.birthDate = FUTURE_BIRTH_DATE_MESSAGE;
  }

  const email = values.email.trim();
  if (!EMAIL_REGEX.test(email)) {
    errors.email = "Ingresa un correo válido.";
  } else if (email.length > 120) {
    errors.email = "El correo no puede superar los 120 caracteres.";
  }

  return errors;
}

/** Convierte valores ya validados en el cuerpo de POST /members. */
export function toEnrollMemberInput(values: EnrollMemberValues): EnrollMemberInput {
  return {
    fullName: values.fullName.trim(),
    sex: values.sex as Sex,
    birthDate: values.birthDate,
    email: values.email.trim().toLowerCase(),
  };
}
