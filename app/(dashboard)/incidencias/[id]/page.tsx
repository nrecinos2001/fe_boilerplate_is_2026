'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import Timeline, { TimelineEvent } from '@/app/components/incidencias/Timeline';
import { useRouter } from 'next/navigation';
import { CONDOMINIO } from '@/lib/condominio';

type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

type ReportEvent = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  userId: string;
  createdAt: string;
};

type ApiReport = {
  id: string;
  folio: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  unit: string;
  priority: Priority | null;
  priorityJustification: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  resolutionComment: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  createdAt: string;
  updatedAt: string;
  photos: { id: string; url: string }[];
  events: ReportEvent[];
  assignee: { id: string; email: string } | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' h',
  };
}

function getPriorityLabel(p: Priority | null): string {
  if (!p) return 'Sin prioridad';
  const labels: Record<Priority, string> = {
    BAJA: 'Baja',
    MEDIA: 'Media',
    ALTA: 'Alta',
    CRITICA: 'Crítica',
  };
  return labels[p];
}

function buildTimeline(report: ApiReport): TimelineEvent[] {
  return (report.events ?? []).map((evt) => {
    const { date, time } = formatDateTime(evt.createdAt);
    const meta = evt.metadata ?? {};

    let title = evt.action;
    let description = '';

    switch (evt.action) {
      case 'CREADO':
        title = 'Reporte recibido';
        description = 'Registramos tu incidencia y las fotos adjuntas.';
        break;
      case 'ASIGNADO': {
        title = 'Asignado a la administración';
        const priority = typeof meta.priority === 'string' ? (meta.priority as Priority) : undefined;
        const dueDate = typeof meta.dueDate === 'string' ? meta.dueDate : undefined;
        const justification = typeof meta.priorityJustification === 'string' ? meta.priorityJustification : undefined;
        const parts: string[] = [];
        if (priority) parts.push(`Prioridad: ${getPriorityLabel(priority)}`);
        if (dueDate) {
          const d = formatDateTime(dueDate);
          parts.push(`Fecha compromiso: ${d.date}`);
        }
        if (justification) parts.push(`Justificación: ${justification}`);
        description = parts.join(' · ') || 'Se asignó un responsable.';
        break;
      }
      case 'RESUELTO': {
        title = 'Resolución informada';
        const comment = typeof meta.resolutionComment === 'string' ? meta.resolutionComment : null;
        description = comment ?? 'La administración marcó el reporte como resuelto.';
        break;
      }
      case 'RECHAZADO': {
        title = 'Resolución rechazada';
        const reason = typeof meta.rejectionComment === 'string' ? meta.rejectionComment : null;
        description = reason ?? 'El residente rechazó la resolución.';
        break;
      }
      default:
        description = '';
    }

    return {
      id: evt.id,
      title,
      date,
      time,
      description,
      status: 'completed' as const,
    };
  });
}

export default function DetalleIncidenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [report, setReport] = useState<ApiReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/incidencias/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? 'Error al cargar el reporte');
        }
        const data: ApiReport = await res.json();
        if (!ignore) setReport(data);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [params]);

  const handleConfirm = () => {
    // TODO: conectar al backend cuando exista el endpoint
    setIsResolved(true);
  };

  const handleReject = () => {
    if (!comment.trim()) {
      alert('Por favor, describe qué sigue pendiente antes de rechazar.');
      return;
    }
    // TODO: conectar al backend cuando exista el endpoint
    setIsResolved(true);
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto py-16 text-center text-gray-500">Cargando reporte...</div>;
  }
  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center">
        <p className="text-red-600 mb-4">{error ?? 'Reporte no encontrado'}</p>
        <Link href="/incidencias" className="text-[#0a2f1f] underline">Volver a Mis reportes</Link>
      </div>
    );
  }

  const created = formatDateTime(report.createdAt);
  const updated = formatDateTime(report.updatedAt);
  const timeline = buildTimeline(report);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Incidencias</p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">{report.title}</h1>
          <p className="text-gray-600 text-sm">
            {report.folio} · Reportada el {created.date}, {created.time} · {CONDOMINIO.nombre}
          </p>
        </div>
        <Link
          href="/incidencias"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition bg-white"
        >
          <ArrowLeft size={16} /> Mis reportes
        </Link>
      </div>

      {/* Banner de estado */}
      {report.status === 'Resuelto' && !isResolved && (
        <div className="bg-[#f5f0e6] border border-[#e8dfcf] rounded-xl p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-[#0a2f1f]" size={24} />
            <div>
              <p className="font-semibold text-gray-900">Resuelta · Pendiente de tu confirmación</p>
              <p className="text-sm text-gray-600">
                La administración informó una solución el {updated.date}, {updated.time}. El reporte aún no está cerrado.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700">
            Requiere tu revisión
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reporte original */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Tu reporte original</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ubicación</p>
                <p className="text-sm text-gray-900">{report.location}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Categoría</p>
                <p className="text-sm text-gray-900">{report.category}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Unidad</p>
                <p className="text-sm text-gray-900">{report.unit}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Prioridad</p>
                <p className="text-sm text-gray-900">{getPriorityLabel(report.priority)}</p>
              </div>
            </div>

            {report.assignee && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Responsable</p>
                <p className="text-sm text-gray-900">{report.assignee.email}</p>
              </div>
            )}

            <p className="text-sm text-gray-700 leading-relaxed mb-6 border-t border-gray-100 pt-4">
              {report.description}
            </p>

            {report.photos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Evidencia original · {report.photos.length} {report.photos.length === 1 ? 'foto' : 'fotos'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {report.photos.map((photo) => {
                    const fullUrl = `${BACKEND_URL}${photo.url}`;
                    return (
                      <a
                        key={photo.id}
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fullUrl} alt="Evidencia del reporte" className="w-full h-full object-cover" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Seguimiento de la administración</h2>
            {timeline.length > 0 ? (
              <Timeline events={timeline} />
            ) : (
              <p className="text-sm text-gray-500">Aún no hay eventos de seguimiento.</p>
            )}
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Quedó solucionado?</h3>
            <p className="text-sm text-gray-600 mb-4">Revisa la respuesta y verifica el área antes de tomar una decisión.</p>

            {report.status === 'Resuelto' && !isResolved ? (
              <>
                {report.resolutionComment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                      Mensaje del administrador
                    </p>
                    <p className="text-sm text-blue-900">{report.resolutionComment}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comentario para la administración</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Si el problema continúa, describe qué sigue pendiente..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional al confirmar. Obligatorio si rechazas la resolución.</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleConfirm}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition"
                  >
                    <Check size={16} /> Confirmar resolución
                  </button>
                  <p className="text-xs text-gray-500 text-center">Al confirmar, el reporte se cerrará y quedará en tu historial.</p>
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={handleReject}
                      className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Rechazar resolución
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Si el problema continúa, rechaza la resolución. El reporte volverá a atención con tu comentario.
                    </p>
                  </div>
                </div>
              </>
            ) : isResolved ? (
              <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm text-center">
                Gracias. Tu decisión ha sido registrada.
              </div>
            ) : (
              <div className="bg-gray-50 text-gray-700 p-4 rounded-lg text-sm text-center">
                Este reporte aún no tiene una resolución. Te avisaremos cuando esté lista.
              </div>
            )}
          </div>

          {/* Resumen del expediente */}
          <div className="bg-[#f5f0e6] rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Resumen del expediente</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Registro</p>
                <p className="text-gray-900">{created.date}, {created.time}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Último avance</p>
                <p className="text-gray-900">{updated.date}, {updated.time}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Adjuntos</p>
                <p className="text-gray-900">{report.photos.length} {report.photos.length === 1 ? 'foto' : 'fotos'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-500">
        Información al {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} · Fechas y horas locales de {CONDOMINIO.nombre}.
      </div>
    </div>
  );
}