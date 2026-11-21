"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  KeyRound,
  Package as PackageIcon,
  RotateCw,
  Search,
} from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import {
  CONDOMINIUM,
  PICKUP_LOCATION,
  formatDate,
  formatTime,
  readError,
  type MyPackagePage,
  type PackageStatus,
} from "@/lib/paquetes";

type Tab = "TODOS" | PackageStatus;

const TABS: { value: Tab; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "PENDIENTE_RETIRO", label: "Pendientes de retiro" },
  { value: "ENTREGADO", label: "Entregados" },
];

const EMPTY_MESSAGE: Record<Tab, string> = {
  TODOS: "Aún no hay paquetes registrados para tu unidad.",
  PENDIENTE_RETIRO: "No tienes paquetes pendientes de retiro.",
  ENTREGADO: "Todavía no hay paquetes entregados para tu unidad.",
};

function shortDate(iso: string): string {
  return `${formatDate(iso).split(" ").slice(0, 2).join(" ")} · ${formatTime(iso)}`;
}

export default function MyPackages({
  residentName,
  unitCode,
}: {
  residentName: string;
  unitCode: string | null;
}) {
  const [tab, setTab] = useState<Tab>("TODOS");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<MyPackagePage | null>(null);
  const [result, setResult] = useState<{ key: string; error: string | null } | null>(null);

  const requestKey = `${attempt}|${tab}|${q}|${page}`;
  const isLoading = result?.key !== requestKey;
  const error = isLoading ? null : (result?.error ?? null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (tab !== "TODOS") params.set("estado", tab);
    if (q) params.set("q", q);

    fetch(`/api/paquetes/mis-paquetes?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return (await res.json()) as MyPackagePage;
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
          error: e instanceof Error ? e.message : "No se pudieron cargar tus paquetes.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [tab, q, page, requestKey]);

  const selectTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const items = data?.items ?? [];
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? from + items.length - 1 : 0;
  const pending = data?.pendingCount ?? 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Paquetes</p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">Mis paquetes</h1>
        <p className="text-gray-600">
          Consulta tus paquetes recibidos en caseta y el historial de entregas de tu unidad.
        </p>
      </div>

      {pending > 0 && (
        <div className="bg-[#0a2f1f] text-white rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <PackageIcon size={22} />
            </span>
            <div>
              <p className="font-semibold">
                {pending === 1
                  ? "Tienes 1 paquete pendiente de retiro"
                  : `Tienes ${pending} paquetes pendientes de retiro`}
              </p>
              <p className="text-sm text-gray-200 mt-1">
                Abre el detalle de cada paquete y presenta su código al personal de seguridad.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-[#c9b98f]">Punto de retiro</p>
            <p className="text-sm font-semibold mt-1">
              {PICKUP_LOCATION} · {CONDOMINIUM}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Paquetes de {residentName}</h2>
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filtrar por estado">
            {TABS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => selectTab(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  tab === value ? "bg-[#0a2f1f] text-white" : "bg-[#f5f0e6] text-gray-900 hover:bg-[#ece4d4]"
                }`}
              >
                {label} ({data ? data.counts[value] : "—"})
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
              <label htmlFor="buscar-mis-paquetes" className="sr-only">
                Buscar por identificador o transportista
              </label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                id="buscar-mis-paquetes"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por identificador o transportista"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] outline-none"
              />
            </div>
            <span className="text-xs text-gray-600">Orden: recepción más reciente ↓</span>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f5f0e6] text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3">Paquete / Destinatario</th>
                <th scope="col" className="px-4 py-3">Transportista</th>
                <th scope="col" className="px-4 py-3">Recepción ↓</th>
                <th scope="col" className="px-4 py-3">Estado / Entrega</th>
                <th scope="col" className="px-6 py-3">Consultar</th>
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
                    {q ? "No hay paquetes que coincidan con tu búsqueda." : EMPTY_MESSAGE[tab]}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                items.map((pkg) => {
                  const isPending = pkg.status === "PENDIENTE_RETIRO";
                  return (
                    <tr
                      key={pkg.id}
                      className={`border-t border-gray-200 transition ${isPending ? "bg-[#e6f0eb]/60" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-6 py-5">
                        <p className="font-semibold text-gray-900 text-sm">{pkg.folio}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {pkg.recipientName} · {pkg.unit.code}
                        </p>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-900">{pkg.carrier}</td>
                      <td className="px-4 py-5 text-sm text-gray-900">
                        <p>{formatDate(pkg.receivedAt)}</p>
                        <p className="text-gray-600">{formatTime(pkg.receivedAt)}</p>
                      </td>
                      <td className="px-4 py-5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f0e6] text-xs font-semibold text-gray-900">
                            <Clock size={14} /> Pendiente de retiro
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6f0eb] text-xs font-semibold text-gray-900">
                              <Check size={14} /> Entregado
                            </span>
                            {pkg.deliveredAt && (
                              <p className="text-xs text-gray-600 mt-2">
                                {shortDate(pkg.deliveredAt)}
                                <br />
                                Recibió: {pkg.deliveredTo}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <Link
                          href={`/paquetes/${pkg.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0a2f1f] hover:underline"
                        >
                          Ver detalle <ArrowRight size={16} />
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
              ? `${from}–${to} de ${data.total} ${data.total === 1 ? "paquete" : "paquetes"} · Solo tus paquetes${unitCode ? ` · Unidad ${unitCode}` : ""}`
              : "Sin paquetes"}
          </span>
          {data && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(data.page - 1)}
                disabled={data.page <= 1 || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-3 py-1 rounded bg-[#e6f0eb] font-semibold text-gray-900">{data.page}</span>
              <button
                type="button"
                onClick={() => setPage(data.page + 1)}
                disabled={data.page >= data.totalPages || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 mt-6 items-start">
        <div className="flex items-start gap-3 p-2">
          <KeyRound className="text-[#0a2f1f] shrink-0 mt-1" size={20} />
          <div>
            <p className="font-semibold text-gray-900">Tu código, listo para recoger</p>
            <p className="text-sm text-gray-600 mt-1">
              Entra a «Ver detalle», consulta el código de retiro y muéstralo en caseta. Cada paquete
              pendiente tiene su propio código.
            </p>
          </div>
        </div>
        <div className="bg-[#f5f0e6] rounded-xl p-5">
          <p className="font-semibold text-gray-900">La entrega la registra seguridad</p>
          <p className="text-sm text-gray-600 mt-1">
            Cuando recojas tu paquete, el personal confirmará la entrega. Después aparecerá como
            «Entregado» en tu historial.
          </p>
        </div>
      </div>

      <InfoTimestamp />
    </div>
  );
}
