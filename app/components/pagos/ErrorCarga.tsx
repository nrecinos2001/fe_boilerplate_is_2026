"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CircleAlert, RotateCw } from "lucide-react";

// Estado de error con botón de reintento (FE-1.1): vuelve a pedir los datos al servidor
// sin recargar la página.
export default function ErrorCarga({ mensaje }: { mensaje: string }) {
  const router = useRouter();
  const [reintentando, startTransition] = useTransition();

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-xl border border-border bg-surface p-6 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-3">
        <CircleAlert size={20} aria-hidden="true" className="shrink-0 text-danger" />
        {mensaje}
      </p>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={reintentando}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-sage px-4 py-2 font-semibold transition-colors hover:bg-sand/30 disabled:opacity-60"
      >
        <RotateCw size={16} aria-hidden="true" className={reintentando ? "animate-spin" : undefined} />
        {reintentando ? "Reintentando…" : "Reintentar"}
      </button>
    </div>
  );
}
