/** Extrae el mensaje de error de una respuesta de NestJS (message string o string[]). */
export async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[]; error?: string };
    if (Array.isArray(data.message)) return data.message.join(" ");
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  } catch {
    // Cuerpo no JSON: se usa el mensaje por defecto según el status.
  }
  return `Error en la solicitud (${res.status}).`;
}
