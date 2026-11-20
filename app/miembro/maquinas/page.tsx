"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MachineAvailabilityList } from "@/src/components/machines/machine-availability-list";
import { fetchMachineAvailability } from "@/src/services/machines/machines-service";
import { useAuthStatus } from "@/src/stores/useAuthStore";
import {
  AREA_LABELS,
  MACHINE_AREAS,
  MACHINE_STATUSES,
  STATUS_LABELS,
  type MachineArea,
  type MachineAvailability,
  type MachineStatus,
} from "@/src/types/machines";

/**
 * H21 · Estado de las máquinas para el miembro. Cualquier rol con sesión la
 * puede ver; es de solo lectura.
 */
export default function MemberMachinesPage() {
  const status = useAuthStatus();
  const [area, setArea] = useState<MachineArea | "">("");
  const [machineStatus, setMachineStatus] = useState<MachineStatus | "">("");
  const [machines, setMachines] = useState<MachineAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchMachineAvailability({
      area: area || undefined,
      status: machineStatus || undefined,
    }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setMachines(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [status, area, machineStatus, reloadKey]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  const selectClass =
    "rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-800 dark:hover:text-zinc-200">
          Inicio
        </Link>
        <span>/</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Máquinas</span>
      </nav>

      <h1 className="text-2xl font-bold">Máquinas</h1>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Área
          <select
            value={area}
            onChange={(e) => {
              setLoading(true);
              setArea(e.target.value as MachineArea | "");
            }}
            className={selectClass}
          >
            <option value="">Todas</option>
            {MACHINE_AREAS.map((a) => (
              <option key={a} value={a}>
                {AREA_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Estado
          <select
            value={machineStatus}
            onChange={(e) => {
              setLoading(true);
              setMachineStatus(e.target.value as MachineStatus | "");
            }}
            className={selectClass}
          >
            <option value="">Todos</option>
            {MACHINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={refresh}
          disabled={status !== "authenticated"}
          className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          ⟳ Actualizar
        </button>
      </div>

      <MachineAvailabilityList
        machines={machines}
        loading={status === "loading" || loading}
        error={error}
        onRetry={refresh}
      />
    </div>
  );
}
