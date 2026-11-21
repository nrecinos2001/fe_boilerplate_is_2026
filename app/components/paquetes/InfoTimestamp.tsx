"use client";

import { CONDOMINIUM, formatDate, formatTime } from "@/lib/paquetes";

export default function InfoTimestamp() {
  const now = new Date();

  return (
    <p className="mt-6 text-xs text-gray-500" suppressHydrationWarning>
      Información al {formatDate(now)} · {formatTime(now)} · Hora local de{" "}
      {CONDOMINIUM}.
    </p>
  );
}
