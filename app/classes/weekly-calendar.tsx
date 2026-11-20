"use client";

import { useMemo } from "react";
import type { GymClass } from "@/src/types/classes";

type ClassWithCancellation = GymClass & { cancellationReason?: string | null };

interface WeeklyCalendarProps {
  currentMonday: Date;
  classes: ClassWithCancellation[];
  loading: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onEditClass: (gymClass: GymClass) => void;
  onCancelClass: (gymClass: GymClass) => void;
  onNewClass: () => void;
}

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateHeader(d: Date): string {
  return `${d.getDate()} / ${d.getMonth() + 1}`;
}

export function WeeklyCalendar({
  currentMonday,
  classes,
  loading,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onEditClass,
  onCancelClass,
  onNewClass,
}: WeeklyCalendarProps) {
  // Generar los 7 días de la semana (Lunes a Domingo)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentMonday]);

  const sunday = weekDays[6];

  // Agrupar clases por día
  const classesByDay = useMemo(() => {
    const map = new Map<number, ClassWithCancellation[]>();
    for (let i = 0; i < 7; i++) {
      map.set(i, []);
    }

    classes.forEach((c) => {
      const classDate = new Date(c.startsAt);
      // Encontrar a cuál de los 7 días pertenece
      const dayIndex = weekDays.findIndex(
        (day) =>
          day.getFullYear() === classDate.getFullYear() &&
          day.getMonth() === classDate.getMonth() &&
          day.getDate() === classDate.getDate(),
      );

      if (dayIndex !== -1) {
        map.get(dayIndex)?.push(c);
      }
    });

    // Ordenar cada día por hora de inicio
    map.forEach((list) => {
      list.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    });

    return map;
  }, [classes, weekDays]);

  return (
    <div className="flex flex-col gap-6">
      {/* Barra superior de navegación y controles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Calendario Semanal de Clases
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Semana del {currentMonday.getDate()} de{" "}
            {currentMonday.toLocaleString("es-ES", { month: "long" })} al{" "}
            {sunday.getDate()} de{" "}
            {sunday.toLocaleString("es-ES", { month: "long" })} de{" "}
            {sunday.getFullYear()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={onPrevWeek}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={onCurrentWeek}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={onNextWeek}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Siguiente →
            </button>
          </div>

          <button
            type="button"
            onClick={onNewClass}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <span>+ Programar Clase</span>
          </button>
        </div>
      </div>

      {/* Grid semanal de 7 columnas */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 animate-pulse font-medium">
            Cargando clases de la semana...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day, idx) => {
            const dayClasses = classesByDay.get(idx) ?? [];
            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col rounded-xl border p-3 min-h-[350px] transition-all ${
                  isToday
                    ? "border-indigo-400 bg-indigo-50/20 dark:border-indigo-600 dark:bg-indigo-950/20"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60"
                }`}
              >
                {/* Cabecera del día */}
                <div className="border-b border-zinc-200 pb-2 mb-3 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {DAY_NAMES[idx]}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {formatDateHeader(day)}
                    </p>
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      Hoy
                    </span>
                  )}
                </div>

                {/* Lista de clases del día */}
                <div className="flex flex-1 flex-col gap-2.5">
                  {dayClasses.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-xs text-zinc-400 italic">
                        Sin clases
                      </span>
                    </div>
                  ) : (
                    dayClasses.map((item) => {
                      const isCancelled = item.status === "CANCELLED";

                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg border p-3 text-xs shadow-2xs transition-all ${
                            isCancelled
                              ? "border-zinc-200 bg-zinc-100/70 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 opacity-70"
                              : "border-zinc-200 bg-zinc-50/70 hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-800/80 dark:hover:border-indigo-600"
                          }`}
                        >
                          {/* Estado y Acciones */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                                isCancelled
                                  ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 line-through"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {isCancelled ? "Cancelada" : "Programada"}
                            </span>

                            {!isCancelled && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => onEditClass(item)}
                                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onCancelClass(item)}
                                  disabled={
                                    new Date(item.startsAt).getTime() <=
                                    Date.now()
                                  }
                                  className="text-[11px] font-semibold text-red-700 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Nombre de la clase (Tachada si cancelada) */}
                          <h4
                            className={`font-bold text-sm text-zinc-900 dark:text-zinc-100 ${
                              isCancelled
                                ? "line-through text-zinc-500 dark:text-zinc-400"
                                : ""
                            }`}
                          >
                            {item.name}
                          </h4>
                          {isCancelled && item.cancellationReason && (
                            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                              Motivo: {item.cancellationReason}
                            </p>
                          )}

                          {/* Horario */}
                          <p
                            className={`mt-1 font-medium text-zinc-700 dark:text-zinc-300 ${isCancelled ? "line-through" : ""}`}
                          >
                            🕒 {formatTime(item.startsAt)} -{" "}
                            {formatTime(item.endsAt)}
                          </p>

                          {/* Entrenador */}
                          <p
                            className={`mt-0.5 text-zinc-600 dark:text-zinc-400 ${isCancelled ? "line-through" : ""}`}
                          >
                            👤 {item.trainer?.fullName ?? "Sin entrenador"}
                          </p>

                          {/* Reservas confirmadas / Cupo */}
                          <div
                            className={`mt-2 flex items-center justify-between pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/50 ${isCancelled ? "line-through" : ""}`}
                          >
                            <span className="text-zinc-500 font-medium">
                              Reservas:
                            </span>
                            <span
                              className={`font-bold ${
                                item.confirmedReservations >= item.capacity
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              {item.confirmedReservations} / {item.capacity}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
