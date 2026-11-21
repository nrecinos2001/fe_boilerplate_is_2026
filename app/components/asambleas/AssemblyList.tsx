"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Info,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import { CONDOMINIO } from "@/lib/condominio";
import { formatDate, formatTime, readError } from "@/lib/paquetes";
import {
  MODALITY_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  TYPE_LABEL,
  shortDateTime,
  type AssemblyPage,
  type AssemblyStatus,
  type AssemblySummary,
} from "@/lib/asambleas";

type Filters = { q: string; estado: "" | AssemblyStatus; desde: string; hasta: string; page: number };

const EMPTY: Filters = { q: "", estado: "", desde: "", hasta: "", page: 1 };

const CHIPS: { value: "" | AssemblyStatus; label: string; key: "TODAS" | AssemblyStatus }[] = [
  { value: "", label: "Todas", key: "TODAS" },
  { value: "BORRADOR", label: "Borrador", key: "BORRADOR" },
  { value: "PROGRAMADA", label: "Programada", key: "PROGRAMADA" },
  { value: "ABIERTA", label: "Abierta", key: "ABIERTA" },
  { value: "CERRADA", label: "Cerradas", key: "CERRADA" },
];

function StatusBadge({ status }: { status: AssemblyStatus }) {
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function meeting(a: AssemblySummary) {
  return (
    <>
      <p>{formatDate(a.startsAt)}</p>
      <p className="text-gray-600">
        {formatTime(a.startsAt).replace(" h", "")}–{formatTime(a.endsAt)}
      </p>
    </>
  );
}

export default function AssemblyList({
  savedFolio,
  publishedFolio,
}: {
  savedFolio: string | null;
  publishedFolio: string | null;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<AssemblyPage | null>(null);
  const [result, setResult] = useState<{ key: string; error: string | null } | null>(null);
  const [notice, setNotice] = useState(Boolean(savedFolio || publishedFolio));

  const requestKey = `${attempt}|${JSON.stringify(filters)}`;
  const isLoading = result?.key !== requestKey;
  const error = isLoading ? null : (result?.error ?? null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(filters.page) });
    if (filters.q) params.set("q", filters.q);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.desde) params.set("desde", filters.desde);
    if (filters.hasta) params.set("hasta", filters.hasta);

    fetch(`/api/asambleas?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return (await res.json()) as AssemblyPage;
      })
      .then((page) => {
        if (cancelled) return;
        setData(page);
        setResult({ key: requestKey, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          error: e instanceof Error ? e.message : "No se pudieron cargar las asambleas.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [filters, requestKey]);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...draft, q: draft.q.trim(), page: 1 });
  };

  const selectStatus = (estado: "" | AssemblyStatus) => {
    setDraft((d) => ({ ...d, estado }));
    setFilters((f) => ({ ...f, estado, page: 1 }));
  };

  const items = data?.items ?? [];
  const firstDraft = items.find((a) => a.status === "BORRADOR");
  const lastClosed = items.find((a) => a.status === "CERRADA");
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? from + items.length - 1 : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Participación de la comunidad
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">Asambleas</h1>
          <p className="text-gray-600">
            Consulta las convocatorias, sigue sus plazos y el estado de cada votación.
          </p>
        </div>
        <Link
          href="/admin/asambleas/nueva"
          className="flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition"
        >
          <CalendarPlus size={18} /> Convocar asamblea
        </Link>
      </div>

      {notice && (savedFolio || publishedFolio) && (
        <div role="status" className="bg-[#e6f0eb] rounded-xl p-4 flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-[#0a2f1f] mt-0.5" size={22} />
            <div>
              <p className="font-semibold text-gray-900">
                {publishedFolio ? "Convocatoria publicada" : "Borrador guardado"}
              </p>
              <p className="text-sm text-gray-600">
                {publishedFolio
                  ? `${publishedFolio} ya es visible para los residentes y se envió el aviso a todas las unidades.`
                  : `${savedFolio} quedó guardada como borrador; aún no es visible para los residentes.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotice(false)}
            aria-label="Cerrar aviso"
            className="text-gray-500 hover:text-gray-900"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <form onSubmit={apply} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end mb-4">
        <div>
          <label htmlFor="buscar" className="block text-xs font-medium text-gray-700 mb-1">
            Buscar asamblea
          </label>
          <div className="relative">
            <input
              id="buscar"
              type="search"
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              placeholder="Título o folio"
              className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          </div>
        </div>
        <fieldset>
          <legend className="block text-xs font-medium text-gray-700 mb-1">Periodo de reunión</legend>
          <div className="flex gap-2">
            <label htmlFor="desde" className="sr-only">Desde</label>
            <input
              id="desde"
              type="date"
              value={draft.desde}
              onChange={(e) => setDraft((d) => ({ ...d, desde: e.target.value }))}
              className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#0a2f1f] outline-none"
            />
            <label htmlFor="hasta" className="sr-only">Hasta</label>
            <input
              id="hasta"
              type="date"
              value={draft.hasta}
              onChange={(e) => setDraft((d) => ({ ...d, hasta: e.target.value }))}
              className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#0a2f1f] outline-none"
            />
          </div>
        </fieldset>
        <div>
          <label htmlFor="estado" className="block text-xs font-medium text-gray-700 mb-1">
            Estado
          </label>
          <div className="relative">
            <select
              id="estado"
              value={draft.estado}
              onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value as Filters["estado"] }))}
              className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#0a2f1f] outline-none"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABEL) as AssemblyStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
          </div>
        </div>
        <button
          type="submit"
          className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Aplicar filtros
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Filtrar por estado">
        {CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={filters.estado === chip.value}
            onClick={() => selectStatus(chip.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              filters.estado === chip.value
                ? "bg-[#0a2f1f] text-white"
                : "bg-[#f5f0e6] text-gray-900 hover:bg-[#ece4d4]"
            }`}
          >
            {chip.label} · {data ? data.counts[chip.key] : "—"}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Convocatorias de {CONDOMINIO.nombre}</h2>
          <p className="text-xs text-gray-500 mt-1">
            Filtros: {filters.desde || filters.hasta ? `${filters.desde || "…"} a ${filters.hasta || "…"}` : "todo el periodo"} ·{" "}
            {filters.estado ? STATUS_LABEL[filters.estado] : "Todos los estados"}
            {filters.q ? ` · “${filters.q}”` : ""} · Orden: reunión más reciente primero
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-[#f5f0e6] text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3">Asamblea</th>
                <th scope="col" className="px-4 py-3">Reunión</th>
                <th scope="col" className="px-4 py-3">Plazo de votación</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-6 py-3">Acceso</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td colSpan={5} className="px-6 py-5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}

              {!isLoading && error && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <p className="text-red-700 mb-3">{error}</p>
                    <button
                      type="button"
                      onClick={() => setAttempt((a) => a + 1)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      <RotateCw size={16} /> Reintentar
                    </button>
                  </td>
                </tr>
              )}

              {!isLoading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-600">
                    No hay asambleas con estos filtros.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                items.map((a) => (
                  <tr key={a.id} className="border-t border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {a.status === "BORRADOR"
                          ? `${TYPE_LABEL[a.type]} · ${MODALITY_LABEL[a.modality]} · Borrador`
                          : `${a.folio} · ${a.publishedAt ? `Publicada el ${formatDate(a.publishedAt)}` : TYPE_LABEL[a.type]}`}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-900">{meeting(a)}</td>
                    <td className="px-4 py-5 text-sm text-gray-900">
                      {a.votingOpensAt && a.votingClosesAt ? (
                        <>
                          <p>{shortDateTime(a.votingOpensAt)}</p>
                          <p>{shortDateTime(a.votingClosesAt)}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-6 py-5">
                      <Link
                        href={a.status === "BORRADOR" ? `/admin/asambleas/${a.id}/editar` : a.status === "CERRADA" ? `/admin/asambleas/${a.id}/resultados` : `/admin/asambleas/${a.id}`}
                        className="text-sm font-semibold text-[#0a2f1f] underline underline-offset-4 hover:text-[#164a33]"
                      >
                        {a.status === "BORRADOR" ? "Editar borrador" : a.status === "CERRADA" ? "Ver resultados" : "Ver convocatoria"}
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3 text-sm text-gray-600">
          <span>
            {data && data.total > 0
              ? `${from}–${to} de ${data.total} ${data.total === 1 ? "asamblea" : "asambleas"} · Página ${data.page} de ${data.totalPages}`
              : "Sin asambleas"}
          </span>
          {data && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={data.page <= 1 || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-3 py-1 rounded bg-[#e6f0eb] font-semibold text-gray-900">{data.page}</span>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={data.page >= data.totalPages || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      {(firstDraft || lastClosed) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {firstDraft && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900">{firstDraft.title} sigue en borrador</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4">Convocatoria existente · Pendiente de publicación</p>
              <p className="text-sm text-gray-700 mb-4">
                Reunión: {formatDate(firstDraft.startsAt)}, {formatTime(firstDraft.startsAt)}, en {firstDraft.location}.
                {firstDraft.votingOpensAt && firstDraft.votingClosesAt
                  ? ` Votación prevista del ${shortDateTime(firstDraft.votingOpensAt)} al ${shortDateTime(firstDraft.votingClosesAt)}.`
                  : ""}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {firstDraft.agendaCount} puntos de agenda · {firstDraft.topicCount}{" "}
                {firstDraft.topicCount === 1 ? "propuesta" : "propuestas"}
              </p>
              <Link
                href={`/admin/asambleas/${firstDraft.id}/editar`}
                className="inline-block px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Continuar revisión
              </Link>
            </div>
          )}
          {lastClosed && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900">Última votación cerrada</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                {lastClosed.folio} · {lastClosed.title}
              </p>
              <p className="text-sm text-gray-700 mb-4">
                La votación cerró el {lastClosed.votingClosesAt ? shortDateTime(lastClosed.votingClosesAt) : "—"}.
                Consulta el recuento por opción, la participación y los eventos del proceso.
              </p>
              <Link
                href={`/admin/asambleas/${lastClosed.id}/resultados`}
                className="inline-block px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33]"
              >
                Resultados y auditoría
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-[#e6f0eb] rounded-xl p-5 flex items-start gap-4">
        <Info className="text-[#0a2f1f] mt-0.5 shrink-0" size={22} />
        <div>
          <p className="font-semibold text-gray-900">Publicación y votación son estados distintos</p>
          <p className="text-sm text-gray-600 mt-1">
            El borrador no es visible para residentes. Una convocatoria publicada y programada
            solo admite votos al llegar su apertura; sus propuestas pueden editarse hasta entonces.
          </p>
        </div>
      </div>

      <InfoTimestamp />
    </div>
  );
}
