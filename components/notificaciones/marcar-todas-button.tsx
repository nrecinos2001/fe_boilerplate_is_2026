"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarTodasLeidasAccion } from "@/app/actions/notificaciones";
import { CheckCheck } from "lucide-react";

export function MarcarTodasButton({ noLeidas }: { noLeidas: number | null }) {
    const router = useRouter();
    const [pendiente, iniciar] = useTransition();
    const [error, setError] = useState<string | null>(null);

    if (!noLeidas || noLeidas === 0) return null;

    function handleMarcarTodas() {
        setError(null);
        iniciar(async () => {
            const resultado = await marcarTodasLeidasAccion();
            if (!resultado.ok) {
                setError(resultado.mensaje);
            } else {
                router.refresh();
            }
        });
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handleMarcarTodas}
                disabled={pendiente}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-habita-900 underline underline-offset-4 hover:text-habita-700 disabled:opacity-50"
            >
                <CheckCheck className="h-4 w-4" />
                {pendiente ? "Marcando..." : "Marcar todas como leídas"}
            </button>
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    );
}