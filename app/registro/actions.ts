"use server";

import { redirect } from "next/navigation";

export type RegisterState = { error?: string; email?: string };

export async function register(_previous: RegisterState, formData: FormData): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { email, error: "Ingresa un correo válido." };
  if (password.length < 8 || new TextEncoder().encode(password).length > 72 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) return { email, error: "Usa al menos 8 caracteres, una mayúscula, una minúscula y un número (máximo 72 bytes)." };
  if (password !== confirmation) return { email, error: "Las contraseñas no coinciden." };
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return { email, error: "El servicio no está configurado." };
  try {
    const response = await fetch(new URL("users", apiUrl.replace(/\/?$/, "/")), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), cache: "no-store" });
    if (response.status === 409) return { email, error: "El correo ya está registrado." };
    if (response.status === 400) return { email, error: "Revisa el correo y los requisitos de la contraseña." };
    if (!response.ok) return { email, error: "No se pudo crear la cuenta. Intenta más tarde." };
  } catch {
    return { email, error: "No se pudo conectar con el servidor." };
  }
  redirect("/login?registro=ok");
}
