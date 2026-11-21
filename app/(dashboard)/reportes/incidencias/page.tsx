'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { obtenerReporteIncidenciasAction } from '@/app/actions/reportes';

interface IncidenciaAbiertaItem {
  id: string;
  folio: string;
  titulo: string;
  categoria: string;
  ubicacion: string;
  unidad: string;
  seccion: string;
  estado: string;
  prioridad: string;
  fechaCreacion: string;
  diasAbierta: number;
}

const BADGE_PRIORIDAD: Record<string, { texto: string; clase: string }> = {
  CRITICA: { texto: 'Crítica', clase: 'bg-red-100 text-red-800 border-red-200' },
  ALTA: { texto: 'Alta', clase: 'bg-orange-100 text-orange-800 border-orange-200' },
  MEDIA: { texto: 'Media', clase: 'bg-amber-100 text-amber-800 border-amber-200' },
  BAJA: { texto: 'Baja', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  SIN_PRIORIDAD: { texto: 'Sin asignar', clase: 'bg-[#EFECE4] text-[#4B5563] border-[#E4DFD3]' },
};

export default function ReporteIncidenciasAbiertasPage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const primerDiaMes = `${hoy.slice(0, 8)}01`;

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);
  const [seccion, setSeccion] = useState('TODAS');

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<Record<string, number>>({ ABIERTO: 0, EN_PROCESO: 0 });
  const [porPrioridad, setPorPrioridad] = useState<Record<string, number>>({
    CRITICA: 0,
    ALTA: 0,
    MEDIA: 0,
    BAJA: 0,
  });
  const [lista, setLista] = useState<IncidenciaAbiertaItem[]>([]);

  const cargarReporte = async () => {
    setCargando(true);
    setError(null);
    const res = await obtenerReporteIncidenciasAction({ desde, hasta, seccion });
    if (!res.success) {
      setError(res.error || 'Error al cargar el reporte.');
      setLista([]);
    } else {
      setTotal(res.data.total ?? 0);
      setPorEstado(res.data.porEstado ?? { ABIERTO: 0, EN_PROCESO: 0 });
      setPorPrioridad(res.data.porPrioridad ?? {});
      setLista(res.data.lista ?? []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#143728]">
            REPORTES · INCIDENCIAS Y MANTENIMIENTO
          </p>
          <h1 className="text-3xl font-serif text-[#111827] mt-1">
            Reporte de incidencias abiertas
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Seguimiento de reportes pendientes de resolución ordenados de mayor a menor antigüedad.
          </p>
        </div>

        <Link
          href="/indicadores"
          className="px-4 py-2.5 bg-white border border-[#E5E0D5] rounded-xl text-xs font-medium text-[#111827] hover:bg-[#F5F2EB] self-start"
        >
          ← Volver a indicadores
        </Link>
      </div>

      {/* Barra de filtros */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cargarReporte();
        }}
        className="bg-white rounded-2xl border border-[#E5E0D5] p-5 flex flex-col sm:flex-row items-end gap-4"
      >
        <div className="w-full sm:w-48">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full px-3 py-2 border border-[#E5E0D5] rounded-xl text-xs bg-white"
          />
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full px-3 py-2 border border-[#E5E0D5] rounded-xl text-xs bg-white"
          />
        </div>

        <div className="w-full sm:w-56">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
            Sección / Torre
          </label>
          <select
            value={seccion}
            onChange={(e) => setSeccion(e.target.value)}
            className="w-full px-3 py-2 border border-[#E5E0D5] rounded-xl text-xs bg-white"
          >
            <option value="TODAS">Todo el condominio</option>
            <option value="Torre A">Torre A</option>
            <option value="Torre B">Torre B</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="px-5 py-2 bg-[#143728] text-white rounded-xl text-xs font-medium hover:bg-[#0F2A1E] disabled:opacity-50 cursor-pointer"
        >
          {cargando ? 'Consultando...' : 'Aplicar filtros'}
        </button>
      </form>

      {/* Tarjetas de resumen por estado y prioridad */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-4 bg-[#143728] text-white rounded-2xl p-6 flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#D1D5DB]">
            TOTAL INCIDENCIAS ABIERTAS
          </p>
          <p className="text-5xl font-serif my-3">{total}</p>
          <p className="text-xs text-[#D1D5DB]">
            Abiertas: <strong>{porEstado.ABIERTO ?? 0}</strong> · En proceso:{' '}
            <strong>{porEstado.EN_PROCESO ?? 0}</strong>
          </p>
        </div>

        <div className="md:col-span-8 bg-white rounded-2xl border border-[#E5E0D5] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#111827]">Desglose por prioridad</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const).map((prio) => (
              <div
                key={prio}
                className="p-4 rounded-xl bg-[#FAF8F4] border border-[#EFECE4] space-y-1"
              >
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${BADGE_PRIORIDAD[prio].clase}`}
                >
                  {BADGE_PRIORIDAD[prio].texto}
                </span>
                <p className="text-2xl font-serif text-[#111827] pt-1">
                  {porPrioridad[prio] ?? 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de incidencias abiertas */}
      <section className="bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden">
        <div className="p-6 border-b border-[#EFECE4] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Listado de incidencias</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Ordenadas de la más antigua a la más reciente
            </p>
          </div>
          <span className="text-xs text-[#6B7280]">{total} registros</span>
        </div>

        {error ? (
          <div className="p-6">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          </div>
        ) : cargando ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">
            Cargando incidencias abiertas...
          </div>
        ) : lista.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm font-medium text-[#111827]">
              No hay incidencias abiertas en este periodo
            </p>
            <p className="text-xs text-[#6B7280]">
              Todas las incidencias del rango seleccionado se encuentran resueltas o cerradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4EFE6] border-b border-[#E5E0D5] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  <th className="py-3 px-6">FOLIO / TÍTULO</th>
                  <th className="py-3 px-6">SECCIÓN / UNIDAD</th>
                  <th className="py-3 px-6">ESTADO</th>
                  <th className="py-3 px-6">PRIORIDAD</th>
                  <th className="py-3 px-6 text-right">DÍAS ABIERTA ↑</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE4] text-xs">
                {lista.map((item) => {
                  const badge =
                    BADGE_PRIORIDAD[item.prioridad] ?? BADGE_PRIORIDAD.SIN_PRIORIDAD;
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF8F4]">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-[#111827]">{item.titulo}</p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">
                          {item.folio} · {item.categoria}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-medium text-[#143728]">{item.seccion}</p>
                        <p className="text-[11px] text-[#6B7280]">Unidad {item.unidad}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full bg-[#EFECE4] text-[#374151] text-[11px] font-medium">
                          {item.estado === 'EN_PROCESO' ? 'En proceso' : 'Abierto'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${badge.clase}`}
                        >
                          {badge.texto}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-[#111827]">
                        {item.diasAbierta} {item.diasAbierta === 1 ? 'día' : 'días'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}