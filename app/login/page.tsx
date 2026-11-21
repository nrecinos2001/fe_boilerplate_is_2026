import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

// `motivo` lo pone proxy.ts cuando borra una cookie de sesión que ya no sirve.
const AVISOS: Record<string, string> = {
  vencida: "Tu sesión venció. Inicia sesión de nuevo.",
  rol: "Tu cuenta no tiene acceso a Habita.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { motivo } = await searchParams;
  const aviso = typeof motivo === "string" ? AVISOS[motivo] : undefined;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <main className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <h1 className="mb-6 font-serif text-3xl">Iniciar sesión</h1>
        {aviso && (
          <p role="status" className="mb-4 rounded-lg bg-sand/30 px-4 py-3 text-sm text-foreground">
            {aviso}
          </p>
        )}
        <LoginForm />
      </main>
    </div>
  );
}
