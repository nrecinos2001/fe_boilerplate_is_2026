import type { Metadata } from "next";
import { MemberRoleGuard } from "@/src/components/member/member-role-guard";
import { BookPersonalSessionView } from "@/src/components/trainers/book-personal-session-view";

export const metadata: Metadata = {
  title: "Agendar sesión personal · GymHub",
  description: "Elige un entrenador activo, consulta espacios de 60 minutos y agenda tu sesión.",
};

export default function BookPersonalSessionPage() {
  return (
    <MemberRoleGuard>
      <BookPersonalSessionView />
    </MemberRoleGuard>
  );
}
