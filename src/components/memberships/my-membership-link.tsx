"use client";

import Link from "next/link";
import { useRole } from "@/src/stores/useAuthStore";

/** Acceso a "Mi membresía" (H05). Solo lo ve el miembro. */
export function MyMembershipLink() {
  const role = useRole();
  if (role !== "MEMBER") return null;

  return (
    <Link
      href="/miembro/membresia"
      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
    >
      🪪 Mi membresía
    </Link>
  );
}
