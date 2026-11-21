import type { Metadata } from "next";
import PackageDetail from "@/app/components/paquetes/PackageDetail";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Detalle del paquete",
};

export default async function DetallePaquetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (user?.role !== "RESIDENTE") {
    return <AccessDenied />;
  }

  const { id } = await params;
  return <PackageDetail packageId={id} />;
}
