import type { Metadata } from "next";
import { MyReservationsView } from "@/src/components/classes/my-reservations-view";
import { MemberRoleGuard } from "@/src/components/member/member-role-guard";

export const metadata: Metadata = {
  title: "Mis reservas · GymHub",
  description: "Consulta tus reservas próximas y pasadas en clases grupales.",
};

export default function MyReservationsPage() {
  return (
    <MemberRoleGuard>
      <MyReservationsView />
    </MemberRoleGuard>
  );
}
