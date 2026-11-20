"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrainerShell } from "@/src/components/trainer/trainer-shell";
import {
  WEEKDAY_SHORT,
  addDays,
  getMonday,
  nextFreeSlot,
  slotsPerWeekday,
} from "@/src/lib/availability";
import { fetchAvailabilityBlocks } from "@/src/services/availability/availability-service";
import { fetchWeeklyClasses } from "@/src/services/classes/classes-service";
import { useAuthUser } from "@/src/stores/useAuthStore";
import type { AvailabilityBlock } from "@/src/types/availability";
import type { GymClass } from "@/src/types/classes";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function TrainerHomePage() {
  const user = useAuthUser();
  const userId = user?.id ?? null;
  const firstName = user?.fullName.split(" ")[0] ?? "";

  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "TRAINER") return;
    let cancelled = false;

    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);

    Promise.all([fetchAvailabilityBlocks(), fetchWeeklyClasses(from, to)]).then(
      ([blocksRes, classesRes]) => {
        if (cancelled) return;
        setBlocks(blocksRes.ok && blocksRes.data ? blocksRes.data : []);
        setBlocksError(blocksRes.ok ? null : (blocksRes.error ?? "No se pudo cargar tu disponibilidad."));
        setClasses(classesRes.ok && classesRes.data ? classesRes.data : []);
        setClassesError(classesRes.ok ? null : (classesRes.error ?? "No se pudo cargar tu agenda."));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const todayClasses = useMemo(
    () =>
      classes
        .filter((c) => c.trainerId === userId && c.status === "SCHEDULED")
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [classes, userId],
  );

  const monday = useMemo(() => getMonday(new Date()), []);
  const perDay = useMemo(() => slotsPerWeekday(blocks), [blocks]);
  const totalSlots = perDay.reduce((a, b) => a + b, 0);
  const next = useMemo(() => nextFreeSlot(blocks, monday, new Date()), [blocks, monday]);
  const sunday = addDays(monday, 6);
  const completed = todayClasses.filter((c) => new Date(c.endsAt) < new Date()).length;

  return (
    <TrainerShell
      active="jornada"
      crumbs={
        <>
          Mi club &nbsp;›&nbsp; <b className="font-semibold text-tr-ink">Mi jornada</b>
        </>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-1 text-[10px] font-bold tracking-[.08em] text-tr-muted">
            ENTRENAMIENTO PERSONAL Y GRUPAL
          </div>
          <h1 className="text-[29px] font-normal tracking-tight">Tu jornada, {firstName}.</h1>
          <p className="mt-1 text-xs text-tr-muted">
            {loading
              ? "Cargando tu jornada..."
              : `Hoy tienes ${todayClasses.length} ${todayClasses.length === 1 ? "clase" : "clases"}. Haz que cada entrenamiento cuente.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/entrenador/agenda"
            className="flex h-10 items-center rounded-lg border border-tr-line bg-white px-4 text-xs"
          >
            🗓️ Ver sesiones personales
          </Link>
          <Link
            href="/trainer/agenda"
            className="flex h-10 items-center rounded-lg border border-tr-accent bg-tr-accent px-4 text-xs"
          >
            + Agregar mi horario
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_368px]">
        <div className="rounded-xl border border-tr-line bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-normal">Agenda de hoy</h2>
            <Link href="/trainer/agenda" className="text-[11px] font-semibold text-tr-green">
              Abrir agenda ↗
            </Link>
          </div>
          {classesError && (
            <p role="alert" className="mb-3 rounded-lg bg-tr-red-soft px-3 py-2.5 text-[11px] text-tr-red">
              {classesError}
            </p>
          )}
          {!loading && !classesError && todayClasses.length === 0 && (
            <p className="py-3 text-xs text-tr-muted">No tienes clases grupales programadas hoy.</p>
          )}
          <ul className="flex flex-col gap-2">
            {todayClasses.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-tr-bg px-3.5 py-3"
              >
                <div>
                  <div className="text-[13px] font-semibold">{c.name}</div>
                  <div className="text-[11px] text-tr-muted">
                    {formatTime(c.startsAt)}–{formatTime(c.endsAt)} · Clase grupal
                  </div>
                </div>
                <div className="text-[11px] text-tr-muted">
                  {c.confirmedReservations}/{c.capacity} reservas
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] text-tr-muted">
            Las sesiones personales agendadas se mostrarán aquí cuando el backend exponga su consulta.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-tr-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-normal">Mi disponibilidad</h2>
              <Link href="/trainer/agenda" className="text-[11px] font-semibold text-tr-green">
                Editar horarios ↗
              </Link>
            </div>
            <div className="mb-3.5 mt-1 text-[10px] text-tr-muted">
              Esta semana · {monday.getDate()} – {sunday.getDate()} {MONTHS[sunday.getMonth()]}
            </div>
            {blocksError ? (
              <p role="alert" className="rounded-lg bg-tr-red-soft px-3 py-2.5 text-[11px] text-tr-red">
                {blocksError}
              </p>
            ) : (
              <>
                <div className="mb-2.5 flex gap-2.5">
                  <div className="flex-1 rounded-lg bg-tr-bg p-2.5">
                    <div className="text-xl tracking-tight">{totalSlots}</div>
                    <div className="text-[10px] text-tr-muted">Espacios libres</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-tr-bg p-2.5">
                    <div className="text-xl tracking-tight">0</div>
                    <div className="text-[10px] text-tr-muted">Agendados</div>
                  </div>
                </div>
                <div className="my-3 grid grid-cols-7 gap-1.5">
                  {perDay.map((n, i) => (
                    <div
                      key={i}
                      className={`rounded-[7px] py-2 text-center text-[10px] ${
                        n ? "bg-tr-accent-soft text-tr-green" : "bg-tr-bg text-tr-muted"
                      }`}
                    >
                      <b className={`block text-[13px] ${n ? "text-tr-green" : "text-tr-ink"}`}>{n}</b>
                      {WEEKDAY_SHORT[i]}
                    </div>
                  ))}
                </div>
                <div className="text-[11px]">
                  {loading ? (
                    "Cargando..."
                  ) : next ? (
                    <>
                      Próximo espacio libre:{" "}
                      <b>
                        {WEEKDAY_SHORT[next.weekdayIndex]} {next.date.getDate()} ·{" "}
                        {String(next.date.getHours()).padStart(2, "0")}:
                        {String(next.date.getMinutes()).padStart(2, "0")}
                      </b>
                    </>
                  ) : (
                    "No quedan espacios libres esta semana."
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl bg-tr-sidebar p-[18px] text-white">
            <div className="text-xs text-[#aab5ab]">Clases de hoy</div>
            <div className="text-[29px] tracking-tight">{todayClasses.length}</div>
            <div className="text-[10px] text-tr-accent">
              {completed} completadas · {todayClasses.length - completed} por delante
            </div>
          </div>
        </div>
      </div>
    </TrainerShell>
  );
}
