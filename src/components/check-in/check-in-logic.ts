import { formatEndDate, GYM_TIME_ZONE, STATUS_LABELS } from "@/src/types/membership";
import type { CheckInMember } from "@/src/types/check-ins";

// Reglas de la pantalla de check-in (FE-13.1).

export const MIN_LOOKUP_LENGTH = 2;
export const LOOKUP_DEBOUNCE_MS = 400;
export const NO_MEMBERS_FOUND_MESSAGE = "No encontramos miembros con ese dato.";
export const RECENT_CHECK_IN_MESSAGE = "Este miembro ya registró su ingreso hace menos de 30 minutos.";

/** ¿Hay que buscar con lo escrito? Con menos de 2 caracteres, no. */
export function shouldLookup(term: string): boolean {
  return term.trim().length >= MIN_LOOKUP_LENGTH;
}

/** Hora del ingreso en El Salvador, HH:MM. */
export function formatCheckInTime(iso: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: GYM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function checkInSuccessMessage(checkedInAt: string): string {
  return `Ingreso registrado a las ${formatCheckInTime(checkedInAt)}.`;
}

export function statusLabel(member: Pick<CheckInMember, "membershipStatus">): string {
  return STATUS_LABELS[member.membershipStatus];
}

/** "15/12/2026", o "Sin fecha" si no tiene membresía. */
export function nextPaymentLabel(member: Pick<CheckInMember, "nextPaymentDate">): string {
  return member.nextPaymentDate ? formatEndDate(member.nextPaymentDate) : "Sin fecha";
}

/** Solo una membresía Activa (incluida la clase suelta de hoy) está vigente. */
export function isMembershipCurrent(member: Pick<CheckInMember, "membershipStatus">): boolean {
  return member.membershipStatus === "ACTIVE";
}
