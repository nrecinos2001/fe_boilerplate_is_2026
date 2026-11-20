import type { Metadata } from "next";
import { RoleGate } from "@/src/components/auth/role-gate";
import { EnrollMemberForm } from "@/src/components/members/enroll-member-form";

export const metadata: Metadata = {
  title: "Inscribir miembro",
};

/** H01 · FE-1.1. Inscripción de un miembro nuevo (Recepción y Administrador). */
export default function EnrollMemberPage() {
  return (
    <RoleGate roles={["RECEPTION", "ADMIN"]}>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <main className="w-full max-w-lg rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold">Inscribir miembro</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Al inscribirlo verás su código de miembro y una contraseña temporal para entregarle.
          </p>
          <EnrollMemberForm />
        </main>
      </div>
    </RoleGate>
  );
}
