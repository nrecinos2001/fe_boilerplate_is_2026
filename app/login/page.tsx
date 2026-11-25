import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registro?: string }> }) {
  const { registro } = await searchParams;
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <main className="w-full max-w-sm rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
        <h1 className="mb-6 text-2xl font-semibold">Iniciar sesión</h1>
        {registro === "ok" && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Cuenta creada correctamente. Ya puedes iniciar sesión.</p>}
        <LoginForm />
        <p className="mt-6 text-center text-sm">¿No tienes cuenta? <Link href="/registro" className="font-semibold text-[#7564e8] hover:underline">Crear cuenta</Link></p>
        <Link href="/" className="mt-4 block text-center text-sm text-[#7564e8]">Volver al inicio</Link>
      </main>
    </div>
  );
}
