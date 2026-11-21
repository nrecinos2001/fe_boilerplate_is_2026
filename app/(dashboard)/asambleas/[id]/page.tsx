import type { Metadata } from "next";
import ResidentAssemblyDetail from "@/app/components/asambleas/ResidentAssemblyDetail";
import { getCurrentUser } from "@/lib/current-user";
import { displayName } from "@/lib/paquetes";

export const metadata: Metadata = {
  title: "Detalle de la asamblea",
};

export default async function AsambleaResidentePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  return (
    <ResidentAssemblyDetail
      assemblyId={id}
      voter={{
        canVote: user?.role === "RESIDENTE" && Boolean(user.unit),
        unitCode: user?.unit?.code ?? null,
        name: user ? displayName(user.email) : "",
      }}
    />
  );
}
