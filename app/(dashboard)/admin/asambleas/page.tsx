import type { Metadata } from "next";
import AssemblyList from "@/app/components/asambleas/AssemblyList";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Asambleas",
};

const ADMIN_ONLY = "La gestión de asambleas solo está disponible para la administración.";

export default async function AsambleasPage({
  searchParams,
}: {
  searchParams: Promise<{ guardada?: string | string[]; publicada?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMINISTRADOR") return <AccessDenied message={ADMIN_ONLY} />;

  const { guardada, publicada } = await searchParams;
  return (
    <AssemblyList
      savedFolio={typeof guardada === "string" ? guardada : null}
      publishedFolio={typeof publicada === "string" ? publicada : null}
    />
  );
}
