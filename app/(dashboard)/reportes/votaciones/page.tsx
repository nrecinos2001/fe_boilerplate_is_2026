'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { obtenerReporteVotacionesAction } from '@/app/actions/reportes';

interface VotacionCerradaItem {
  temaId: string;
  folio: string;
  asambleaTitulo: string;
  titulo: string;
  fecha: string;
  fechaCierre: string;
  unidadesHabilitadas: number;
  votantes: number;
  participacion: number;
}

function formatoPorcentajeEs(valor: number) {
  return `${valor.toFixed(1).replace('.', ',')} %`;
}

function formatoFechaCorta(fechaIso: string) {
  const date = new Date(`${fechaIso}T12:00:00`);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReporteParticipacionVotacionesPage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const primerDiaMes = `${hoy.slice(0, 8)}01`;

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);
  const [seccion, setSeccion] = useState('TODAS');

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promedio, setPromedio] = useState(0);
  const [lista, setLista] = useState<VotacionCerradaItem[]>([]);
  const [resumenAcumulado, setResumenAcumulado] = useState({
    totalVotacionesCerradas: 0,
    totalOportunidades: 0,
    totalParticipaciones: 0,
    sinParticipacion: 0,
  });
  const [fueraRecuento, setFueraRecuento] = useState<
    { folio: string; titulo: string; estado: string }[]
  >([]);

  const cargarReporte = async () => {
    setCargando(true);
    setError(null);
    const res = await obtenerReporteVotacionesAction({ desde, hasta, seccion });
    if (!res.success) {
      setError(res.error || 'No se pudo cargar el reporte.');
      setLista([]);
    } else {
      setPromedio(res.data.promedio ?? 0);
      setLista(res.data.lista ?? []);
      setResumenAcumulado(
        res.data.resumenAcumulado ?? {
          totalVotacionesCerradas: 0,
          totalOportunidades: 0,
          totalParticipaciones: 0,
          sinParticipacion: 0,
        },
      );
      setFueraRecuento(res.data.convocatoriasFueraRecuento ?? []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegiblesPorVotacion = lista.length > 0 ? lista[0].unidadesHabilitadas : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#143728]">
            REPORTES · ASAMBLEAS Y VOTACIONES
          </p>
          <h1 className="text-3xl sm:text-[34px] font-serif text-[#111827] mt-1">
            Reporte de participación
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Consulta la participación agregada de las votaciones cerradas, sin mostrar elecciones individuales.
          </p>
        </div>

        <Link
          href="/indicadores"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E0D5] rounded-xl text-xs font-medium text-[#111827] hover:bg-[#F5F2EB] self-start"
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
        className="bg-white rounded-2xl border border-[#E5E0D5] p-5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
              Periodo · Desde
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
              Periodo · Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E0D5] rounded-xl text-xs bg-white"
            />
          </div>

          <div className="w-full flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
              Sección
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
            className="px-5 py-2 bg-white border border-[#E5E0D5] text-[#111827] rounded-xl text-xs font-medium hover:bg-[#F5F2EB] disabled:opacity-50 cursor-pointer shrink-0"
          >
            {cargando ? 'Cargando...' : 'Aplicar filtros'}
          </button>
        </div>

        <p className="text-[11px] text-[#6B7280]">
          Filtros activos: {desde} al {hasta} ·{' '}
          {seccion === 'TODAS' ? 'Todo el condominio' : seccion}
        </p>
      </form>

      {/* Fila superior: Tarjeta verde promedio + Gráfica de barras por votación */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-[#143728] text-white rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#D1D5DB]">
            PARTICIPACIÓN DEL PERIODO
          </p>
          <div>
            <p className="text-5xl font-serif">{formatoPorcentajeEs(promedio)}</p>
            <p className="text-sm text-[#E5E7EB] mt-2">
              {resumenAcumulado.totalParticipaciones} participaciones /{' '}
              {resumenAcumulado.totalOportunidades} oportunidades
            </p>
          </div>
          <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
            {resumenAcumulado.totalVotacionesCerradas} votaciones cerradas ·{' '}
            {elegiblesPorVotacion} elegibles por votación. Una unidad cuenta una sola vez por tema.
          </p>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E0D5] p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              Participación por votación
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Participantes / elegibles de cada votación · Escala de 0 a 100 %
            </p>
          </div>

          {lista.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-6">
              Sin votaciones cerradas para graficar en el periodo seleccionado.
            </p>
          ) : (
            <div className="space-y-4 pt-1">
              {lista.map((item) => (
                <div key={item.temaId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#111827] truncate pr-3">
                      {item.asambleaTitulo}
                    </span>
                    <span className="font-semibold text-[#111827] shrink-0">
                      {item.votantes} / {item.unidadesHabilitadas} ·{' '}
                      {formatoPorcentajeEs(item.participacion)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#EFECE4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#143728] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.participacion)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla: Detalle de votaciones cerradas */}
      <section className="bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden">
        <div className="p-6 border-b border-[#EFECE4]">
          <h2 className="text-base font-semibold text-[#111827]">
            Detalle de votaciones cerradas
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Periodo aplicado a fecha de cierre · Orden: cierre más reciente primero
          </p>
        </div>

        {error ? (
          <div className="p-6">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          </div>
        ) : cargando ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">
            Cargando reporte de participación...
          </div>
        ) : lista.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm font-medium text-[#111827]">
              No hay votaciones cerradas en este periodo
            </p>
            <p className="text-xs text-[#6B7280]">
              Ajusta el rango de fechas o la sección para consultar otras asambleas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4EFE6] border-b border-[#E5E0D5] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  <th className="py-3 px-6">ASAMBLEA / PROPUESTA</th>
                  <th className="py-3 px-6">CIERRE ↓</th>
                  <th className="py-3 px-6">ELEGIBLES</th>
                  <th className="py-3 px-6">PARTICIPANTES</th>
                  <th className="py-3 px-6">PARTICIPACIÓN</th>
                  <th className="py-3 px-6">ACCESO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE4] text-xs">
                {lista.map((item) => (
                  <tr key={item.temaId} className="hover:bg-[#FAF8F4]">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-[#111827]">{item.asambleaTitulo}</p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        {item.folio} · {item.titulo}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-[#374151]">{formatoFechaCorta(item.fecha)}</td>
                    <td className="py-4 px-6 text-[#374151]">{item.unidadesHabilitadas}</td>
                    <td className="py-4 px-6 text-[#374151]">{item.votantes}</td>
                    <td className="py-4 px-6 font-semibold text-[#111827]">
                      {formatoPorcentajeEs(item.participacion)}
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/temas/${item.temaId}/resultados`}
                        className="text-[#143728] underline underline-offset-4 hover:text-[#0F2A1E]"
                      >
                        Ver resultados
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3.5 border-t border-[#EFECE4] text-xs text-[#6B7280]">
          1–{lista.length} de {lista.length} votaciones cerradas
        </div>
      </section>

      {/* Barra de Total Acumulado */}
      <div className="bg-[#EFECE4] border border-[#E4DFD3] rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="font-bold uppercase tracking-wider text-[#111827]">
          TOTAL ACUMULADO
        </span>
        <span className="text-[#374151]">
          {resumenAcumulado.totalOportunidades} oportunidades ·{' '}
          {resumenAcumulado.totalParticipaciones} participaciones ·{' '}
          {resumenAcumulado.sinParticipacion} sin participación ·{' '}
          <strong>{formatoPorcentajeEs(promedio)}</strong>
        </span>
      </div>

      {/* Tarjetas inferiores explicativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 space-y-2">
          <h3 className="text-sm font-semibold text-[#111827]">Un denominador explícito</h3>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Cada unidad habilitada cuenta una sola vez por tema votado. El promedio del periodo corresponde al promedio de participación de las votaciones cerradas en el rango filtrado.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 space-y-2">
          <h3 className="text-sm font-semibold text-[#111827]">
            Convocatorias fuera del recuento
          </h3>
          {fueraRecuento.length === 0 ? (
            <p className="text-xs text-[#6B7280]">
              No hay asambleas pendientes o en borrador fuera del recuento actual.
            </p>
          ) : (
            <p className="text-xs text-[#4B5563] leading-relaxed">
              {fueraRecuento.map((f) => `«${f.titulo}» (${f.folio})`).join(', ')} aún no tienen votación cerrada que sumar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}