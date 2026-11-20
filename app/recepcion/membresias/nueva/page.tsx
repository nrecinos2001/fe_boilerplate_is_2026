import type { Metadata } from "next";
import { RoleGate } from "@/src/components/auth/role-gate";
import { MembershipSale } from "@/src/components/membership-sales/membership-sale";

export const metadata: Metadata = {
  title: "Vender membresía",
};

/** H04 · FE-4.1. Venta de membresías y clases sueltas (Recepción y Administrador). */
export default function SellMembershipPage() {
  return (
    <RoleGate roles={["RECEPTION", "ADMIN"]}>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <main className="w-full max-w-lg rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold">Vender membresía</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Registra la compra o renovación de una membresía, que queda pendiente de pago, o vende
            una clase suelta de hoy cobrándola en el momento.
          </p>
          <MembershipSale />
        </main>
      </div>
    </RoleGate>
  );
}
