"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrainerShell } from "@/src/components/trainer/trainer-shell";
import {
  GRID_HOURS,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  addDays,
  blockAtCell,
  formatMinutes,
  getMonday,
  slotCount,
  validateRange,
} from "@/src/lib/availability";
import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  fetchAvailabilityBlocks,
} from "@/src/services/availability/availability-service";
import type { AvailabilityBlock } from "@/src/types/availability";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  return `${monday.getDate()} – ${sunday.getDate()} ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

const fieldClass =
  "h-[38px] w-full rounded-lg border bg-white px-2.5 text-tr-ink outline-none focus:border-tr-green";

export default function AgendaPage() {
  const [monday, setMonday] = useState<Date>(() => getMonday(new Date()));
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [weekdayIndex, setWeekdayIndex] = useState(0);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("16:00");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAvailabilityBlocks().then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setBlocks(res.data);
        setLoadError(null);
      } else {
        setLoadError(res.error ?? "No se pudo cargar la disponibilidad.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const rangeError = validateRange(start, end);
  const slots = rangeError ? 0 : slotCount(start, end);
  const leftover = rangeError ? 0 : (toMin(end) - toMin(start)) % 60;
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const todayKey = new Date().toDateString();

  function clearFeedback() {
    setApiError(null);
    setNotice(null);
  }

  function handleCellClick(dayIdx: number, hour: number) {
    clearFeedback();
    const block = blockAtCell(blocks, dayIdx + 1, hour);
    setWeekdayIndex(dayIdx);
    if (block) {
      setSelectedId(block.id);
      setStart(block.startTime);
      setEnd(block.endTime);
    } else {
      setSelectedId(null);
      setStart(formatMinutes(hour * 60));
      setEnd(formatMinutes((hour + 1) * 60));
    }
  }

  async function handleSave() {
    clearFeedback();
    if (rangeError || busy) return;
    setBusy(true);
    const res = await createAvailabilityBlock({
      weekday: weekdayIndex + 1,
      startTime: start,
      endTime: end,
    });
    setBusy(false);
    if (!res.ok) {
      setApiError(res.error ?? "No se pudo guardar el bloque.");
      return;
    }
    setSelectedId(res.data?.id ?? null);
    setNotice(`Bloque guardado: ${WEEKDAY_LONG[weekdayIndex]} ${start}–${end}.`);
    reload();
  }

  async function handleDelete() {
    clearFeedback();
    if (!selectedId || busy) return;
    if (!window.confirm("¿Eliminar este bloque?")) return;
    setBusy(true);
    const res = await deleteAvailabilityBlock(selectedId);
    setBusy(false);
    if (!res.ok) {
      setApiError(
        res.status === 409
          ? "Este bloque tiene sesiones agendadas y no se puede eliminar."
          : (res.error ?? "No se pudo eliminar el bloque."),
      );
      return;
    }
    setSelectedId(null);
    setNotice(`Bloque eliminado (${slotCount(start, end)} espacios).`);
    reload();
  }

  const shownError = apiError ?? rangeError;

  return (
    <TrainerShell
      active="agenda"
      crumbs={
        <>
          Mi club &nbsp;›&nbsp; Mi agenda &nbsp;›&nbsp;{" "}
          <b className="font-semibold text-tr-ink">Horarios disponibles</b>
        </>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-1 text-[10px] font-bold tracking-[.08em] text-tr-muted">
            AGENDA PERSONAL
          </div>
          <h1 className="text-[29px] font-normal tracking-tight">Mis horarios disponibles</h1>
          <p className="mt-1 text-xs text-tr-muted">
            Haz clic en los espacios de 60 min en los que das sesiones personales. Tu
            disponibilidad se repite cada semana.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setMonday((m) => addDays(m, -7))}
            className="size-[34px] rounded-md border border-tr-line bg-white"
          >
            ‹
          </button>
          <div className="min-w-[150px] text-center text-[13px] font-semibold">
            {formatRange(monday)}
          </div>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setMonday((m) => addDays(m, 7))}
            className="size-[34px] rounded-md border border-tr-line bg-white"
          >
            ›
          </button>
          <Link
            href="/trainer"
            className="flex h-10 items-center rounded-lg border border-tr-line bg-white px-4 text-xs"
          >
            Ver mi jornada
          </Link>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-[#efc9c2] bg-tr-red-soft px-3 py-2.5 text-[11px] text-tr-red">
          <span>{loadError}</span>
          <button type="button" onClick={reload} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_368px]">
        <div className="min-w-0 rounded-xl border border-tr-line bg-white p-5">
          <h2 className="mb-1 text-[15px] font-normal">
            Semana del {monday.getDate()} al {addDays(monday, 6).getDate()}
          </h2>
          <p className="mb-3.5 text-[10px] text-tr-muted">
            Cada espacio dura 60 min. Selecciona un espacio para editar su bloque en el panel.
          </p>
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[620px] items-stretch gap-1"
              style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
              aria-busy={loading}
            >
              <div />
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`pb-1.5 text-center text-[10px] font-semibold text-tr-muted ${
                    d.toDateString() === todayKey ? "text-tr-green" : ""
                  }`}
                >
                  <b className="text-tr-ink">{WEEKDAY_SHORT[i]}</b> {d.getDate()}
                </div>
              ))}
              {GRID_HOURS.map((hour) => (
                <Row
                  key={hour}
                  hour={hour}
                  blocks={blocks}
                  selectedId={selectedId}
                  onSelect={handleCellClick}
                />
              ))}
            </div>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-4 text-[10px] text-tr-muted">
            <span>
              <i className="mr-1.5 inline-block size-3 rounded-[3px] border border-tr-accent bg-tr-accent-soft align-[-2px]" />
              Disponible
            </span>
            <span>
              <i className="mr-1.5 inline-block size-3 rounded-[3px] border border-tr-green bg-tr-accent align-[-2px]" />
              Bloque seleccionado
            </span>
            <span>
              <i className="mr-1.5 inline-block size-3 rounded-[3px] border border-tr-line bg-white align-[-2px]" />
              Libre (sin oferta)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-tr-line bg-white p-5">
          <h2 className="mb-1 text-[15px] font-normal">
            {selectedId ? "Bloque seleccionado" : "Bloque nuevo"}
          </h2>
          <p className="mb-3.5 text-[10px] text-tr-muted">
            Define el rango; se divide en espacios de 60 min.
          </p>

          <label htmlFor="fDay" className="mb-1.5 mt-3.5 block text-[11px] font-semibold">
            Día
          </label>
          <select
            id="fDay"
            value={weekdayIndex}
            onChange={(e) => {
              clearFeedback();
              setSelectedId(null);
              setWeekdayIndex(Number(e.target.value));
            }}
            className={`${fieldClass} border-tr-line`}
          >
            {days.map((d, i) => (
              <option key={i} value={i}>
                {WEEKDAY_LONG[i]} {d.getDate()}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="fStart" className="mb-1.5 mt-3.5 block text-[11px] font-semibold">
                Hora de inicio
              </label>
              <input
                id="fStart"
                type="time"
                step={900}
                value={start}
                onChange={(e) => {
                  clearFeedback();
                  setSelectedId(null);
                  setStart(e.target.value);
                }}
                className={`${fieldClass} ${rangeError ? "border-tr-red" : "border-tr-line"}`}
              />
            </div>
            <div>
              <label htmlFor="fEnd" className="mb-1.5 mt-3.5 block text-[11px] font-semibold">
                Hora de fin
              </label>
              <input
                id="fEnd"
                type="time"
                step={900}
                value={end}
                onChange={(e) => {
                  clearFeedback();
                  setSelectedId(null);
                  setEnd(e.target.value);
                }}
                className={`${fieldClass} ${rangeError ? "border-tr-red" : "border-tr-line"}`}
              />
            </div>
          </div>

          {shownError && (
            <div role="alert" className="mt-3 rounded-lg border border-[#efc9c2] bg-tr-red-soft px-3 py-2.5 text-[11px] text-tr-red">
              {shownError}
            </div>
          )}

          <div className="mt-3 rounded-lg bg-tr-bg px-3 py-2.5 text-[11px] text-tr-muted">
            {rangeError ? (
              <>
                <b className="text-tr-ink">0 espacios</b> · corrige el rango para crear el bloque.
              </>
            ) : (
              <>
                <b className="text-tr-ink">
                  {slots} {slots === 1 ? "espacio" : "espacios"} de 60 min
                </b>{" "}
                · {WEEKDAY_LONG[weekdayIndex]} {start}–{end}
                {leftover ? ` · ${leftover} min no se ofrecen` : ""}
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!selectedId || busy}
              className="h-10 flex-1 rounded-lg border border-tr-line bg-white text-xs text-tr-red disabled:opacity-40"
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={Boolean(rangeError) || busy || Boolean(selectedId)}
              className="h-10 flex-1 rounded-lg border border-tr-accent bg-tr-accent text-xs disabled:opacity-40"
            >
              {busy ? "Guardando..." : "Guardar bloque"}
            </button>
          </div>

          {notice && (
            <div role="status" className="mt-3 rounded-lg bg-tr-green-soft px-3 py-2.5 text-[11px] text-tr-green">
              {notice}
            </div>
          )}
          <p className="mt-3.5 text-[10px] text-tr-muted">
            Eliminar pide confirmación. Un bloque con sesiones agendadas no se puede eliminar. Si
            el rango se cruza con otro bloque del mismo día, el sistema lo indica.
          </p>
        </div>
      </div>
    </TrainerShell>
  );
}

function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface RowProps {
  hour: number;
  blocks: AvailabilityBlock[];
  selectedId: string | null;
  onSelect: (dayIdx: number, hour: number) => void;
}

function Row({ hour, blocks, selectedId, onSelect }: RowProps) {
  return (
    <>
      <div className="pt-2 text-[10px] text-tr-muted">{formatMinutes(hour * 60)}</div>
      {Array.from({ length: 7 }, (_, dayIdx) => {
        const block = blockAtCell(blocks, dayIdx + 1, hour);
        const selected = block !== undefined && block.id === selectedId;
        const cls = selected
          ? "border-tr-green bg-tr-accent text-tr-green"
          : block
            ? "border-tr-accent bg-tr-accent-soft text-tr-green"
            : "border-[#f0f1ec] bg-white text-tr-muted hover:border-tr-accent";
        return (
          <button
            key={dayIdx}
            type="button"
            aria-pressed={selected}
            aria-label={`${WEEKDAY_LONG[dayIdx]} ${formatMinutes(hour * 60)}${block ? " disponible" : ""}`}
            onClick={() => onSelect(dayIdx, hour)}
            className={`flex h-9 select-none items-center justify-center rounded-[5px] border text-[9px] font-semibold ${cls}`}
          >
            {block ? "Disponible" : ""}
          </button>
        );
      })}
    </>
  );
}
