import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";
export const metadata: Metadata = { title: "Crear cuenta | Núcleo Digital" };
export default function RegisterPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f6fb] px-4 py-10 text-[#20233e]"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><Link href="/" className="mb-6 flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7564e8] text-white">N</span>Núcleo Digital</Link><h1 className="text-2xl font-bold">Crear cuenta</h1><p className="mb-6 mt-2 text-sm text-slate-600">Regístrate como cliente del restaurante.</p><RegisterForm /><p className="mt-6 text-center text-sm">¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-[#6554cf]">Iniciar sesión</Link></p></section></main>;
}
