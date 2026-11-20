export type CrearResena = {
  orderId: string;
  rating: number;
  comment?: string;
};

export type ResenaCreada = {
  id: string;
  userId: string;
  accountId: string | null;
  orderId: string | null;
  branchId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export class ReviewsApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ReviewsApiError";
    this.status = status;
  }
}

export async function registrarResena(input: CrearResena): Promise<ResenaCreada> {
  const response = await fetch("/api/cliente/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body =
      data !== null && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((part): part is string => typeof part === "string").join(" ")
      : typeof rawMessage === "string"
        ? rawMessage
        : "No se pudo registrar la reseña.";
    throw new ReviewsApiError(response.status, message);
  }

  return data as ResenaCreada;
}
