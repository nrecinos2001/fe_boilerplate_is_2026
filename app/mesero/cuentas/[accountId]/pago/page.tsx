"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { dinero, mensajeApi, meseroApi } from "@/lib/mesero-api";

type CuentaPago = {
  accountId: string;
  status: string;
  tableNumber: number;
  receipt: { id: string; receiptNumber: number } | null;
  orders: Array<{ orderId: string; status: string }>;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
};
type ComprobantePago = {
  id: string;
  number: number;
  branchCode: string | null;
  issuedAt: string;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  paymentMethod: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; subtotal: number }>;
};
type PagoResponse = { paymentId: string; status: "APPROVED" | "REJECTED"; message: string; change?: number | string; receipt?: ComprobantePago };

export default function PagoCuentaPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;
  const router = useRouter();
  const [cuenta, setCuenta] = useState<CuentaPago | null>(null);
  const [metodo, setMetodo] = useState<"CASH" | "CARD" | "">("");
  const [efectivo, setEfectivo] = useState("");
  const [ultimosDigitos, setUltimosDigitos] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [rechazado, setRechazado] = useState(false);
  const [comprobante, setComprobante] = useState<ComprobantePago | null>(null);

  const cargarCuenta = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const data = await meseroApi<CuentaPago>(`accounts/${encodeURIComponent(accountId)}`);
      setCuenta(data);
      if (data.status !== "OPEN") setError("La cuenta ya no está abierta y no puede recibir otro pago.");
      else if (!data.orders.length || data.orders.some((order) => order.status !== "DELIVERED")) {
        setError("Todos los pedidos deben estar entregados antes de cobrar la cuenta.");
      }
    } catch (err) {
      setError(mensajeApi(err, "No se pudo cargar la cuenta para el cobro."));
    } finally {
      setCargando(false);
    }
  }, [accountId]);

  useEffect(() => { void cargarCuenta(); }, [cargarCuenta]);

  const total = Number(cuenta?.total ?? 0);
  const cambio = useMemo(() => {
    if (metodo !== "CASH" || efectivo.trim() === "") return 0;
    const recibido = Number(efectivo);
    return Number.isFinite(recibido) ? Math.max(0, recibido - total) : 0;
  }, [efectivo, metodo, total]);
  const montoValido = metodo === "CASH"
    ? efectivo.trim() !== "" && Number.isFinite(Number(efectivo)) && Number(efectivo) >= total
    : metodo === "CARD" && /^(4242|0002)$/.test(ultimosDigitos);
  const listo = Boolean(cuenta && cuenta.status === "OPEN" && cuenta.orders.length > 0 && cuenta.orders.every((order) => order.status === "DELIVERED"));

  async function confirmarPago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listo || !montoValido || procesando || !cuenta) return;
    setProcesando(true);
    setError("");
    setMensaje("");
    setComprobante(null);
    setRechazado(false);
    try {
      const payload = metodo === "CASH"
        ? { accountId, method: "CASH", amountReceived: Number(efectivo) }
        : { accountId, method: "CARD", cardLast4: ultimosDigitos };
      const result = await meseroApi<PagoResponse>("payments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result.status === "REJECTED") {
        setRechazado(true);
        setMensaje(result.message || "El pago fue rechazado. La cuenta continúa abierta y puedes intentarlo nuevamente.");
        return;
      }
      if (result.status !== "APPROVED" || !result.receipt?.id) {
        throw new Error("El servidor no confirmó el pago ni devolvió el comprobante.");
      }
      setComprobante(result.receipt);
      setMensaje("Pago aprobado. La cuenta se cerró y el comprobante fue generado correctamente.");
    } catch (err) {
      setError(mensajeApi(err, "No se pudo registrar el pago. Consulta el estado de la cuenta antes de reintentar."));
      await cargarCuenta();
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400"><Link href={`/mesero/cuentas/${accountId}`} className="hover:text-[#7564e8]">Cierre de cuenta</Link> / Pago</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Confirmar cobro</h1>
              <p className="mt-2 text-sm text-slate-500">Selecciona el método de pago y confirma el importe calculado por el servidor.</p>
            </div>
            <CampanaNotificaciones />
          </header>

          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {mensaje && <div role={rechazado ? "alert" : "status"} className={`mb-5 rounded-xl border p-4 text-sm ${rechazado ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{mensaje}</div>}

          {cargando ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Consultando cuenta...</div>
          ) : cuenta ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#20233e]">Resumen de la cuenta</h2>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Cuenta</dt><dd className="break-all text-right font-medium">{cuenta.accountId}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Mesa</dt><dd className="font-semibold">{String(cuenta.tableNumber).padStart(2, "0")}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{dinero(cuenta.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Descuento</dt><dd>− {dinero(cuenta.discount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">IVA (13 %)</dt><dd>{dinero(cuenta.tax)}</dd></div>
                  <div className="flex justify-between rounded-xl bg-violet-50 px-4 py-3 text-base"><dt className="font-bold">Total a pagar</dt><dd className="font-bold text-[#6554d6]">{dinero(cuenta.total)}</dd></div>
                </dl>
              </section>

              {!comprobante && cuenta.status === "PAID" ? (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-emerald-800">Cuenta ya pagada</h2>
                  <p className="mt-2 text-sm text-emerald-700">El servidor confirma que la cuenta tiene un pago aprobado. No vuelvas a intentar el cobro.</p>
                  {cuenta.receipt && <Link href={`/mesero/comprobantes/${cuenta.receipt.id}`} className="mt-5 inline-flex rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white">Ver comprobante #{cuenta.receipt.receiptNumber}</Link>}
                </section>
              ) : !comprobante ? (
                <form onSubmit={confirmarPago} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-5 text-lg font-bold text-[#20233e]">Método de pago</h2>
                  <label className="mb-5 block text-sm font-medium text-slate-600">Selecciona el método
                    <select value={metodo} onChange={(event) => { setMetodo(event.target.value as "CASH" | "CARD" | ""); setEfectivo(""); setUltimosDigitos(""); setMensaje(""); setRechazado(false); }} disabled={!listo || procesando} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#7564e8]">
                      <option value="">Seleccionar método</option><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option>
                    </select>
                  </label>
                  {metodo === "CASH" && <>
                    <label className="mb-3 block text-sm font-medium text-slate-600">Efectivo recibido
                      <input type="number" inputMode="decimal" min={total} step="0.01" value={efectivo} onChange={(event) => setEfectivo(event.target.value)} disabled={procesando} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7564e8]" placeholder="0.00" />
                    </label>
                    <div className="mb-5 flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Cambio</span><strong>{dinero(cambio)}</strong></div>
                  </>}
                  {metodo === "CARD" && <>
                    <label className="mb-2 block text-sm font-medium text-slate-600">Últimos cuatro dígitos de la tarjeta
                      <input type="text" inputMode="numeric" maxLength={4} pattern="(4242|0002)" value={ultimosDigitos} onChange={(event) => setUltimosDigitos(event.target.value.replace(/\D/g, "").slice(0, 4))} disabled={procesando} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7564e8]" placeholder="4242" />
                    </label>
                    <p className="mb-5 text-xs text-slate-400">Simulación: 4242 aprueba el pago y 0002 lo rechaza. No se almacena el número completo ni el CVV.</p>
                  </>}
                  <button type="submit" disabled={!listo || !montoValido || procesando || !metodo} className="inline-flex w-full items-center justify-center rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6554d6] disabled:cursor-not-allowed disabled:opacity-50">
                    {procesando ? "Procesando pago..." : "Confirmar pago"}
                  </button>
                  <Link href={`/mesero/cuentas/${accountId}`} className="mt-4 block text-center text-sm font-semibold text-slate-500 hover:text-[#7564e8]">Cancelar y volver a la cuenta</Link>
                </form>
              ) : (
                <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</span><div><h2 className="text-lg font-bold text-emerald-800">Cuenta cerrada</h2><p className="text-sm text-slate-500">La venta se registró correctamente.</p></div></div>
                  <p className="mb-5 text-sm text-slate-600">Comprobante #{comprobante.number} · Total {dinero(comprobante.total)}</p>
                  <Link href={`/mesero/comprobantes/${comprobante.id}`} className="inline-flex w-full items-center justify-center rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6554d6]">Ver comprobante</Link>
                  <Link href="/mesero/cuentas" className="mt-4 block text-center text-sm font-semibold text-slate-500 hover:text-[#7564e8]">Volver a cuentas</Link>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
