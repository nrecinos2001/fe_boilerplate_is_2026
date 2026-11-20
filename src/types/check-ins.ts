// Contrato del check-in con el backend (H13 · BE-13.1).
import type { MembershipStatus } from "./membership";

/** Un miembro de GET /check-ins/lookup. */
export type CheckInMember = {
  memberId: string;
  memberCode: string;
  fullName: string;
  membershipStatus: MembershipStatus;
  /** AAAA-MM-DD, vencimiento de la membresía actual; null sin membresía. */
  nextPaymentDate: string | null;
};

/** Respuesta 201 de POST /check-ins. */
export type CheckInResult = {
  checkInId: number;
  memberCode: string;
  /** ISO 8601, hora del servidor. */
  checkedInAt: string;
  membershipStatus: MembershipStatus;
  isException: boolean;
};
