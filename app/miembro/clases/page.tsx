import type { Metadata } from "next";
import { MemberClassesView } from "@/src/components/classes/member-classes-view";
import { MemberRoleGuard } from "@/src/components/member/member-role-guard";

export const metadata: Metadata = {
  title: "Calendario de clases · GymHub",
  description: "Consulta las clases grupales disponibles en los próximos 7 días y reserva tu cupo.",
};

export default function MemberClassesPage() {
  return (
    <MemberRoleGuard>
      <MemberClassesView />
    </MemberRoleGuard>
  );
}
