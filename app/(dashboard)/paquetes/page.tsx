import type { Metadata } from "next";
import PendingPackages from "@/app/components/paquetes/PendingPackages";
import MyPackages from "@/app/components/paquetes/MyPackages";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";
import { displayName } from "@/lib/paquetes";

export const metadata: Metadata = {
  title: "Paquetes",
};

export default async function PaquetesPage({
  searchParams,
}: {
  searchParams: Promise<{ entregado?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (user?.role === "RESIDENTE") {
    return (
      <MyPackages
        residentName={displayName(user.email)}
        unitCode={user.unit?.code ?? null}
      />
    );
  }
  if (user?.role !== "SEGURIDAD") {
    return <AccessDenied />;
  }

  const { entregado } = await searchParams;
  return (
    <PendingPackages
      deliveredFolio={typeof entregado === "string" ? entregado : null}
    />
  );
}
