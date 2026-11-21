import type { Metadata } from "next";
import AssemblyResults from "@/app/components/asambleas/AssemblyResults";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Resultados y auditoría",
};

export default async function ResultadosAsambleaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMINISTRADOR") {
    return <AccessDenied message="Los resultados y la auditoría solo están disponibles para la administración." />;
  }
  const { id } = await params;
  return <AssemblyResults assemblyId={id} />;
}
