"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ErrorPanel({
  mensaje,
  titulo = "No pudimos cargar tus notificaciones",
}: {
  mensaje: string;
  titulo?: string;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  return (
    <div role="alert" className="px-6 py-14 text-center">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1 text-sm text-habita-700">{mensaje}</p>
      <button
        type="button"
        onClick={() => iniciar(() => router.refresh())}
        disabled={pendiente}
        className="mt-4 rounded-lg border border-borde bg-white px-4 py-2 text-sm font-medium hover:bg-arena disabled:opacity-60"
      >
        {pendiente ? "Reintentando..." : "Reintentar"}
      </button>
    </div>
  );
}
