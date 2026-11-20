/**
 * Lee el mensaje de error que devuelve Nest. En un 400 de validación
 * `message` es un arreglo (uno por regla incumplida); en los demás, un string.
 * Devuelve null si el cuerpo no trae un mensaje legible.
 */
export async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { message?: unknown };
    if (Array.isArray(data.message)) {
      const parts = data.message.filter((m): m is string => typeof m === "string");
      return parts.length > 0 ? parts.join(" ") : null;
    }
    return typeof data.message === "string" ? data.message : null;
  } catch {
    return null;
  }
}
