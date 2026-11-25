export class MeseroApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MeseroApiError";
  }
}

export async function meseroApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/mesero/${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : null;
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((value): value is string => typeof value === "string").join(", ")
      : typeof rawMessage === "string"
        ? rawMessage
        : `Error ${response.status}`;
    throw new MeseroApiError(message, response.status);
  }

  return data as T;
}

export function dinero(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function mensajeApi(error: unknown, fallback: string) {
  if (error instanceof MeseroApiError) {
    if (error.status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
    if (error.status === 403) return "No tienes permiso para consultar esta cuenta.";
    if (error.status === 404) return "La cuenta o el comprobante no existe.";
    if (error.status === 409) return error.message;
    return error.message || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
