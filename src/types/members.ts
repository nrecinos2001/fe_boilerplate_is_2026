// Contrato de inscripción de miembros con el backend (BE-1.1).

export type Sex = "M" | "F";

export const SEX_LABELS: Record<Sex, string> = {
  M: "Masculino",
  F: "Femenino",
};

/** Cuerpo de POST /members. El rol lo asigna el servidor: nunca se envía. */
export type EnrollMemberInput = {
  fullName: string;
  sex: Sex;
  /** Fecha solo-día, AAAA-MM-DD. */
  birthDate: string;
  email: string;
};

/** Respuesta 201 de POST /members (MemberResponseDto). */
export type EnrolledMember = {
  id: string;
  memberCode: string;
  fullName: string;
  enrolledAt: string;
  temporaryPassword: string;
};
