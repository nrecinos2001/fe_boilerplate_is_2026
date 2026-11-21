"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { INICIO, esRolPermitido } from "@/lib/rutas";

export type LoginState = {
  error?: string;
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authenticate(email: string, password: string) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error("Falta la variable de entorno API_URL.");
  }

  const res = await fetch(new URL("auth/login", apiUrl.replace(/\/?$/, "/")), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`auth/login respondió ${res.status}`);
  }

  const data = await res.json();
  const token: string | undefined =
    data.token ?? data.accessToken ?? data.access_token;
  if (!token) {
    throw new Error("La respuesta de auth/login no incluye un token.");
  }
  return token;
}

/** Rol de la cuenta recién autenticada (el JWT no lo incluye). */
async function rolDe(token: string): Promise<unknown> {
  const apiUrl = process.env.API_URL!;
  const res = await fetch(new URL("auth/me", apiUrl.replace(/\/?$/, "/")), {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`auth/me respondió ${res.status}`);
  }
  const usuario: { role?: unknown } = await res.json();
  return usuario.role;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña.", email };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Ingresa un correo válido.", email };
  }

  let token: string | null;
  let role: unknown;
  try {
    token = await authenticate(email, password);
    role = token ? await rolDe(token) : undefined;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { error: "No se pudo iniciar sesión. Intenta más tarde.", email };
  }
  if (!token) {
    return { error: "Correo o contraseña incorrectos.", email };
  }
  // Solo residentes, administración y seguridad usan la aplicación.
  if (!esRolPermitido(role)) {
    return { error: "Tu cuenta no tiene acceso a Habita.", email };
  }

  await createSession(token);
  redirect(INICIO);
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
