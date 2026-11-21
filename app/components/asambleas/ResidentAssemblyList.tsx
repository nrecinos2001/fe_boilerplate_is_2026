"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, RotateCw, Search, Vote } from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import { CONDOMINIO } from "@/lib/condominio";
import { formatDate, formatTime, readError } from "@/lib/paquetes";
import {
  RESIDENT_STATUS_LABEL,
  STATUS_STYLE,
  TYPE_LABEL,
  shortDateTime,
  type AssemblyPage,
  type AssemblyStatus,
  type AssemblySummary,
} from "@/lib/asambleas";

type Tab = "" | "ABIERTA" | "PROGRAMADA" | "CERRADA";

const TABS: { value: Tab; label: string; key: "TODAS" | AssemblyStatus }[] = [
  { value: "", label: "Todas", key: "TODAS" },
  { value: "ABIERTA", label: "Abiertas", key: "ABIERTA" },
  { value: "PROGRAMADA", label: "Próximas", key: "PROGRAMADA" },
  { value: "CERRADA", label: "Cerradas", key: "CERRADA" },
];

function action(a: AssemblySummary, canVote: boolean): string {
  if (a.status === "ABIERTA") {
    return canVote && (a.pendingVotesForUnit ?? 0) > 0 ? "Ver y votar" : "Ver votación";
  }
  if (a.status === "PROGRAMADA") return "Ver convocatoria";
  return "Ver detalle";
}

function voteNote(a: AssemblySummary, canVote: boolean): string {
  if (a.status === "PROGRAMADA") return "Aún no disponible";
  if (a.status === "CERRADA") return "Votación finalizada";
  if (canVote && a.pendingVotesForUnit === 0) return "Tu unidad ya votó";
  return a.votingClosesAt ? `Hasta el ${shortDateTime(a.votingClosesAt)}` : "";
}

export default function ResidentAssemblyList({
  canVote,
  unitCode,
}: {
  canVote: boolean;
  unitCode: string | null;
}) {
  const [tab, setTab] = useState<Tab>("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<AssemblyPage | null>(null);
  const [result, setResult] = useState<{ key: string; error: string | null } | null>(null);

  const requestKey = `${attempt}|${tab}|${q}|${page}`;
  const isLoading = result?.key !== requestKey;
  const error = isLoading ? null : (result?.error ?? null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (tab) params.set("estado", tab);
    if (q) params.set("q", q);

    fetch(`/api/asambleas?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return (await res.json()) as AssemblyPage;
      })
      .then((next) => {
        if (cancelled) return;
        setData(next);
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
  }, [tab, q, page, requestKey]);

  const items = data?.items ?? [];
  const pending = canVote
    ? items.find((a) => a.status === "ABIERTA" && (a.pendingVotesForUnit ?? 0) > 0)
    : undefined;
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? from + items.length - 1 : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Asambleas</p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">Asambleas</h1>
        <p className="text-gray-600">
          Infórmate sobre los temas de tu comunidad y participa en las votaciones disponibles.
        </p>
      </div>

      {pending && (
        <div className="bg-[#0a2f1f] text-white rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Vote size={22} />
            </span>
            <div>
              <p className="font-semibold">Hay una votación abierta para tu unidad</p>
              <p className="text-sm text-gray-200 mt-1">
                {pending.title}
                {pending.votingClosesAt ? ` · Puedes votar hasta el ${shortDateTime(pending.votingClosesAt)}.` : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-[#c9b98f]">Tu participación</p>
            <p className="text-sm font-semibold mt-1">
              {unitCode ?? "Tu unidad"} · Voto pendiente
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Asambleas de {CONDOMINIO.nombre}</h2>
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filtrar por estado">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => {
                  setTab(t.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  tab === t.value ? "bg-[#0a2f1f] text-white" : "bg-[#f5f0e6] text-gray-900 hover:bg-[#ece4d4]"
                }`}
              >
                {t.label} ({data ? data.counts[t.key] : "—"})
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQ(search.trim());
              setPage(1);
            }}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="relative w-full max-w-sm">
              <label htmlFor="buscar-asamblea" className="sr-only">
                Buscar por título o identificador
              </label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                id="buscar-asamblea"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título o identificador"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] outline-none"
              />
            </div>
            <span className="text-xs text-gray-600">Orden: fecha más reciente ↓</span>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f5f0e6] text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3">Asamblea / Identificador</th>
                <th scope="col" className="px-4 py-3">Fecha y horario</th>
                <th scope="col" className="px-4 py-3">Estado / Votación</th>
                <th scope="col" className="px-6 py-3">Consultar</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td colSpan={4} className="px-6 py-5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
              {!isLoading && error && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <p className="text-red-700 mb-3">{error}</p>
                    <button
                      type="button"
                      onClick={() => setAttempt((a) => a + 1)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                    >
                      <RotateCw size={16} /> Reintentar
                    </button>
                  </td>
                </tr>
              )}
              {!isLoading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-600">
                    No hay asambleas con estos filtros.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                items.map((a) => {
                  const highlight = canVote && a.status === "ABIERTA" && (a.pendingVotesForUnit ?? 0) > 0;
                  return (
                    <tr key={a.id} className={`border-t border-gray-200 ${highlight ? "bg-[#e6f0eb]" : "hover:bg-gray-50"}`}>
                      <td className="px-6 py-5">
                        <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {a.folio} · {TYPE_LABEL[a.type]}
                        </p>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-900">
                        <p>{formatDate(a.startsAt)}</p>
                        <p className="text-gray-600">
                          {formatTime(a.startsAt).replace(" h", "")}–{formatTime(a.endsAt)}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[a.status]}`}>
                          {RESIDENT_STATUS_LABEL[a.status]}
                        </span>
                        <p className="text-xs text-gray-600 mt-2">{voteNote(a, canVote)}</p>
                      </td>
                      <td className="px-6 py-5">
                        <Link
                          href={`/asambleas/${a.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0a2f1f] hover:underline"
                        >
                          {action(a, canVote)} <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3 text-sm text-gray-600">
          <span>
            {data && data.total > 0
              ? `${from}–${to} de ${data.total} ${data.total === 1 ? "asamblea" : "asambleas"} · ${CONDOMINIO.nombre}`
              : "Sin asambleas"}
          </span>
          {data && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={data.page <= 1 || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400"
              >
                Anterior
              </button>
              <span className="px-3 py-1 rounded bg-[#e6f0eb] font-semibold text-gray-900">{data.page}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.page >= data.totalPages || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 mt-6 items-start">
        <div className="flex items-start gap-3 p-2">
          <Vote className="text-[#0a2f1f] shrink-0 mt-1" size={20} />
          <div>
            <p className="font-semibold text-gray-900">Tu voz forma parte de la comunidad</p>
            <p className="text-sm text-gray-600 mt-1">
              Abre una asamblea para consultar la convocatoria, revisar la propuesta y elegir tu voto
              mientras el plazo esté abierto.
            </p>
          </div>
        </div>
        <div className="bg-[#f5f0e6] rounded-xl p-5 flex items-start gap-3">
          <Info className="text-[#0a2f1f] shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold text-gray-900">Revisa antes de confirmar</p>
            <p className="text-sm text-gray-600 mt-1">
              Antes de enviar verás un resumen de tu elección. Una vez confirmado y enviado, tu voto no
              se puede modificar. Se registra un solo voto por unidad.
            </p>
          </div>
        </div>
      </div>

      <InfoTimestamp />
    </div>
  );
}
