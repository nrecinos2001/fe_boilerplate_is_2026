export interface GymClassTrainer {
  id: string;
  fullName: string;
  email: string;
}

export type ClassStatus = "SCHEDULED" | "CANCELLED";

export interface GymClass {
  id: number;
  name: string;
  trainerId: string;
  trainer: GymClassTrainer;
  startsAt: string;
  endsAt: string;
  capacity: number;
  confirmedReservations: number;
  spotsLeft?: number;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassInput {
  name: string;
  trainerId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
}

export interface UpdateClassInput {
  name?: string;
  trainerId?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
}

export interface TrainerOption {
  id: string;
  fullName: string;
  email: string;
}

export type ReservationStatus = "CONFIRMED" | "CANCELLED";

export interface ReservationClassSummary {
  id: number;
  name: string;
  trainerId: string;
  trainer: GymClassTrainer;
  startsAt: string;
  endsAt: string;
  capacity: number;
  confirmedReservations: number;
  spotsLeft: number;
  status: ClassStatus;
}

export interface ClassReservation {
  id: number;
  classId: number;
  memberId: string;
  status: ReservationStatus;
  origin?: "MEMBERSHIP" | "DROP_IN";
  cancelledAt: string | null;
  createdAt: string;
  gymClass: ReservationClassSummary;
}

export interface MemberReservationListResponse {
  data: ClassReservation[];
}

export type ClassReservationErrorCode =
  | "CLASS_FULL"
  | "ALREADY_RESERVED"
  | "CLASS_ALREADY_STARTED"
  | "CLASS_NOT_SCHEDULED"
  | "MEMBERSHIP_INACTIVE"
  | "DROP_IN_NOT_ALLOWED"
  | "MEMBERSHIP_UNAVAILABLE"
  | "SESSION_EXPIRED"
  | "UNEXPECTED_RESPONSE"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface ClassServiceResult<T = GymClass> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  code?: ClassReservationErrorCode;
  sessionExpired?: boolean;
}
