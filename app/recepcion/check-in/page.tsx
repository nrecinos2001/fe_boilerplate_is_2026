import type { Metadata } from "next";
import { RoleGate } from "@/src/components/auth/role-gate";
import { CheckInScreen } from "@/src/components/check-in/check-in-screen";

export const metadata: Metadata = {
  title: "Check-in",
};

/** H13 · FE-13.1. Registro de ingresos en recepción (Recepción y Administrador). */
export default function CheckInPage() {
  return (
    <RoleGate roles={["RECEPTION", "ADMIN"]}>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <main className="w-full max-w-lg rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold">Check-in</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Busca al miembro por su código o su nombre y registra su ingreso.
          </p>
          <CheckInScreen />
        </main>
      </div>
    </RoleGate>
  );
}
