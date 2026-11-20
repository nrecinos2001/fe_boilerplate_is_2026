import type { Metadata } from "next";
import Link from "next/link";
import { RoleGate } from "@/src/components/auth/role-gate";
import { MyPayments } from "@/src/components/payments/my-payments";

export const metadata: Metadata = {
  title: "Mis pagos · GymHub",
  description: "Consulta tus cobros pendientes, paga con tarjeta y descarga tus comprobantes.",
};

/** H16 · FE-16.1 y FE-16.2. Mis pagos del miembro. */
export default function MyPaymentsPage() {
  return (
    <RoleGate roles={["MEMBER"]}>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <main className="w-full max-w-2xl rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
          <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
            ← Volver al inicio
          </Link>
          <h1 className="mt-4 text-2xl font-semibold">Mis pagos</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Paga tus cobros pendientes con tarjeta y descarga tus comprobantes.
          </p>
          <MyPayments />
        </main>
      </div>
    </RoleGate>
  );
}
