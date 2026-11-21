
import "server-only";
import { getSession } from "@/lib/session";

// Error devuelto por el backend o por la conexión (status 0).
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// El backend responde los errores de dos formas: { codigo, mensaje } en los módulos que usan
// ApiExceptionFilter, y el formato por defecto de Nest, { message: string | string[] }, en el resto.
async function leerError(res: Response): Promise<ApiError> {
  let codigo: string | undefined;
  let mensaje: string | undefined;
  try {
    const body = await res.json();
    if (typeof body?.codigo === "string") codigo = body.codigo;
    if (typeof body?.mensaje === "string") {
      mensaje = body.mensaje;
    } else if (Array.isArray(body?.message)) {
      mensaje = body.message.join(", ");
    } else if (typeof body?.message === "string") {
      mensaje = body.message;
    }
  } catch {
    // el cuerpo no era JSON
  }
  return new ApiError(res.status, mensaje ?? `La API respondió ${res.status}.`, codigo);
}

// fetch contra API_URL (incluye el prefijo, p. ej. /api/v1) con el token de la sesión. Solo servidor.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("Falta la variable de entorno API_URL.");
  }

  const token = await getSession();

  if (!token) {
    throw new ApiError(401, "No hay sesión iniciada.", "NO_AUTENTICADO");
  }

  const url = new URL(
    path.replace(/^\/+/, ""),
    `${apiUrl.replace(/\/+$/, "")}/`,
  );

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  // Los cuerpos de texto son JSON. Un FormData no lleva Content-Type: fetch pone el
  // multipart/form-data con su boundary (subida de fotos de incidencias).
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;

  try {
    res = await fetch(url, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor.",
      "SIN_CONEXION",
    );
  }

  if (!res.ok) {
    throw await leerError(res);
  }

  // 204 No Content (p. ej. DELETE de áreas y bloqueos) u otra respuesta sin cuerpo.
  const texto = await res.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}
