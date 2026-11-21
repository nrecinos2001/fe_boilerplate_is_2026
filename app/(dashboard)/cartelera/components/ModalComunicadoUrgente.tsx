'use client';

import React, { useEffect } from 'react';
import { CONDOMINIO } from '@/lib/condominio';

export interface ComunicadoItem {
  id: number;
  titulo: string;
  cuerpo: string;
  categoria: 'MANTENIMIENTO' | 'SEGURIDAD' | 'ADMINISTRATIVO';
  prioridad: 'INFORMATIVO' | 'IMPORTANTE' | 'URGENTE';
  audienciaTipo: 'TODO_EL_CONDOMINIO' | 'POR_TORRE' | 'POR_SECCION';
  audienciaTarget?: string | null;
  fechaPublicacion: string;
  leido: boolean;
  fechaLectura?: string | null;
  adjuntos?: {
    id: number;
    nombreOriginal: string;
    rutaArchivo: string;
    tamanoBytes: number;
  }[];
}

interface ModalComunicadoProps {
  comunicado: ComunicadoItem;
  cargando: boolean;
  obligatorio: boolean;
  onConfirmarLectura: (id: number) => void;
  onCerrar?: () => void;
}

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export function ModalComunicadoUrgente({
  comunicado,
  cargando,
  obligatorio,
  onConfirmarLectura,
  onCerrar,
}: ModalComunicadoProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (obligatorio) {
          e.preventDefault();
          e.stopPropagation();
        } else if (onCerrar) {
          onCerrar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [obligatorio, onCerrar]);

  const fechaFormateada = new Date(comunicado.fechaPublicacion).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const horaFormateada = new Date(comunicado.fechaPublicacion).toLocaleTimeString('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const codigoComunicado = `COM-${new Date(comunicado.fechaPublicacion).getFullYear()}-${String(
    comunicado.id,
  ).padStart(3, '0')}`;

  const destinoTexto =
    comunicado.audienciaTipo === 'TODO_EL_CONDOMINIO'
      ? 'Todo el condominio'
      : comunicado.audienciaTarget || comunicado.audienciaTipo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-comunicado-titulo"
      onClick={() => {
        if (!obligatorio && onCerrar) onCerrar();
      }}
    >
      <div
        className="bg-white max-w-2xl w-full rounded-2xl border border-[#E5E0D5] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pt-6 pb-2 flex items-center justify-between">
          <span
            className={`inline-block px-3 py-1 text-[11px] font-medium rounded-full ${
              comunicado.prioridad === 'URGENTE'
                ? 'bg-[#143728] text-white'
                : 'bg-[#EFECE4] text-[#374151]'
            }`}
          >
            {comunicado.prioridad === 'URGENTE'
              ? 'Comunicado urgente · Atención prioritaria'
              : `Comunicado · ${comunicado.categoria}`}
          </span>

          {!obligatorio && onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar comunicado"
              className="text-gray-400 hover:text-gray-700 text-lg leading-none px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        <div className="px-7 py-4 space-y-4 max-h-[72vh] overflow-y-auto">
          <div>
            <h2
              id="modal-comunicado-titulo"
              className="text-2xl sm:text-[26px] font-serif text-[#111827] leading-tight"
            >
              {comunicado.titulo}
            </h2>
            <div className="mt-2 text-xs text-[#6B7280] space-y-0.5">
              <p>
                {fechaFormateada} · {horaFormateada} h
              </p>
              <p>
                Administración · {CONDOMINIO.nombre} · {codigoComunicado}
              </p>
            </div>
          </div>

          <div className="text-[13.5px] text-[#374151] whitespace-pre-line leading-relaxed pt-1">
            {comunicado.cuerpo}
          </div>

          <div className="bg-[#F5F1E8] border border-[#EAE3D5] rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#374151]">
            <span className="text-[#6B7280]">🕒</span>
            <span>
              Publicado para <strong className="font-semibold text-[#111827]">{destinoTexto}</strong> ·{' '}
              {fechaFormateada}
            </span>
          </div>

          {comunicado.adjuntos && comunicado.adjuntos.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-[#4B5563]">Archivos adjuntos:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {comunicado.adjuntos.map((adj) => (
                  <a
                    key={adj.id}
                    href={`${BACKEND_BASE}${adj.rutaArchivo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] hover:bg-[#F2EFE7] text-xs text-[#143728] font-medium transition-colors"
                  >
                    <span className="truncate">📎 {adj.nombreOriginal}</span>
                    <span className="text-[11px] text-[#6B7280] shrink-0 ml-2">Descargar ↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-7 py-5 border-t border-[#EFECE4] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#6B7280]">
            El mensaje seguirá disponible en la cartelera.
          </p>

          {!comunicado.leido ? (
            <button
              type="button"
              disabled={cargando}
              onClick={() => onConfirmarLectura(comunicado.id)}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#143728] text-white rounded-lg text-xs font-medium hover:bg-[#0F2A1E] disabled:bg-gray-300 transition-colors cursor-pointer"
            >
              {cargando ? 'Registrando lectura...' : 'Marcar como leído'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#143728] text-white rounded-lg text-xs font-medium hover:bg-[#0F2A1E] transition-colors cursor-pointer"
            >
              Entendido, cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}