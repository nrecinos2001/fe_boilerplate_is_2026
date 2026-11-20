import { postToBackend } from "@/lib/backend";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { isBackendAuthResponse, toClientSession } from "@/src/types/auth";

// POST /api/auth/refresh
//
// Canjea el refresh token de la cookie httpOnly por un par nuevo en el backend,
// rota la cookie y devuelve al navegador solo { accessToken, expiresIn, user }.
// Lo usa el cliente al recargar la página (rehidratar la sesión) y cuando una
// solicitud recibe 401.
export async function POST() {
  const refreshToken = await getSession();
  if (!refreshToken) {
    // Sin cookie no hay nada que borrar. No tocar las cookies aquí evita pisar
    // una sesión recién creada por un login que corre en paralelo.
    return unauthorized();
  }

  let res: Response;
  try {
    res = await postToBackend("auth/refresh", { refreshToken });
  } catch (error) {
    console.error("Error al renovar la sesión:", error);
    return Response.json({ message: "Servicio no disponible." }, { status: 503 });
  }

  if (res.status === 401) {
    // Refresh token inválido, expirado, reutilizado o cuenta inactiva.
    await deleteSession();
    return unauthorized();
  }

  const data: unknown = res.ok ? await res.json().catch(() => null) : null;
  if (!isBackendAuthResponse(data)) {
    console.error(`auth/refresh respondió ${res.status} con un cuerpo inesperado.`);
    return Response.json({ message: "No se pudo renovar la sesión." }, { status: 502 });
  }

  await createSession(data.refreshToken);
  return Response.json(toClientSession(data), {
    headers: { "Cache-Control": "no-store" },
  });
}

function unauthorized() {
  return Response.json({ message: "Sesión no válida." }, { status: 401 });
}
