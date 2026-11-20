import { create } from "zustand";
import type { AuthUser, ClientSession, Role } from "@/src/types/auth";

// Estado global de la sesión.
//
// IMPORTANTE: este store NO usa el middleware `persist`. El access token vive
// solo en memoria y nunca se escribe en localStorage/sessionStorage. Al recargar
// la página la sesión se rehidrata con POST /api/auth/refresh, que usa el
// refresh token guardado en una cookie httpOnly (ver AuthProvider).

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (session: ClientSession) => void;
  clearSession: () => void;
  /** El usuario ya cambió su contraseña temporal (FE-1.2). */
  markPasswordChanged: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) =>
    set({ status: "authenticated", accessToken, user }),
  clearSession: () =>
    set({ status: "unauthenticated", accessToken: null, user: null }),
  markPasswordChanged: () =>
    set((state) =>
      state.user ? { user: { ...state.user, mustChangePassword: false } } : state,
    ),
}));

// Selectores de conveniencia.
export const useAuthUser = () => useAuthStore((s) => s.user);
export const useRole = (): Role | null => useAuthStore((s) => s.user?.role ?? null);
export const useAuthStatus = () => useAuthStore((s) => s.status);
