"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStatus, useAuthUser } from "@/src/stores/useAuthStore";
import {
  fetchTrainers,
  fetchWeeklyClasses,
} from "@/src/services/classes/classes-service";
import type { GymClass, TrainerOption } from "@/src/types/classes";
import { WeeklyCalendar } from "./weekly-calendar";
import { ClassFormModal } from "./class-form-modal";
import { CancelClassModal } from "./cancel-class-modal";
import type { CancelClassResult } from "@/src/services/classes/cancel-class-service";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function ClassesPage() {
  const status = useAuthStatus();
  const user = useAuthUser();

  const [currentMonday, setCurrentMonday] = useState<Date>(() =>
    getMonday(new Date()),
  );
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<GymClass | null>(null);
  const [classToCancel, setClassToCancel] = useState<GymClass | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isAdmin = user?.role === "ADMIN";

  // Cargar entrenadores al inicio
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    fetchTrainers().then((list) => {
      if (!cancelled) {
        setTrainers(list);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Cargar clases de la semana
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const from = new Date(currentMonday);
    from.setHours(0, 0, 0, 0);

    const to = new Date(currentMonday);
    to.setDate(to.getDate() + 7);
    to.setHours(23, 59, 59, 999);

    fetchWeeklyClasses(from, to).then((res) => {
      if (!cancelled) {
        setClasses(res.ok && res.data ? res.data : []);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, currentMonday, refreshTrigger]);

  const handlePrevWeek = () => {
    setLoading(true);
    setCurrentMonday((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setLoading(true);
    setCurrentMonday((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleCurrentWeek = () => {
    setLoading(true);
    setCurrentMonday(getMonday(new Date()));
  };

  const handleNewClass = () => {
    setClassToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClass = (gymClass: GymClass) => {
    setClassToEdit(gymClass);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (saved: GymClass) => {
    const isEdit = Boolean(classToEdit);
    setToastMessage(
      isEdit
        ? `Clase "${saved.name}" actualizada con éxito.`
        : `Clase "${saved.name}" programada con éxito.`,
    );
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);

    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleCancelSuccess = (result: CancelClassResult) => {
    setClassToCancel(null);
    setToastMessage(
      `Clase cancelada: ${result.reservationsCancelled} reservas canceladas y ${result.noticesSent} avisos enviados.`,
    );
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // 1. Estado cargando sesión
  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-zinc-500 font-medium">
            Verificando permisos...
          </p>
        </div>
      </div>
    );
  }

  // 2. Restricción por Rol: Solo ADMIN puede acceder (Criterio 6 / FE-2.2)
  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-lg dark:border-red-900/50 dark:bg-red-950/30">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300 text-2xl">
            🚫
          </div>
          <h2 className="mt-4 text-xl font-bold text-red-800 dark:text-red-300">
            Acceso Restringido
          </h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            Esta pantalla es exclusiva para usuarios con rol{" "}
            <strong className="font-semibold">ADMIN</strong>. Tu rol actual es{" "}
            <span className="font-semibold uppercase">
              {user?.role ?? "Invitado"}
            </span>
            .
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Pantalla de administración de clases
  return (
    <div className="flex flex-1 flex-col p-6 max-w-7xl mx-auto w-full">
      {/* Encabezado y migas de pan */}
      <div className="mb-6 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm text-zinc-500">
          <Link
            href="/"
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Inicio
          </Link>
          <span>/</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Clases grupales
          </span>
        </nav>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          Rol: Administrador
        </span>
      </div>

      {/* Toast de Éxito */}
      {toastMessage && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2 font-medium">
            <span>✅</span>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Calendario Semanal */}
      <WeeklyCalendar
        currentMonday={currentMonday}
        classes={classes}
        loading={loading}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
        onEditClass={handleEditClass}
        onCancelClass={setClassToCancel}
        onNewClass={handleNewClass}
      />

      {/* Modal de Formulario de Alta y Edición */}
      {isModalOpen && (
        <ClassFormModal
          key={classToEdit ? `edit-${classToEdit.id}` : "new"}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaveSuccess}
          classToEdit={classToEdit}
          trainers={trainers}
        />
      )}
      {classToCancel && (
        <CancelClassModal
          gymClass={classToCancel}
          onClose={() => setClassToCancel(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
}
