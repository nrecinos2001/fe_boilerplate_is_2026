"use client";

import { useState } from "react";
import { createClass, updateClass } from "@/src/services/classes/classes-service";
import type { GymClass, TrainerOption } from "@/src/types/classes";

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedClass: GymClass) => void;
  classToEdit?: GymClass | null;
  trainers: TrainerOption[];
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function ClassFormModal({
  isOpen,
  onClose,
  onSuccess,
  classToEdit,
  trainers,
}: ClassFormModalProps) {
  const isEditing = Boolean(classToEdit);

  const [name, setName] = useState(() => classToEdit?.name ?? "");
  const [trainerId, setTrainerId] = useState(
    () => classToEdit?.trainerId ?? trainers[0]?.id ?? "",
  );
  const [capacity, setCapacity] = useState(() => classToEdit?.capacity ?? 20);

  const [date, setDate] = useState(() => {
    if (classToEdit) {
      const start = new Date(classToEdit.startsAt);
      return `${start.getFullYear()}-${padZero(start.getMonth() + 1)}-${padZero(start.getDate())}`;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${padZero(tomorrow.getMonth() + 1)}-${padZero(tomorrow.getDate())}`;
  });

  const [startTime, setStartTime] = useState(() => {
    if (classToEdit) {
      const start = new Date(classToEdit.startsAt);
      return `${padZero(start.getHours())}:${padZero(start.getMinutes())}`;
    }
    return "18:00";
  });

  const [endTime, setEndTime] = useState(() => {
    if (classToEdit) {
      const end = new Date(classToEdit.endsAt);
      return `${padZero(end.getHours())}:${padZero(end.getMinutes())}`;
    }
    return "18:50";
  });

  const [loading, setLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConflictError(null);
    setClientError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 60) {
      setClientError("El nombre debe tener entre 3 y 60 caracteres.");
      return;
    }

    if (!trainerId) {
      setClientError("Debes seleccionar un entrenador con rol TRAINER.");
      return;
    }

    if (!date || !startTime || !endTime) {
      setClientError("Debes especificar la fecha, hora de inicio y hora de fin.");
      return;
    }

    const [year, month, day] = date.split("-").map(Number);
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const startsAtDate = new Date(year, month - 1, day, startH, startM, 0, 0);
    const endsAtDate = new Date(year, month - 1, day, endH, endM, 0, 0);

    if (endsAtDate.getTime() <= startsAtDate.getTime()) {
      setClientError("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }

    const durationMinutes = (endsAtDate.getTime() - startsAtDate.getTime()) / 60000;
    if (durationMinutes < 30 || durationMinutes > 180) {
      setClientError("La duración de la clase debe ser de entre 30 y 180 minutos.");
      return;
    }

    if (capacity < 1 || capacity > 50) {
      setClientError("El cupo máximo debe estar entre 1 y 50.");
      return;
    }

    setLoading(true);

    try {
      if (isEditing && classToEdit) {
        const result = await updateClass(classToEdit.id, {
          name: trimmedName,
          trainerId,
          startsAt: startsAtDate.toISOString(),
          endsAt: endsAtDate.toISOString(),
          capacity,
        });

        if (!result.ok) {
          // Mantener el formulario abierto y mostrar el error dentro de la alerta (incluyendo HTTP 409)
          setConflictError(result.error ?? "No se pudo actualizar la clase.");
          return;
        }

        if (result.data) {
          onSuccess(result.data);
          onClose();
        }
      } else {
        const result = await createClass({
          name: trimmedName,
          trainerId,
          startsAt: startsAtDate.toISOString(),
          endsAt: endsAtDate.toISOString(),
          capacity,
        });

        if (!result.ok) {
          // Mantener el formulario abierto y mostrar el error dentro de la alerta (incluyendo HTTP 409)
          setConflictError(result.error ?? "No se pudo programar la clase.");
          return;
        }

        if (result.data) {
          onSuccess(result.data);
          onClose();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {isEditing ? "Editar Clase Grupal" : "Programar Nueva Clase Grupal"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Alerta de Conflicto (HTTP 409 u otro error del backend) */}
          {conflictError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/50 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200 shadow-xs"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none">⚠️</span>
                <div>
                  <p className="font-semibold">Conflicto al guardar:</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{conflictError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Alerta de Validación del cliente */}
          {clientError && (
            <div
              role="alert"
              className="rounded-xl border border-amber-500/50 bg-amber-50 p-3.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <p className="font-medium">⚠️ {clientError}</p>
            </div>
          )}

          {/* Nombre de la clase */}
          <div>
            <label
              htmlFor="class-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Nombre de la clase (3 a 60 caracteres) *
            </label>
            <input
              id="class-name"
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Spinning Matutino, Yoga Flow..."
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {/* Entrenador */}
          <div>
            <label
              htmlFor="class-trainer"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Entrenador (Rol TRAINER) *
            </label>
            <select
              id="class-trainer"
              required
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {trainers.length === 0 ? (
                <option value="">Cargando entrenadores...</option>
              ) : (
                trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.email})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Fecha y Horarios */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="class-date"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Fecha *
              </label>
              <input
                id="class-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="class-start"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Hora inicio *
              </label>
              <input
                id="class-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="class-end"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Hora fin *
              </label>
              <input
                id="class-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Cupo máximo */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="class-capacity"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Cupo máximo (1 a 50) *
              </label>
              {isEditing && classToEdit && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Reservas confirmadas: {classToEdit.confirmedReservations}
                </span>
              )}
            </div>
            <input
              id="class-capacity"
              type="number"
              min={1}
              max={50}
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {isEditing && classToEdit && classToEdit.confirmedReservations > 0 && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                El cupo no puede ser menor a las {classToEdit.confirmedReservations} reservas confirmadas.
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-colors"
            >
              {loading
                ? "Guardando..."
                : isEditing
                  ? "Actualizar Clase"
                  : "Programar Clase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
