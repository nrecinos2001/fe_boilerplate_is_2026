"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { mensajeApi, meseroApi } from "@/lib/mesero-api";

type CuentaAbierta = { id: string };
type Mesa = {
  id: string;
  number: number;
  capacity: number;
  status: string;
  accounts: CuentaAbierta[];
};

export default function CuentasMeseroPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const result = await meseroApi<Mesa[]>("tables/my-branch");
      setMesas(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(mensajeApi(err, "No se pudieron consultar las cuentas abiertas."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cuentas = mesas.flatMap((mesa) =>
    mesa.accounts.map((cuenta) => ({ ...cuenta, mesa: mesa.number, capacidad: mesa.capacity })),
  );

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Mesero / Cuentas</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Cuentas abiertas</h1>
              <p className="mt-2 text-sm text-slate-500">Consulta el detalle de una cuenta y continúa al proceso de cierre y cobro.</p>
            </div>
            <CampanaNotificaciones />
          </header>

          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#20233e]">Cuentas de tu sucursal</h2>
                <p className="mt-1 text-sm text-slate-500">Solo se muestran cuentas abiertas asociadas a las mesas asignadas a tu sucursal.</p>
              </div>
              <button type="button" onClick={() => void cargar()} disabled={cargando} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {cargando ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            {cargando ? (
              <p role="status" className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Cargando cuentas...</p>
            ) : cuentas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <p className="font-semibold text-slate-600">No hay cuentas abiertas.</p>
                <p className="mt-1 text-sm text-slate-400">Abre una cuenta desde el punto de venta para comenzar.</p>
                <Link href="/mesero/pos" className="mt-4 inline-flex rounded-xl bg-[#7564e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6554d6]">Ir al punto de venta</Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cuentas.map((cuenta) => (
                  <article key={cuenta.id} className="rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Mesa</p>
                        <h3 className="mt-1 text-2xl font-bold text-[#20233e]">{String(cuenta.mesa).padStart(2, "0")}</h3>
                        <p className="mt-1 text-xs text-slate-500">Capacidad: {cuenta.capacidad} personas</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Abierta</span>
                    </div>
                    <p className="mt-4 break-all text-xs text-slate-400">{cuenta.id}</p>
                    <Link href={`/mesero/cuentas/${cuenta.id}`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#7564e8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6554d6]">
                      Consultar y cerrar cuenta
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
