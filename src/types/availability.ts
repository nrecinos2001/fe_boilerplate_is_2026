// Contrato con AvailabilityBlockResponseDto del backend (GET/POST /availability-blocks).

export interface AvailabilityBlock {
  id: string;
  userId: string;
  /** 1 (lunes) a 7 (domingo). */
  weekday: number;
  /** Formato HH:mm. */
  startTime: string;
  /** Formato HH:mm. */
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityBlockInput {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}
