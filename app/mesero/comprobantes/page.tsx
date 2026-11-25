"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { dinero, mensajeApi, meseroApi } from "@/lib/mesero-api";

type ReceiptRow = {
  receiptId: string;
  receiptNumber: number;
  issuedAt: string;
  branch: { name: string; code: string | null };
  total: number | string;
  paymentMethod: string;
  paymentStatus: string;
  order: { id: string; orderNumber: number } | null;
};

type ReceiptHistory = {
  data: ReceiptRow[];
  total: number;
  page: number;
  limit: number;
};

export default function ReceiptHistoryPage() {
  const [result, setResult] = useState<ReceiptHistory>({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await meseroApi<ReceiptHistory>(
        `receipts?page=${page}&limit=10`,
      );
      setResult(response);
    } catch (err) {
      setError(mensajeApi(err, "No se pudo cargar el historial de comprobantes."));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Mesero / Comprobantes</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">
                Historial de comprobantes
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Consulta los pagos aprobados y sus comprobantes de venta.
              </p>
            </div>
            <CampanaNotificaciones />
          </header>

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button onClick={() => void loadReceipts()} className="ml-3 font-semibold underline">
                Reintentar
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-bold text-[#20233e]">Comprobantes emitidos</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {result.total} comprobante(s) registrado(s)
                </p>
              </div>
              <Link href="/mesero/cuentas" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Volver a cuentas
              </Link>
            </div>

            {loading ? (
              <div role="status" className="p-10 text-center text-sm text-slate-500">
                Cargando comprobantes...
              </div>
            ) : result.data.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-slate-700">No hay comprobantes registrados</p>
                <p className="mt-2 text-sm text-slate-500">
                  Los comprobantes aparecerán aquí cuando se aprueben pagos.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-4">Comprobante</th>
                        <th className="px-5 py-4">Fecha</th>
                        <th className="px-5 py-4">Sucursal</th>
                        <th className="px-5 py-4">Método</th>
                        <th className="px-5 py-4 text-right">Total</th>
                        <th className="px-5 py-4 text-center">Estado</th>
                        <th className="px-5 py-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.data.map((receipt) => (
                        <tr key={receipt.receiptId} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-bold text-[#6554d6]">
                            #{receipt.receiptNumber}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {new Intl.DateTimeFormat("es-SV", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(receipt.issuedAt))}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {receipt.branch.name}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {receipt.paymentMethod === "CASH" ? "Efectivo" : "Tarjeta"}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-800">
                            {dinero(receipt.total)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Aprobado
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/mesero/comprobantes/${encodeURIComponent(receipt.receiptId)}`}
                              className="font-semibold text-[#6554d6] hover:underline"
                            >
                              Ver comprobante
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                  <p className="text-sm text-slate-500">
                    Página {result.page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((current) => current + 1)}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
