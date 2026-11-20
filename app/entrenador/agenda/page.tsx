import type { Metadata } from "next";
import { TrainerRoleGuard } from "@/src/components/trainers/trainer-role-guard";
import { TrainerAgendaView } from "@/src/components/trainers/trainer-agenda-view";

export const metadata: Metadata = {
  title: "Mi agenda · GymHub",
  description: "Consulta tus sesiones personales y registra sus resultados.",
};

export default function TrainerAgendaPage() {
  return <TrainerRoleGuard><TrainerAgendaView /></TrainerRoleGuard>;
}
