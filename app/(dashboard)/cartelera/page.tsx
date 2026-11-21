'use client';

import React, { useEffect, useState } from 'react';
import {
  obtenerMuroComunicadosAction,
  marcarComunicadoLeidoAction,
} from '@/app/actions/comunicados';
import {
  ModalComunicadoUrgente,
  type ComunicadoItem,
} from './components/ModalComunicadoUrgente';
import { CONDOMINIO } from '@/lib/condominio';

export default function CarteleraPage() {
  const [comunicados, setComunicados] = useState<ComunicadoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [seleccionado, setSeleccionado] = useState<ComunicadoItem | null>(null);
  const [esUrgenteObligatorio, setEsUrgenteObligatorio] = useState(false);
  const [confirmandoLectura, setConfirmandoLectura] = useState(false);

  const cargarMuro = async () => {
    setCargando(true);
    setError(null);
    const res = await obtenerMuroComunicadosAction();
    if (res.success) {
      const lista: ComunicadoItem[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.items ?? res.data?.comunicados ?? []);
      setComunicados(lista);

      const urgenteSinLeer = lista.find(
        (c) => c.prioridad === 'URGENTE' && !c.leido,
      );
      if (urgenteSinLeer) {
        setSeleccionado(urgenteSinLeer);
        setEsUrgenteObligatorio(true);
      }
    } else {
      setError(res.error || 'No se pudieron cargar los comunicados.');
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarMuro();
  }, []);

  const handleConfirmarLectura = async (id: number) => {
    setConfirmandoLectura(true);
    const res = await marcarComunicadoLeidoAction(id);
    if (res.success) {
      const ahora = new Date().toISOString();
      const actualizados = comunicados.map((c) =>
        c.id === id ? { ...c, leido: true, fechaLectura: ahora } : c,
      );
      setComunicados(actualizados);

      const siguienteUrgente = actualizados.find(
        (c) => c.prioridad === 'URGENTE' && !c.leido,
      );
      if (siguienteUrgente) {
        setSeleccionado(siguienteUrgente);
        setEsUrgenteObligatorio(true);
      } else {
        setSeleccionado(null);
        setEsUrgenteObligatorio(false);
      }
    }
    setConfirmandoLectura(false);
  };

  const filtrados = comunicados.filter((c) =>
    filtroCategoria === 'TODAS' ? true : c.categoria === filtroCategoria,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#164a33]">
            Mi comunidad · Cartelera
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#111827] mt-1">
            Comunicados oficiales
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Avisos de administración, mantenimiento y seguridad de {CONDOMINIO.nombre}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['TODAS', 'MANTENIMIENTO', 'SEGURIDAD', 'ADMINISTRATIVO'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                filtroCategoria === cat
                  ? 'bg-[#143728] text-white'
                  : 'bg-white border border-[#E5E0D5] text-[#374151] hover:bg-[#F5F1E8]'
              }`}
            >
              {cat === 'TODAS' ? 'Todos' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="rounded-2xl border border-[#E5E0D5] bg-white p-8 text-center text-sm text-[#6B7280]">
          Cargando comunicados de la cartelera...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E0D5] bg-white p-8 text-center text-sm text-[#6B7280]">
          No hay comunicados publicados en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtrados.map((item) => (
            <article
              key={item.id}
              onClick={() => {
                setSeleccionado(item);
                setEsUrgenteObligatorio(item.prioridad === 'URGENTE' && !item.leido);
              }}
              className="cursor-pointer rounded-2xl border border-[#E5E0D5] bg-white p-6 transition hover:border-[#143728] hover:shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      item.prioridad === 'URGENTE'
                        ? 'bg-[#143728] text-white'
                        : item.prioridad === 'IMPORTANTE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#EFECE4] text-[#374151]'
                    }`}
                  >
                    {item.prioridad}
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      item.leido ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {item.leido ? '✓ Leído' : '● Pendiente de lectura'}
                  </span>
                </div>

                <h2 className="text-lg font-serif text-[#111827] leading-snug">
                  {item.titulo}
                </h2>

                <p className="text-xs text-[#4B5563] line-clamp-3 leading-relaxed">
                  {item.cuerpo}
                </p>
              </div>

              <div className="pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>
                  {new Date(item.fechaPublicacion).toLocaleDateString('es-SV', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="font-medium text-[#143728]">Leer comunicado →</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {seleccionado && (
        <ModalComunicadoUrgente
          comunicado={seleccionado}
          cargando={confirmandoLectura}
          obligatorio={esUrgenteObligatorio}
          onConfirmarLectura={handleConfirmarLectura}
          onCerrar={() => {
            if (!esUrgenteObligatorio) setSeleccionado(null);
          }}
        />
      )}
    </div>
  );
}
