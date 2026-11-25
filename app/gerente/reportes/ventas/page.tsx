"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import { useSesion } from "@/lib/stores/sesion";

type Sucursal = { id: string; name: string };

type VentaSucursal = {
  branchId: string;
  branchName: string;
  receiptCount: number;
  subtotal: number;
  tax: number;
  totalSales: number;
};

type Reporte = {
  from: string;
  to: string;
  totalSales: number;
  receiptCount: number;
  branches: VentaSucursal[];
};

type Campo = "branchId" | "from" | "to";
type Errores = Partial<Record<Campo, string>>;

const SIN_PERMISO = "No tiene permiso para ver reportes.";
const ERROR_SERVIDOR = "No se pudo generar el reporte. Intente de nuevo.";
const DIA_MS = 24 * 60 * 60 * 1000;

const dos = (n: number) => String(n).padStart(2, "0");
const aTexto = (d: Date) =>
  `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const aFechaUtc = (valor: string) => {
  const [a, m, d] = valor.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};
// dd/mm/aaaa para mostrar el período.
const mostrar = (valor: string) => valor.split("-").reverse().join("/");

// Montos en dólares con 2 decimales (Épica 10).
const formatoDinero = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dinero = (valor: number) => formatoDinero.format(valor);

// Período por defecto: primer día del mes actual a hoy (Épica 10).
function hoy() {
  return aTexto(new Date());
}
function primeroDelMes() {
  const d = new Date();
  return aTexto(new Date(d.getFullYear(), d.getMonth(), 1));
}

// Mismas reglas que el backend; los mensajes se muestran debajo del campo.
function validar(desde: string, hasta: string): Errores {
  const errores: Errores = {};
  if (!desde) errores.from = "La fecha inicial es obligatoria.";
  if (!hasta) errores.to = "La fecha final es obligatoria.";
  if (desde && hasta) {
    if (desde > hasta) {
      errores.from = "La fecha inicial no puede ser posterior a la fecha final.";
    } else if (hasta > hoy()) {
      errores.to = "La fecha final no puede ser posterior a hoy.";
    } else if ((aFechaUtc(hasta) - aFechaUtc(desde)) / DIA_MS + 1 > 366) {
      errores.to = "El período no puede superar 366 días.";
    }
  } else if (hasta && hasta > hoy()) {
    errores.to = "La fecha final no puede ser posterior a hoy.";
  }
  return errores;
}

export default function ReporteVentasPage() {
  const router = useRouter();
  const cargarUsuario = useSesion((estado) => estado.cargarUsuario);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursal, setSucursal] = useState("");
  const [desde, setDesde] = useState(primeroDelMes);
  const [hasta, setHasta] = useState(hoy);
  const [erroresServidor, setErroresServidor] = useState<Errores>({});

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [sinPermiso, setSinPermiso] = useState(false);

  const errores = validar(desde, hasta);
  const hayErrores = Object.keys(errores).length > 0;
  const visibles: Errores = {
    ...errores,
    ...Object.fromEntries(
      Object.entries(erroresServidor).filter(([, valor]) => valor)
    ),
  };

  const generar = useCallback(
    async (filtros: { sucursal: string; desde: string; hasta: string }) => {
      setCargando(true);
      setError("");
      setErroresServidor({});

      try {
        const parametros = new URLSearchParams({
          from: filtros.desde,
          to: filtros.hasta,
        });
        // Sin sucursal se incluyen todas.
        if (filtros.sucursal) parametros.set("branchId", filtros.sucursal);

        const respuesta = await fetch(
          `/api/reportes/reports/sales?${parametros.toString()}`,
          { cache: "no-store" }
        );

        if (respuesta.status === 401) {
          router.push("/login");
          return;
        }
        if (respuesta.status === 403) {
          setSinPermiso(true);
          return;
        }

        const datos = await respuesta.json();

        if (respuesta.status === 400 && datos.field) {
          setErroresServidor({ [datos.field as Campo]: datos.message });
          setReporte(null);
          return;
        }
        if (!respuesta.ok) throw new Error();

        setReporte(datos as Reporte);
      } catch {
        setReporte(null);
        setError(ERROR_SERVIDOR);
      } finally {
        setCargando(false);
      }
    },
    [router]
  );

  // Al abrir: se valida el rol, se cargan las sucursales y se genera
  // el reporte con el período por defecto.
  useEffect(() => {
    queueMicrotask(async () => {
      const actual = await cargarUsuario();
      if (actual && actual.role !== "GERENTE") {
        setSinPermiso(true);
        setCargando(false);
        return;
      }

      try {
        const respuesta = await fetch("/api/reportes/branches", {
          cache: "no-store",
        });
        if (respuesta.status === 401) {
          router.push("/login");
          return;
        }
        if (respuesta.status === 403) {
          setSinPermiso(true);
          setCargando(false);
          return;
        }
        if (!respuesta.ok) throw new Error();
        const datos: { data: Sucursal[] } = await respuesta.json();
        setSucursales(datos.data);
      } catch {
        setError(ERROR_SERVIDOR);
      }

      await generar({ sucursal: "", desde: primeroDelMes(), hasta: hoy() });
    });
  }, [cargarUsuario, generar, router]);

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      {/* BARRA LATERAL */}
      <BarraLateral />

      {/* CONTENIDO PRINCIPAL */}
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Reportes / Ventas</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">
                Reporte de ventas
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Consulta las ventas totales por sucursal y período para evaluar
                el desempeño de cada establecimiento.
              </p>
            </div>
            <CampanaNotificaciones />
          </div>

          {sinPermiso ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {SIN_PERMISO}
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* FILTROS */}
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-start">
                  <div>
                    <label
                      htmlFor="desde"
                      className="mb-2 block text-sm font-semibold text-[#252944]"
                    >
                      Fecha inicial
                    </label>
                    <input
                      id="desde"
                      type="date"
                      value={desde}
                      max={hoy()}
                      onChange={(e) => {
                        setDesde(e.target.value);
                        setErroresServidor({});
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600 outline-none focus:border-[#7564e8]"
                    />
                    {visibles.from && (
                      <p className="mt-2 text-xs text-red-600">
                        {visibles.from}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="hasta"
                      className="mb-2 block text-sm font-semibold text-[#252944]"
                    >
                      Fecha final
                    </label>
                    <input
                      id="hasta"
                      type="date"
                      value={hasta}
                      max={hoy()}
                      onChange={(e) => {
                        setHasta(e.target.value);
                        setErroresServidor({});
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600 outline-none focus:border-[#7564e8]"
                    />
                    {visibles.to && (
                      <p className="mt-2 text-xs text-red-600">{visibles.to}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="sucursal"
                      className="mb-2 block text-sm font-semibold text-[#252944]"
                    >
                      Sucursal
                    </label>
                    <select
                      id="sucursal"
                      value={sucursal}
                      onChange={(e) => {
                        setSucursal(e.target.value);
                        setErroresServidor({});
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 outline-none focus:border-[#7564e8]"
                    >
                      <option value="">Todas las sucursales</option>
                      {sucursales.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {visibles.branchId && (
                      <p className="mt-2 text-xs text-red-600">
                        {visibles.branchId}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void generar({ sucursal, desde, hasta })}
                    disabled={cargando || hayErrores}
                    className="rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6250d5] disabled:opacity-50 md:mt-7"
                  >
                    Generar reporte
                  </button>
                </div>
              </section>

              {/* RESULTADO */}
              {cargando ? (
                <EstadoVacio texto="Generando reporte…" />
              ) : !reporte ? null : reporte.receiptCount === 0 ? (
                <EstadoVacio texto="No hay ventas registradas en el período seleccionado." />
              ) : (
                <>
                  {/* TARJETAS DE RESUMEN */}
                  <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    <Tarjeta
                      titulo="Ventas totales"
                      valor={dinero(reporte.totalSales)}
                      detalle={`Del ${mostrar(reporte.from)} al ${mostrar(reporte.to)} · IVA del 13 % incluido`}
                    />
                    <Tarjeta
                      titulo="Comprobantes"
                      valor={String(reporte.receiptCount)}
                      detalle="Cantidad de comprobantes emitidos en el período"
                    />
                  </div>

                  {/* VENTAS POR SUCURSAL */}
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5 sm:p-6">
                      <h2 className="text-lg font-bold text-[#20233e]">
                        Ventas por sucursal
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left">
                        <thead className="bg-[#f9f9fd]">
                          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-4">Sucursal</th>
                            <th className="px-5 py-4 text-right">
                              Comprobantes
                            </th>
                            <th className="px-5 py-4 text-right">Subtotal</th>
                            <th className="px-5 py-4 text-right">IVA</th>
                            <th className="px-5 py-4 text-right">
                              Ventas totales
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reporte.branches.map((fila) => (
                            <tr key={fila.branchId}>
                              <td className="px-5 py-4 text-sm font-semibold text-[#252944]">
                                {fila.branchName}
                              </td>
                              <td className="px-5 py-4 text-right text-sm text-slate-600">
                                {fila.receiptCount}
                              </td>
                              <td className="px-5 py-4 text-right text-sm text-slate-600">
                                {dinero(fila.subtotal)}
                              </td>
                              <td className="px-5 py-4 text-right text-sm text-slate-600">
                                {dinero(fila.tax)}
                              </td>
                              <td className="px-5 py-4 text-right text-sm font-semibold text-[#252944]">
                                {dinero(fila.totalSales)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[#20233e]">
        {valor}
      </p>
      <p className="mt-2 text-xs text-slate-400">{detalle}</p>
    </div>
  );
}

function EstadoVacio({ texto }: { texto: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500 shadow-sm">
      {texto}
    </section>
  );
}
