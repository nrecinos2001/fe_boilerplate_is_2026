// Reglas de la pantalla de cambio de contraseña (FE-1.2). Son las mismas que
// valida el servidor en ChangePasswordDto; aquí solo evitan enviar algo que el
// servidor va a rechazar.

export type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordValues, string>>;

export const EMPTY_CHANGE_PASSWORD: ChangePasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export const PASSWORD_UPDATED_MESSAGE = "Tu contraseña se actualizó.";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export function validateChangePassword(values: ChangePasswordValues): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Ingresa tu contraseña actual.";
  }

  const next = values.newPassword;
  if (next.length < 8 || next.length > 72) {
    errors.newPassword = "La contraseña debe tener de 8 a 72 caracteres.";
  } else if (!PASSWORD_RULE.test(next)) {
    errors.newPassword = "La contraseña debe incluir minúscula, mayúscula y número.";
  } else if (next === values.currentPassword) {
    errors.newPassword = "La nueva contraseña debe ser distinta de la actual.";
  }

  if (values.confirmPassword !== next) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
