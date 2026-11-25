export type ResenaSucursal = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type ResumenResenasSucursal = {
  branchId: string;
  averageRating: number | null;
  totalReviews: number;
  page: number;
  limit: number;
  totalPages: number;
  reviews: ResenaSucursal[];
};

export class BranchReviewsApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BranchReviewsApiError";
    this.status = status;
  }
}

export async function obtenerResenasSucursal(
  branchId: string,
  page: number,
  signal?: AbortSignal,
): Promise<ResumenResenasSucursal> {
  const query = new URLSearchParams({ page: String(page), limit: "10" });
  const response = await fetch(
    `/api/gerente/branches/${encodeURIComponent(branchId)}/reviews?${query}`,
    { cache: "no-store", signal },
  );
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body =
      data !== null && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === "string").join(" ")
      : typeof rawMessage === "string"
        ? rawMessage
        : "No se pudieron consultar las reseñas.";
    throw new BranchReviewsApiError(response.status, message);
  }

  return data as ResumenResenasSucursal;
}
