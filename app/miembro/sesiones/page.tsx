import type { Metadata } from "next";
import { MemberRoleGuard } from "@/src/components/member/member-role-guard";
import { MySessionsView } from "@/src/components/trainers/my-sessions-view";

export const metadata: Metadata = {
  title: "Mis sesiones · GymHub",
  description: "Consulta tus sesiones personales agendadas y el estado de sus cobros.",
};

export default function MySessionsPage() {
  return (
    <MemberRoleGuard>
      <MySessionsView />
    </MemberRoleGuard>
  );
}
