export type TrainerSessionOutcome = "COMPLETED" | "NO_SHOW";

export interface TrainerAgendaSession {
  id: number;
  startsAt: string;
  endsAt: string;
  member: { id: string; fullName: string; email: string };
  chargeStatus: "PENDING" | "PAID" | null;
  status: "SCHEDULED" | "COMPLETED";
  outcome: TrainerSessionOutcome | null;
  resultRecordedAt: string | null;
}

export interface TrainerAgendaResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  sessionExpired?: boolean;
}
