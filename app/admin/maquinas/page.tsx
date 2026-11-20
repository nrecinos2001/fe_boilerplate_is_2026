"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AccessDenied } from "@/src/components/access-denied";
import { ChangeStatusModal } from "@/src/components/machines/change-status-modal";
import { MachineInventoryTable } from "@/src/components/machines/machine-inventory-table";
import { StatusHistoryPanel } from "@/src/components/machines/status-history-panel";
import {
  fetchMachineHistory,
  fetchMachines,
} from "@/src/services/machines/machines-service";
import { useAuthStatus, useRole } from "@/src/stores/useAuthStore";
import {
  AREA_LABELS,
  MACHINE_AREAS,
  STATUS_LABELS,
  type Machine,
  type MachineArea,
  type MachinePage,
  type MachineStatusChange,
  type MachineStatusChangeResult,
} from "@/src/types/machines";

type HistoryState = {
  machine: Machine;
  entries: MachineStatusChange[];
  loading: boolean;
  error: string | null;
};

/** H20 · Inventario de máquinas, cambio de estado e historial (Administrador). */
export default function AdminMachinesPage() {
  const status = useAuthStatus();
  const role = useRole();
  const isAdmin = role === "ADMIN";

  const [area, setArea] = useState<MachineArea | "">("");
  const [page, setPage] = useState(1);
  const [inventory, setInventory] = useState<MachinePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<Machine | null>(null);
  const [history, setHistory] = useState<HistoryState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchMachines(page, area || undefined).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setInventory(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, page, area, reloadKey]);

  const loadHistory = useCallback((machine: Machine) => {
    setHistory({ machine, entries: [], loading: true, error: null });
    fetchMachineHistory(machine.id).then((res) => {
      setHistory((current) => {
        // Si el usuario ya abrió otra máquina, se descarta esta respuesta.
        if (!current || current.machine.id !== machine.id) return current;
        return res.ok
          ? { machine: current.machine, entries: res.data, loading: false, error: null }
          : { machine: current.machine, entries: [], loading: false, error: res.error };
      });
    });
  }, []);

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  function handleAreaChange(value: string) {
    setLoading(true);
    setArea(value as MachineArea | "");
    setPage(1);
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  function handleSaved(result: MachineStatusChangeResult) {
    const machine = editing;
    setEditing(null);
    if (!machine) return;

    const updated: Machine = { ...machine, status: result.status };
    setInventory((current) =>
      current && {
        ...current,
        data: current.data.map((m) => (m.id === updated.id ? updated : m)),
      },
    );
    setToast(`${machine.code} quedó en "${STATUS_LABELS[result.status]}".`);
    setTimeout(() => setToast(null), 4500);
    // Se abre el historial de la máquina para que se vea la fila nueva.
    loadHistory(updated);
  }

  if (status === "loading") {
    return (
      <p role="status" className="p-8 text-center text-sm text-zinc-500">
        Cargando sesión...
      </p>
    );
  }

  if (!isAdmin) return <AccessDenied />;

  const totalPages = inventory ? Math.max(1, Math.ceil(inventory.total / inventory.pageSize)) : 1;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-800 dark:hover:text-zinc-200">
          Inicio
        </Link>
        <span>/</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Máquinas</span>
      </nav>

      <h1 className="text-2xl font-bold">Máquinas</h1>

      {toast && (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {toast}
        </p>
      )}

      <label className="flex w-fit items-center gap-2 text-sm">
        Área
        <select
          value={area}
          onChange={(e) => handleAreaChange(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Todas</option>
          {MACHINE_AREAS.map((a) => (
            <option key={a} value={a}>
              {AREA_LABELS[a]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <MachineInventoryTable
            machines={inventory?.data ?? []}
            loading={loading}
            error={error}
            onRetry={reload}
            onChangeStatus={setEditing}
            onShowHistory={loadHistory}
          />
          {inventory && !loading && !error && (
            <div className="flex items-center justify-between px-3 py-2 text-sm text-zinc-500">
              <span>Ordenadas por área y nombre · {inventory.total} máquinas</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Página anterior"
                  className="disabled:opacity-40"
                >
                  ‹
                </button>
                {page} de {totalPages}
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Página siguiente"
                  className="disabled:opacity-40"
                >
                  ›
                </button>
              </span>
            </div>
          )}
        </div>

        {history && (
          <StatusHistoryPanel
            machine={history.machine}
            entries={history.entries}
            loading={history.loading}
            error={history.error}
            onRetry={() => loadHistory(history.machine)}
            onClose={() => setHistory(null)}
          />
        )}
      </div>

      {editing && (
        <ChangeStatusModal
          key={editing.id}
          machine={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
