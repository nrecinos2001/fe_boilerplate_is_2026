"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";

type Movimiento = {
  id: string;
  fecha: string;
  tipo: string;
  puntos: number;
};

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function extraerSaldo(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  const respuesta = objeto(valor);
  if (!respuesta) return null;

  for (const clave of ["balance", "points", "availablePoints", "pointsBalance", "saldo"]) {
    const candidato = respuesta[clave];
    if (typeof candidato === "number" && Number.isFinite(candidato)) {
      return candidato;
    }
    if (typeof candidato === "string" && candidato.trim() && Number.isFinite(Number(candidato))) {
      return Number(candidato);
    }
  }

  return null;
}

function extraerMovimientos(valor: unknown): Movimiento[] | null {
  const respuesta = objeto(valor);
  const lista = Array.isArray(valor)
    ? valor
    : Array.isArray(respuesta?.data)
      ? respuesta.data
      : Array.isArray(respuesta?.movements)
        ? respuesta.movements
        : Array.isArray(respuesta?.items)
          ? respuesta.items
          : null;

  if (!lista) return null;

  return lista.map((elemento, indice) => {
    const item = objeto(elemento) ?? {};
    const puntosRaw = item.points ?? item.amount ?? item.pointsDelta ?? 0;
    const puntos = Number(puntosRaw);
    const fechaRaw = item.date ?? item.createdAt ?? item.movementDate;
    const tipoRaw = item.type ?? item.movementType ?? item.description;

    return {
      id: String(item.id ?? indice),
      fecha: typeof fechaRaw === "string" ? fechaRaw : "",
      tipo: typeof tipoRaw === "string" ? tipoRaw : "Movimiento",
      puntos: Number.isFinite(puntos) ? puntos : 0,
    };
  });
}

function formatoFecha(valor: string) {
  if (!valor) return "Fecha no disponible";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

async function consultar<T>(url: string): Promise<T> {
  const respuesta = await fetch(url, { cache: "no-store" });
  const datos: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const cuerpo = objeto(datos);
    const mensaje = typeof cuerpo?.message === "string" ? cuerpo.message : "";
    if (respuesta.status === 401) throw new Error("AUTH_REQUIRED");
    if (respuesta.status === 403) throw new Error("No tienes permiso para consultar esta información.");
    if (respuesta.status === 404) throw new Error("La información de puntos no está disponible.");
    throw new Error(mensaje || "No se pudo consultar la información de puntos. Intenta de nuevo.");
  }

  return datos as T;
}

export default function PuntosPage() {
  const router = useRouter();
  const [saldo, setSaldo] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorSaldo, setErrorSaldo] = useState("");
  const [errorMovimientos, setErrorMovimientos] = useState("");

  useEffect(() => {
    let activa = true;

    async function cargar() {
      setCargando(true);
      const [resultadoSaldo, resultadoMovimientos] = await Promise.allSettled([
        consultar<unknown>("/api/cliente/loyalty/balance"),
        consultar<unknown>("/api/cliente/loyalty/movements"),
      ]);

      if (!activa) return;

      const requiereLogin = [resultadoSaldo, resultadoMovimientos].some(
        (resultado) =>
          resultado.status === "rejected" &&
          resultado.reason instanceof Error &&
          resultado.reason.message === "AUTH_REQUIRED",
      );

      if (requiereLogin) {
        router.push("/login");
        setCargando(false);
        return;
      }

      if (resultadoSaldo.status === "fulfilled") {
        const valor = extraerSaldo(resultadoSaldo.value);
        if (valor === null) {
          setErrorSaldo("No se pudo interpretar el saldo recibido.");
        } else {
          setSaldo(valor);
          setErrorSaldo("");
        }
      } else {
        setErrorSaldo(
          resultadoSaldo.reason instanceof Error
            ? resultadoSaldo.reason.message
            : "No se pudo consultar el saldo de puntos.",
        );
      }

      if (resultadoMovimientos.status === "fulfilled") {
        const lista = extraerMovimientos(resultadoMovimientos.value);
        if (lista === null) {
          setErrorMovimientos("No se pudo interpretar el historial recibido.");
        } else {
          setMovimientos(lista);
          setErrorMovimientos("");
        }
      } else {
        setErrorMovimientos(
          resultadoMovimientos.reason instanceof Error
            ? resultadoMovimientos.reason.message
            : "No se pudo consultar el historial de puntos.",
        );
      }

      setCargando(false);
    }

    void cargar();
    return () => {
      activa = false;
    };
  }, [router]);

  const hayAcreditacion = movimientos?.some((movimiento) => {
    const tipo = movimiento.tipo.toLocaleLowerCase();
    return movimiento.puntos > 0 &&
      (tipo.includes("acredit") || tipo.includes("ganad") || tipo.includes("earn") || tipo.includes("credit"));
  });

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />

      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Núcleo Digital / Cliente / Mis puntos</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Mis puntos</h1>
              <p className="mt-2 text-sm text-slate-500">Consulta tu saldo y el historial de movimientos.</p>
            </div>
            <CampanaNotificaciones />
          </header>

          {hayAcreditacion && (
            <div role="status" className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
              Tienes puntos acreditados en tu historial.
            </div>
          )}

          {cargando && (
            <p role="status" className="mb-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              Cargando tu información de puntos…
            </p>
          )}

          <section aria-labelledby="saldo-heading" className="mb-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-[#7564e8]">Programa de lealtad</p>
            <h2 id="saldo-heading" className="mt-2 text-lg font-semibold text-[#20233e]">Saldo disponible</h2>
            {errorSaldo ? (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorSaldo}</p>
            ) : saldo !== null ? (
              <p className="mt-2 text-4xl font-bold tracking-tight text-[#20233e]">
                {new Intl.NumberFormat("es").format(saldo)} <span className="text-lg font-semibold text-slate-500">puntos</span>
              </p>
            ) : !cargando ? (
              <p className="mt-3 text-sm text-slate-500">No hay saldo disponible para mostrar.</p>
            ) : null}
          </section>

          <section aria-labelledby="movimientos-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
              <h2 id="movimientos-heading" className="text-lg font-semibold text-[#20233e]">Historial de movimientos</h2>
              <p className="mt-1 text-sm text-slate-500">Acreditaciones y otros movimientos registrados.</p>
            </div>

            {errorMovimientos ? (
              <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMovimientos}</p>
            ) : cargando && movimientos === null ? (
              <p className="px-6 py-14 text-center text-sm text-slate-500">Cargando movimientos…</p>
            ) : movimientos?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold sm:px-8">Fecha</th>
                      <th className="px-6 py-4 font-semibold">Tipo de movimiento</th>
                      <th className="px-6 py-4 text-right font-semibold sm:px-8">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientos.map((movimiento) => (
                      <tr key={movimiento.id}>
                        <td className="px-6 py-4 text-slate-600 sm:px-8">{formatoFecha(movimiento.fecha)}</td>
                        <td className="px-6 py-4 font-medium text-[#252944]">{movimiento.tipo}</td>
                        <td className={`px-6 py-4 text-right font-semibold sm:px-8 ${movimiento.puntos > 0 ? "text-green-700" : "text-slate-600"}`}>
                          {movimiento.puntos > 0 ? "+" : ""}{new Intl.NumberFormat("es").format(movimiento.puntos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-14 text-center text-sm text-slate-500">Aún no tienes movimientos de puntos.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
