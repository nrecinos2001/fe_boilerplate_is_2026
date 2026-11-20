import type { Metadata } from "next";
import { ChangePasswordForm } from "@/src/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
};

/**
 * H01 · FE-1.2. Primer inicio de sesión con contraseña temporal.
 * El AuthProvider trae aquí a quien tenga mustChangePassword en true y saca a
 * quien no lo tenga.
 */
export default function ChangePasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <main className="w-full max-w-sm rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
        <h1 className="mb-2 text-2xl font-semibold">Cambia tu contraseña</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Estás usando una contraseña temporal. Crea una nueva para continuar.
        </p>
        <ChangePasswordForm />
      </main>
    </div>
  );
}
