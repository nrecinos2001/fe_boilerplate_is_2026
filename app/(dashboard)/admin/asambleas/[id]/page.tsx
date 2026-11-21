import type { Metadata } from "next";
import AssemblyDetail from "@/app/components/asambleas/AssemblyDetail";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Convocatoria",
};

export default async function AsambleaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMINISTRADOR") {
    return <AccessDenied message="La gestión de asambleas solo está disponible para la administración." />;
  }
  const { id } = await params;
  return <AssemblyDetail assemblyId={id} />;
}
