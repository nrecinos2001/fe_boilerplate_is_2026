'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { DoorClosed, RefreshCw, Users, AlertCircle } from 'lucide-react';

type VisitaActiva = {
  id: string;
  nombreVisitante: string;
  documento: string;
  acompanantes: number;
  estado: 'DENTRO' | 'DENTRO_SIN_AUTORIZACION';
  entrada: string;
  salidaEsperada: string | null;
  motivo: string | null;
  unidad: { id: string; code: string; tower: string; label: string } | null;
  preautorizacion: {
    id: string;
    codigo: string;
    estado: string;
    fin: string;
  } | null;
  registradoPor: { id: string; email: string } | null;
};

type PanelData = {
  total: number;
  visitas: VisitaActiva[];
};

const POLL_INTERVAL_MS = 30_000;

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEstadoAutorizacion(v: VisitaActiva): { label: string; className: string } {
  if (!v.preautorizacion) {
    return { label: 'Sin autorización', className: 'bg-orange-100 text-orange-700' };
  }
  if (v.preautorizacion.estado === 'USADA') {
    return {
      label: `Usada · ${v.preautorizacion.codigo}`,
      className: 'bg-blue-100 text-blue-700',
    };
  }
  return { label: v.preautorizacion.codigo, className: 'bg-green-100 text-green-700' };
}

export default function PanelSeguridad() {
  const [data, setData] = useState<PanelData>({ total: 0, visitas: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  const loadPanel = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/visitas/activas');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al cargar el panel');
      }
      const panelData: PanelData = await res.json();
      // Solo actualizamos si el componente sigue montado
      if (mountedRef.current) {
        setData(panelData);
        setLastUpdated(new Date());
        setError(null);
        setIsLoading(false);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
        setIsLoading(false);
      }
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  const pollCount = useCallback(async () => {
    try {
      const res = await fetch('/api/visitas/activas/count');
      if (!res.ok) return;
      const { total }: { total: number } = await res.json();
      // Si el total cambió, recarga la lista completa
      if (mountedRef.current && total !== data.total) {
        loadPanel(false);
      }
    } catch {
      // Silencioso
    }
  }, [data.total, loadPanel]);

  // Marcar montado y cargar la primera vez
  useEffect(() => {
    mountedRef.current = true;

    // Diferimos la carga inicial al siguiente tick para evitar
    // el setState síncrono en el efecto
    const timeout = setTimeout(() => {
      loadPanel(false);
    }, 0);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
    };
  }, [loadPanel]);

  // Polling cada 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      pollCount();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollCount]);

  const handleRegistrarSalida = async (visitaId: string) => {
    try {
      const res = await fetch(`/api/visitas/${visitaId}/salida`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al registrar salida');
      }
      await loadPanel(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-gray-500">
        Cargando panel de seguridad...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Seguridad
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">
            Panel de seguridad
          </h1>
          <p className="text-gray-600">
            Consulta en tiempo real quiénes están dentro del condominio.
          </p>
        </div>
        <button
          onClick={() => loadPanel(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Contador grande */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0a2f1f] text-white flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Visitantes dentro
              </p>
              <p className="text-3xl font-bold text-gray-900">{data.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
            Con autorización
          </p>
          <p className="text-2xl font-bold text-blue-700">
            {data.visitas.filter((v) => v.preautorizacion).length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
            Sin autorización
          </p>
          <p className="text-2xl font-bold text-orange-600">
            {data.visitas.filter((v) => !v.preautorizacion).length}
          </p>
        </div>
      </div>

      {/* Última actualización */}
      {lastUpdated && (
        <p className="text-xs text-gray-500 mb-4">
          Última actualización: {lastUpdated.toLocaleTimeString('es-MX')} · Se actualiza automáticamente cada 30s
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Lista */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Visitante</div>
          <div className="col-span-2">Unidad</div>
          <div className="col-span-2">Autorización</div>
          <div className="col-span-2">Entrada</div>
          <div className="col-span-2">Salida esperada</div>
          <div className="col-span-1 text-right">Acción</div>
        </div>

        {data.visitas.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No hay visitantes dentro del condominio.
          </div>
        )}

        {data.visitas.map((v) => {
          const auth = getEstadoAutorizacion(v);
          return (
            <div
              key={v.id}
              className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="col-span-3">
                <p className="font-semibold text-sm text-gray-900">
                  {v.nombreVisitante}
                </p>
                <p className="text-xs text-gray-500">
                  Doc: {v.documento} · {v.acompanantes} acomp.
                </p>
              </div>
              <div className="col-span-2 text-xs text-gray-700">
                {v.unidad ? v.unidad.label : '—'}
              </div>
              <div className="col-span-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${auth.className}`}>
                  {auth.label}
                </span>
              </div>
              <div className="col-span-2 text-xs text-gray-700">
                <p className="font-medium">{formatTime(v.entrada)}</p>
                <p className="text-gray-400">
                  {new Date(v.entrada).toLocaleDateString('es-MX')}
                </p>
              </div>
              <div className="col-span-2 text-xs text-gray-700">
                {v.salidaEsperada ? (
                  <>
                    <p className="font-medium">{formatTime(v.salidaEsperada)}</p>
                    <p className="text-gray-400">
                      {formatDateTime(v.salidaEsperada)}
                    </p>
                  </>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => handleRegistrarSalida(v.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                  title="Registrar salida"
                >
                  <DoorClosed size={14} /> Salida
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer informativo */}
      <div className="mt-6 text-xs text-gray-500 flex items-center gap-2">
        <AlertCircle size={14} />
        Los registros del panel son de solo lectura. Solo se puede agregar la salida correspondiente.
      </div>
    </div>
  );
}