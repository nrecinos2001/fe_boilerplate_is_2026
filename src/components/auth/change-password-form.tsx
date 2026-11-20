"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { renewSessionAfterPasswordChange } from "@/app/actions/auth";
import { roleHomePath } from "@/src/lib/role-home";
import { changePassword } from "@/src/services/auth/password-service";
import { useAuthStore } from "@/src/stores/useAuthStore";
import type { ClientSession } from "@/src/types/auth";
import {
  EMPTY_CHANGE_PASSWORD,
  PASSWORD_UPDATED_MESSAGE,
  hasErrors,
  validateChangePassword,
  type ChangePasswordErrors,
  type ChangePasswordValues,
} from "./change-password-logic";
import { ChangePasswordFormView } from "./change-password-form-view";

// Tiempo que se muestra "Tu contraseña se actualizó." antes de ir al inicio.
const SUCCESS_DELAY_MS = 1500;

export function ChangePasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState<ChangePasswordValues>(EMPTY_CHANGE_PASSWORD);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleChange(field: keyof ChangePasswordValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }

  async function handleSubmit() {
    const found = validateChangePassword(values);
    setErrors(found);
    if (hasErrors(found)) return;

    const user = useAuthStore.getState().user;
    if (!user) return;

    setSubmitting(true);
    setServerError(null);
    const result = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });

    if (!result.ok) {
      setSubmitting(false);
      setServerError(result.error);
      return;
    }

    // El backend revocó todas las sesiones: se abre una nueva con la contraseña
    // nueva para que recargar la página no saque al usuario.
    const session = await renewSessionAfterPasswordChange(user.email, values.newPassword).catch(
      () => null,
    );

    setSubmitting(false);
    setValues(EMPTY_CHANGE_PASSWORD);
    setSuccess(PASSWORD_UPDATED_MESSAGE);

    // El store se actualiza al final: en cuanto mustChangePassword pasa a false,
    // el AuthProvider saca al usuario de esta pantalla.
    timer.current = setTimeout(() => finish(session, user.role), SUCCESS_DELAY_MS);
  }

  function finish(session: ClientSession | null, role: ClientSession["user"]["role"]) {
    const store = useAuthStore.getState();
    if (session) store.setSession(session);
    else store.markPasswordChanged();
    router.replace(roleHomePath(session?.user.role ?? role));
  }

  return (
    <ChangePasswordFormView
      values={values}
      errors={errors}
      submitting={submitting}
      serverError={serverError}
      success={success}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
