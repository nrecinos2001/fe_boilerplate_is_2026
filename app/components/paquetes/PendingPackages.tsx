"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PackagePlus,
  Search,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  X,
  RotateCw,
} from "lucide-react";
import PackageStatusBadge from "@/app/components/paquetes/PackageStatusBadge";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import {
  PICKUP_LOCATION,
  formatDate,
  formatTime,
  readError,
  type PackagePage,
} from "@/lib/paquetes";

type Filters = { q: string; empresa: string; page: number };

const EMPTY_FILTERS: Filters = { q: "", empresa: "", page: 1 };

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function PendingPackages({
  deliveredFolio,
}: {
  deliveredFolio: string | null;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [carrier, setCarrier] = useState("");
  const [data, setData] = useState<PackagePage | null>(null);
  const [result, setResult] = useState<{ key: string; error: string | null } | null>(null);
  const [showDelivered, setShowDelivered] = useState(Boolean(deliveredFolio));

  const requestKey = `${attempt}|${filters.page}|${filters.q}|${filters.empresa}`;
  const isLoading = result?.key !== requestKey;
  const error = isLoading ? null : (result?.error ?? null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(filters.page) });
    if (filters.q) params.set("q", filters.q);
    if (filters.empresa) params.set("empresa", filters.empresa);

    fetch(`/api/paquetes?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return (await res.json()) as PackagePage;
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
          error:
            e instanceof Error ? e.message : "No se pudieron cargar los paquetes.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [filters, requestKey]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ q: search.trim(), empresa: carrier, page: 1 });
  };

  const clearFilters = () => {
    setSearch("");
    setCarrier("");
    setFilters(EMPTY_FILTERS);
  };

  const goToPage = (page: number) => setFilters((f) => ({ ...f, page }));

  const hasFilters = Boolean(filters.q || filters.empresa);
  const items = data?.items ?? [];
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? from + items.length - 1 : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Paquetes
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">
            Paquetes pendientes
          </h1>
          <p className="text-gray-600">
            Paquetes bajo custodia en la caseta principal, aún sin entrega
            registrada.
          </p>
        </div>
        <Link
          href="/paquetes/nuevo"
          className="flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition"
        >
          <PackagePlus size={18} /> Registrar llegada
        </Link>
      </div>

      {showDelivered && deliveredFolio && (
        <div
          role="status"
          className="bg-[#e6f0eb] border border-[#cfe0d6] rounded-xl p-4 flex items-start justify-between gap-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-[#0a2f1f] mt-0.5" size={22} />
            <div>
              <p className="font-semibold text-gray-900">Entrega registrada</p>
              <p className="text-sm text-gray-600">
                El paquete {deliveredFolio} quedó como entregado y ya no cuenta
                como pendiente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDelivered(false)}
            aria-label="Cerrar aviso"
            className="text-gray-500 hover:text-gray-900"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] gap-4 mb-6">
        <div className="bg-[#0a2f1f] text-white rounded-xl p-6">
          <p className="text-sm">Pendientes de retiro</p>
          <p className="text-4xl font-serif my-3">
            {data ? data.pendingCount : "—"}
          </p>
          <p className="text-xs text-[#c9b98f]">
            {data
              ? `${plural(data.pendingCount, "paquete", "paquetes")} · ${plural(
                  data.pendingRecipientCount,
                  "destinatario",
                  "destinatarios",
                )}`
              : "Cargando…"}
          </p>
        </div>
        <div className="bg-[#f5f0e6] border border-[#e8dfcf] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Entrega con código de retiro
          </h2>
          <p className="text-sm text-gray-700">
            Abre el paquete correspondiente, ingresa el código presentado por el
            residente y confirma la entrega. El sistema valida el código al
            confirmar.
          </p>
          <p className="text-xs text-gray-500 mt-4">
            Los códigos de retiro no se muestran en este listado.
          </p>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-end gap-4 mb-6"
      >
        <div className="flex-1 min-w-[240px]">
          <label
            htmlFor="buscar-paquete"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Buscar paquete o destinatario
          </label>
          <div className="relative">
            <input
              id="buscar-paquete"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Folio, nombre o unidad"
              className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition"
            />
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={18}
            />
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="transportista"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Transportista
          </label>
          <div className="relative">
            <select
              id="transportista"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition"
            >
              <option value="">Todos los transportistas</option>
              {data?.carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              size={18}
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
        >
          Aplicar filtros
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-2 py-3 text-sm font-medium text-[#0a2f1f] underline"
          >
            Limpiar
          </button>
        )}
      </form>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 flex justify-between items-start gap-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pendientes de retiro
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Filtros activos: pendientes
              {filters.q ? ` · “${filters.q}”` : ""} ·{" "}
              {filters.empresa || "Todos los transportistas"}
            </p>
          </div>
          {data && (
            <span className="px-3 py-1 rounded-full bg-[#f5f0e6] text-xs font-semibold text-gray-900 whitespace-nowrap">
              {data.pendingCount} en custodia
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[#f5f0e6] text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3">Paquete</th>
                <th scope="col" className="px-4 py-3">Recepción</th>
                <th scope="col" className="px-4 py-3">Transportista</th>
                <th scope="col" className="px-4 py-3">Destinatario</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-6 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td colSpan={6} className="px-6 py-5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}

              {!isLoading && error && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
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
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-600">
                    {hasFilters
                      ? "No hay paquetes pendientes que coincidan con los filtros."
                      : "No hay paquetes pendientes de retiro. Todo está entregado."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                items.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="border-t border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-5">
                      <p className="font-semibold text-gray-900 text-sm">
                        {pkg.folio}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        1 paquete · {PICKUP_LOCATION}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-900">
                      <p>{formatDate(pkg.receivedAt)}</p>
                      <p className="text-gray-600">{formatTime(pkg.receivedAt)}</p>
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-900">
                      {pkg.carrier}
                    </td>
                    <td className="px-4 py-5 text-sm">
                      <p className="text-gray-900">{pkg.recipientName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {pkg.unit.code}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <PackageStatusBadge status={pkg.status} />
                    </td>
                    <td className="px-6 py-5">
                      <Link
                        href={`/paquetes/${pkg.id}/entrega`}
                        className="text-sm font-semibold text-[#0a2f1f] underline underline-offset-4 hover:text-[#164a33]"
                      >
                        Entregar paquete
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
              ? `${from}–${to} de ${plural(data.total, "paquete pendiente", "paquetes pendientes")}`
              : "Sin paquetes pendientes"}
          </span>
          {data && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(data.page - 1)}
                disabled={data.page <= 1 || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    aria-current={page === data.page ? "page" : undefined}
                    disabled={isLoading}
                    className={`px-3 py-1 rounded ${
                      page === data.page
                        ? "bg-[#e6f0eb] font-semibold text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => goToPage(data.page + 1)}
                disabled={data.page >= data.totalPages || isLoading}
                className="px-3 py-1 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-[#e6f0eb] rounded-xl p-5 flex items-start gap-4">
        <ShieldCheck className="text-[#0a2f1f] mt-0.5 shrink-0" size={22} />
        <div>
          <p className="font-semibold text-gray-900">
            El paquete permanece pendiente hasta confirmar la entrega
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Solo la confirmación de seguridad con el código correcto registra la
            entrega y actualiza el total. Los paquetes no se pueden eliminar.
          </p>
        </div>
      </div>

      <InfoTimestamp />
    </div>
  );
}
