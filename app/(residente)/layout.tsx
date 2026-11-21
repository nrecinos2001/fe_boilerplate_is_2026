import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ResidenteShell } from "@/components/residente/shell";

// Todo lo que viva dentro de app/(residente)/ exige sesión y usa el menú lateral
// y el encabezado con la campana de notificaciones.
export default async function ResidenteLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await getSession())) {
    redirect("/login");
  }
  return <ResidenteShell>{children}</ResidenteShell>;
}
