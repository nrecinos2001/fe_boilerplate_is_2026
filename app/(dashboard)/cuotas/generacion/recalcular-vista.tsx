"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Vuelve a pedir la vista previa y el historial (p. ej. tras corregir una unidad). */
export function RecalcularVista() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pendiente}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-sage bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:bg-sand/20 disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`size-4 ${pendiente ? "animate-spin" : ""}`}
      >
        <path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7l3-2.7M21 21v-5h-5" />
      </svg>
      {pendiente ? "Recalculando…" : "Recalcular vista"}
    </button>
  );
}
