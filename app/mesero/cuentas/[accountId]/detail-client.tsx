"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { dinero, mensajeApi, meseroApi } from "@/lib/mesero-api";

type Cuenta = {
  accountId: string;
  status: string;
  branchId: string;
  tableId: string;
  tableNumber: number;
  customer: { id: string; email: string } | null;
  receipt: { id: string; receiptNumber: number } | null;
  orders: Array<{
    orderId: string;
    status: string;
    items: Array<{
      orderId: string;
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number | string;
      subtotal: number | string;
      status: string;
    }>;
  }>;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
};

type CloseCheck = {
  accountId: string;
  status: string;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  canPay: boolean;
};

function estadoPedido(status: string) {
  const labels: Record<string, string> = {
    RECEIVED: "Recibido",
    IN_PREPARATION: "En preparación",
    READY: "Listo para entregar",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };
  return labels[status] ?? status;
}

export default function AccountDetailClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const data = await meseroApi<Cuenta>(`accounts/${encodeURIComponent(accountId)}`);
      setCuenta(data);
    } catch (err) {
      setError(mensajeApi(err, "No se pudo cargar el detalle de la cuenta."));
    } finally {
      setCargando(false);
    }
  }, [accountId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pedidosActivos = cuenta?.orders ?? [];
  const hayPedidos = pedidosActivos.length > 0;
  const todosEntregados = hayPedidos && pedidosActivos.every((pedido) => pedido.status === "DELIVERED");
  const puedePagar = cuenta?.status === "OPEN" && todosEntregados;

  async function procederAlPago() {
    if (!cuenta || procesando) return;
    setProcesando(true);
    setError("");
    try {
      const validacion = await meseroApi<CloseCheck>(`accounts/${encodeURIComponent(accountId)}/close`, { method: "POST" });
      if (!validacion.canPay) {
        setError("La cuenta todavía no cumple las condiciones para iniciar el cobro.");
        await cargar();
        return;
      }
      router.push(`/mesero/cuentas/${encodeURIComponent(accountId)}/pago`);
    } catch (err) {
      setError(mensajeApi(err, "No se pudo iniciar el proceso de cobro."));
      await cargar();
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400"><Link href="/mesero/cuentas" className="hover:text-[#7564e8]">Cuentas</Link> / Detalle</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Cierre de cuenta</h1>
              <p className="mt-2 text-sm text-slate-500">Consulta los pedidos, verifica los importes y continúa al cobro.</p>
            </div>
            <CampanaNotificaciones />
          </header>

          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {cargando ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Cargando detalle de la cuenta...</div>
          ) : !cuenta ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="font-semibold text-slate-700">No se pudo consultar la cuenta.</p>
              <button type="button" onClick={() => void cargar()} className="mt-4 rounded-xl bg-[#7564e8] px-4 py-2 text-sm font-semibold text-white">Reintentar</button>
            </div>
          ) : (
            <>
              <div className="mb-6 grid gap-5 xl:grid-cols-[1.15fr_1.85fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-5 text-lg font-bold text-[#20233e]">Información de la cuenta</h2>
                  <dl className="space-y-4 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Cuenta</dt><dd className="max-w-[65%] break-all text-right font-medium">{cuenta.accountId}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Mesa</dt><dd className="font-semibold">{String(cuenta.tableNumber).padStart(2, "0")}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Estado</dt><dd><span className={`rounded-full px-3 py-1 text-xs font-semibold ${cuenta.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{cuenta.status === "OPEN" ? "Abierta" : cuenta.status === "PAID" ? "Pagada" : cuenta.status}</span></dd></div>
                    <div className="border-t border-slate-100 pt-4"><dt className="text-slate-500">Cliente (opcional)</dt><dd className="mt-1 font-medium">{cuenta.customer?.email ?? "Sin cliente asociado"}</dd><p className="mt-1 text-xs text-slate-400">El cliente se identifica al abrir la cuenta desde el punto de venta.</p></div>
                  </dl>
                  <Link href="/mesero/pos" className="mt-6 inline-flex text-sm font-semibold text-[#7564e8] hover:underline">Volver al punto de venta</Link>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-[#20233e]">Pedidos asociados</h2>
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#7564e8]">{pedidosActivos.length} pedidos</span>
                  </div>
                  {!hayPedidos ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">La cuenta no tiene pedidos asociados. No es posible iniciar el cobro.</p>
                  ) : (
                    <div className="space-y-4">
                      {pedidosActivos.map((pedido, index) => (
                        <article key={pedido.orderId} className="rounded-xl border border-slate-100 bg-[#fafbfe] p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#252944]">Pedido {index + 1}</p>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pedido.status === "DELIVERED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{estadoPedido(pedido.status)}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[440px] text-left text-sm">
                              <thead className="text-xs text-slate-400"><tr><th className="pb-2">Producto</th><th className="pb-2 text-center">Cant.</th><th className="pb-2 text-right">Precio</th><th className="pb-2 text-right">Subtotal</th></tr></thead>
                              <tbody className="divide-y divide-slate-100">
                                {pedido.items.map((item) => <tr key={`${pedido.orderId}-${item.productId}`}><td className="py-2 font-medium">{item.productName}</td><td className="py-2 text-center">{item.quantity}</td><td className="py-2 text-right">{dinero(item.unitPrice)}</td><td className="py-2 text-right font-semibold">{dinero(item.subtotal)}</td></tr>)}
                              </tbody>
                            </table>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#20233e]">Resumen de pago</h2>
                <dl className="ml-auto max-w-md space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{dinero(cuenta.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Descuento</dt><dd className="font-medium">− {dinero(cuenta.discount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">IVA (13 %)</dt><dd className="font-medium">{dinero(cuenta.tax)}</dd></div>
                  <div className="flex justify-between rounded-xl bg-violet-50 px-4 py-3 text-base"><dt className="font-bold text-[#252944]">Total a pagar</dt><dd className="font-bold text-[#6554d6]">{dinero(cuenta.total)}</dd></div>
                </dl>
                {cuenta.status === "PAID" ? (
                  <div role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                    <p className="font-semibold">Esta cuenta ya fue pagada. No se puede iniciar otro cobro.</p>
                    {cuenta.receipt && <Link href={`/mesero/comprobantes/${cuenta.receipt.id}`} className="mt-2 inline-flex font-semibold underline">Ver comprobante #{cuenta.receipt.receiptNumber}</Link>}
                  </div>
                ) : !hayPedidos ? (
                  <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Agrega al menos un pedido antes de iniciar el cobro.</p>
                ) : !todosEntregados ? (
                  <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No se puede cerrar la cuenta: todos los pedidos deben estar en estado Entregado.</p>
                ) : (
                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button type="button" onClick={() => void cargar()} disabled={procesando} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Actualizar detalle</button>
                    <button type="button" onClick={() => void procederAlPago()} disabled={procesando || !puedePagar} className="rounded-xl bg-[#7564e8] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#6554d6] disabled:opacity-50">{procesando ? "Validando cuenta..." : "Proceder al pago"}</button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
