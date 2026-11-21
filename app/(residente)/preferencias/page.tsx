// app/(residente)/preferencias/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { obtenerPreferencias } from "@/lib/preferencias-api";
import { PreferenciasForm } from "@/components/preferencias/preferencias-form";

export const metadata: Metadata = { title: "Preferencias de avisos" };

export default async function PreferenciasPage() {
    let preferencias = null;
    let error: string | null = null;

    try {
        preferencias = await obtenerPreferencias();
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) redirect("/login");
        console.error("Error al cargar preferencias:", e);
        error = "No se pudieron cargar tus preferencias. Intenta de nuevo.";
    }

    return (
        <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-habita-700">
                MI CUENTA · CONFIGURACIÓN
            </p>
            <h1 className="mt-2 font-serif text-4xl text-habita-900">
                Preferencias de avisos
            </h1>
            <p className="mt-2 text-sm text-habita-700">
                Elige qué tipos de avisos quieres recibir. Puedes activar o desactivar cada módulo según tus necesidades.
            </p>

            {error ? (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                    <p className="font-semibold text-red-800">Error al cargar</p>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
            ) : preferencias ? (
                <div className="mt-8">
                    <PreferenciasForm preferenciasIniciales={preferencias} />
                </div>
            ) : null}
        </div>
    );
}