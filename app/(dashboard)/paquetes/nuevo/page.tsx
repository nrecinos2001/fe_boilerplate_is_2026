import type { Metadata } from "next";
import RegisterPackageForm from "@/app/components/paquetes/RegisterPackageForm";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";
import { displayName } from "@/lib/paquetes";

export const metadata: Metadata = {
  title: "Registrar llegada de paquete",
};

export default async function NuevoPaquetePage() {
  const user = await getCurrentUser();

  if (user?.role !== "SEGURIDAD") {
    return <AccessDenied />;
  }

  return <RegisterPackageForm guardName={displayName(user.email)} />;
}
