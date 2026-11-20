import type { Metadata } from "next";
import { RoleGate } from "@/src/components/auth/role-gate";
import { RegisterPaymentForm } from "@/src/components/payments/register-payment-form";

export const metadata: Metadata = {
  title: "Registrar pago",
};

/** H15 · FE-15.1 y FE-15.2. Cobro en recepción (Recepción y Administrador). */
export default function RegisterPaymentPage() {
  return (
    <RoleGate roles={["RECEPTION", "ADMIN"]}>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <main className="w-full max-w-lg rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold">Registrar pago</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Busca al miembro, elige el cobro pendiente y el método de pago.
          </p>
          <RegisterPaymentForm />
        </main>
      </div>
    </RoleGate>
  );
}
