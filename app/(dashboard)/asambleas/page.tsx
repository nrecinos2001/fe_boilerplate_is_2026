import type { Metadata } from "next";
import ResidentAssemblyList from "@/app/components/asambleas/ResidentAssemblyList";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Asambleas",
};

export default async function AsambleasResidentePage() {
  const user = await getCurrentUser();
  const canVote = user?.role === "RESIDENTE" && Boolean(user.unit);

  return <ResidentAssemblyList canVote={canVote} unitCode={user?.unit?.code ?? null} />;
}
