export type SucursalAsignada = {
  id: string;
  name: string;
};

export class BranchesApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BranchesApiError";
    this.status = status;
  }
}

export async function obtenerSucursalesAsignadas(): Promise<SucursalAsignada[]> {
  const response = await fetch("/api/reportes/branches/assigned-to-me", {
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
      ? rawMessage.filter((item): item is string => typeof item === "string").join(" ")
      : typeof rawMessage === "string"
        ? rawMessage
        : "No se pudieron cargar las sucursales asignadas.";
    throw new BranchesApiError(response.status, message);
  }

  if (
    !Array.isArray(data) ||
    !data.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).name === "string",
    )
  ) {
    throw new Error("El servidor devolvió una lista de sucursales inválida.");
  }

  return data as SucursalAsignada[];
}
