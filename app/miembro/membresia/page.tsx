"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MembershipCard } from "@/src/components/memberships/membership-card";
import { fetchMyMembership } from "@/src/services/memberships/memberships-service";
import { useAuthStatus, useRole } from "@/src/stores/useAuthStore";
import type { MyMembership } from "@/src/types/membership";

/**
 * H05 · "Mi membresía". Muestra solo la del miembro que inició sesión: la
 * pantalla no tiene ningún campo para elegir a otro miembro.
 */
export default function MyMembershipPage() {
  const status = useAuthStatus();
  const role = useRole();
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isMember = status === "authenticated" && role === "MEMBER";

  useEffect(() => {
    if (!isMember) return;
    let cancelled = false;
    fetchMyMembership().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setMembership(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isMember]);

  if (status === "loading") {
    return <p className="p-6 text-sm text-zinc-500">Cargando sesión...</p>;
  }

  if (!isMember) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
        <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          No tienes permiso para ver esta página.
        </p>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Volver al inicio
      </Link>
      <h1 className="text-2xl font-semibold">Mi membresía</h1>

      {loading && <p className="text-sm text-zinc-500">Cargando tu membresía...</p>}

      {!loading && error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {!loading && membership && <MembershipCard membership={membership} />}
    </div>
  );
}
