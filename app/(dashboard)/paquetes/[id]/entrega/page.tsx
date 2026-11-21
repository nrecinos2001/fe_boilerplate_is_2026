import type { Metadata } from "next";
import DeliverPackage from "@/app/components/paquetes/DeliverPackage";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";
import { displayName } from "@/lib/paquetes";

export const metadata: Metadata = {
  title: "Entrega de paquete",
};

export default async function EntregaPaquetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (user?.role !== "SEGURIDAD") {
    return <AccessDenied />;
  }

  const { id } = await params;
  return <DeliverPackage packageId={id} guardName={displayName(user.email)} />;
}
