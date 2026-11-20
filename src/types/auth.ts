// Contrato de autenticación con el backend (AuthResponseDto / UserResponseDto).

export type Role = "MEMBER" | "TRAINER" | "RECEPTION" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
};

// Lo que el navegador recibe tras login o refresh. El refresh token NO viaja
// al cliente: se queda en una cookie httpOnly que solo lee el servidor de Next.
export type ClientSession = {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
};

// Respuesta completa de POST /auth/login y POST /auth/refresh del backend.
export type BackendAuthResponse = ClientSession & {
  refreshToken: string;
};

export function isBackendAuthResponse(data: unknown): data is BackendAuthResponse {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  const user = d.user as Record<string, unknown> | undefined;
  return (
    typeof d.accessToken === "string" &&
    typeof d.refreshToken === "string" &&
    typeof d.expiresIn === "number" &&
    typeof user === "object" &&
    user !== null &&
    typeof user.id === "string" &&
    typeof user.role === "string"
  );
}

export function toClientSession(data: BackendAuthResponse): ClientSession {
  return {
    accessToken: data.accessToken,
    expiresIn: data.expiresIn,
    user: data.user,
  };
}
