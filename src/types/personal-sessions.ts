export interface TrainerSummary {
  id: string;
  fullName: string;
  email: string;
}

export interface TrainerListResponse {
  data: TrainerSummary[];
}

export interface TrainerSlot {
  availabilityBlockId: string;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
}

export interface TrainerSlotsResponse {
  trainer: TrainerSummary;
  from: string;
  to: string;
  slots: TrainerSlot[];
}

export interface SessionPricingResponse {
  configured: boolean;
  price: number | null;
}

export interface CreatePersonalSessionInput {
  trainerId: string;
  startsAt: string;
}

export type PersonalSessionStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export type ChargeStatus = "PENDING" | "PAID";

export interface PersonalSession {
  id: number;
  trainerId: string;
  trainer: TrainerSummary;
  memberId: string;
  availabilityBlockId: string | null;
  startsAt: string;
  endsAt: string;
  price: number | null;
  chargeId: number | null;
  chargeStatus: ChargeStatus | null;
  status: PersonalSessionStatus;
  createdAt: string;
}

export interface PersonalSessionListResponse {
  data: PersonalSession[];
}

export type PersonalSessionErrorCode =
  | "SLOT_ALREADY_TAKEN"
  | "MIN_ADVANCE_REQUIRED"
  | "PRICING_UNAVAILABLE"
  | "TRAINER_NOT_FOUND"
  | "INVALID_TRAINER"
  | "SLOT_NOT_AVAILABLE"
  | "SESSION_EXPIRED"
  | "UNEXPECTED_RESPONSE"
  | "ABORTED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface PersonalSessionServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  code?: PersonalSessionErrorCode;
  sessionExpired?: boolean;
  aborted?: boolean;
}
