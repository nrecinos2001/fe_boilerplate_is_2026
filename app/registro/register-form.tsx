"use client";
import { useActionState } from "react";
import { register, type RegisterState } from "./actions";
const initialState: RegisterState = {};
const inputClass = "rounded-lg border border-slate-300 bg-white px-3 py-3 text-[#20233e] outline-none focus:border-[#7564e8]";
export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initialState);
  return <form action={action} className="flex flex-col gap-4">
    <label className="flex flex-col gap-1 text-sm font-medium">Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.email} className={inputClass} placeholder="tu@correo.com" /></label>
    <label className="flex flex-col gap-1 text-sm font-medium">Contraseña<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={inputClass} /></label>
    <p className="text-xs text-slate-600">Al menos 8 caracteres, una mayúscula, una minúscula y un número. Máximo 72 bytes.</p>
    <label className="flex flex-col gap-1 text-sm font-medium">Confirmar contraseña<input name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={inputClass} /></label>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    <button disabled={pending} type="submit" className="rounded-xl bg-[#6554cf] px-4 py-3 font-semibold text-white disabled:opacity-60">{pending ? "Creando cuenta..." : "Crear cuenta"}</button>
  </form>;
}
