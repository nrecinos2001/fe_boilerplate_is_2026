"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { dinero, mensajeApi, meseroApi } from "@/lib/mesero-api";

type Receipt = {
  receiptId: string;
  receiptNumber: number;
  issuedAt: string;
  branch: { name: string; code: string | null };
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  paymentMethod: string;
  paymentStatus: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; subtotal: number }>;
};

export default function ReceiptPage() {
  const params = useParams<{ receiptId: string }>();
  const receiptId = params.receiptId;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReceipt = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await meseroApi<Receipt>(`receipts/${encodeURIComponent(receiptId)}`);
      setReceipt(data);
    } catch (err) {
      setError(mensajeApi(err, "No se pudo consultar el comprobante."));
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => { void loadReceipt(); }, [loadReceipt]);

  const issued = receipt ? new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.issuedAt)) : "";

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div><p className="mb-2 text-sm text-slate-400">Mesero / Comprobante</p><h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Comprobante de pago</h1><p className="mt-2 text-sm text-slate-500">Constancia de la venta registrada.</p></div>
            <CampanaNotificaciones />
          </header>
          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Cargando comprobante...</div> : receipt ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-slate-200 pb-6">
                <div><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#7564e8] text-xl font-bold text-white">N</div><h2 className="text-xl font-bold text-[#20233e]">Núcleo Digital</h2><p className="text-sm text-slate-500">{receipt.branch.name} {receipt.branch.code ? `· ${receipt.branch.code}` : ""}</p></div>
                <div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Comprobante</p><p className="mt-1 text-2xl font-bold text-[#7564e8]">#{receipt.receiptNumber}</p><p className="mt-1 text-sm text-slate-500">{issued}</p></div>
              </div>
              <div className="mb-6 flex flex-wrap justify-between gap-3 text-sm"><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">Pago aprobado</span><span className="text-slate-500">Método: {receipt.paymentMethod === "CASH" ? "Efectivo" : "Tarjeta"}</span></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3">Producto</th><th className="pb-3 text-center">Cantidad</th><th className="pb-3 text-right">Precio unitario</th><th className="pb-3 text-right">Subtotal</th></tr></thead><tbody className="divide-y divide-slate-100">{receipt.items.map((item, index) => <tr key={`${item.productName}-${index}`}><td className="py-3 font-medium text-slate-700">{item.productName}</td><td className="py-3 text-center">{item.quantity}</td><td className="py-3 text-right">{dinero(item.unitPrice)}</td><td className="py-3 text-right font-semibold">{dinero(item.subtotal)}</td></tr>)}</tbody></table></div>
              <dl className="ml-auto mt-7 max-w-sm space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{dinero(receipt.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Descuento</dt><dd>− {dinero(receipt.discount)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">IVA (13 %)</dt><dd>{dinero(receipt.tax)}</dd></div><div className="flex justify-between border-t border-slate-200 pt-4 text-lg"><dt className="font-bold">Total cobrado</dt><dd className="font-bold text-[#6554d6]">{dinero(receipt.total)}</dd></div></dl>
              <div className="mt-8 flex flex-wrap justify-end gap-3 print:hidden"><Link href="/mesero/cuentas" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">Volver a cuentas</Link><button type="button" onClick={() => window.print()} className="rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6554d6]">Imprimir comprobante</button></div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
