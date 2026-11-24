import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import MisReservasClient from "./reservations-client";

export const dynamic = "force-dynamic";

type CurrentUser = { role: string };

export default async function MisReservasPage() {
  const token = await getSession();
  if (!token) redirect("/login");

  const api = process.env.API_URL?.replace(/\/+$/, "");
  if (!api) throw new Error("API_URL no está configurada.");

  const response = await fetch(`${api}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("No se pudo verificar la sesión del usuario.");

  const user: CurrentUser = await response.json();
  if (user.role !== "CLIENTE") redirect("/");

  return <MisReservasClient />;
}
