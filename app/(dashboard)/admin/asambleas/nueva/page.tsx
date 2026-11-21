import type { Metadata } from "next";
import AssemblyForm from "@/app/components/asambleas/AssemblyForm";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Convocar asamblea",
};

export default async function NuevaAsambleaPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMINISTRADOR") {
    return <AccessDenied message="Solo la administración puede convocar asambleas." />;
  }
  return <AssemblyForm />;
}
