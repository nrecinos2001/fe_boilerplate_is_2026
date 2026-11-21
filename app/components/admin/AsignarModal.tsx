'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

type Report = {
  id: string;
  folio: string;
  title: string;
  status: string;
  priority: Priority | null;
  assigneeId: string | null;
  dueDate: string | null;
  resolutionComment: string | null;
};

type Responsable = {
  id: string;
  email: string;
};

type Props = {
  report: Report;
  onClose: () => void;
  onSaved: () => void;
};

export default function AsignarModal({ report, onClose, onSaved }: Props) {
  const [priority, setPriority] = useState<Priority>(report.priority ?? 'MEDIA');
  const [assigneeId, setAssigneeId] = useState(report.assigneeId ?? '');
  const [dueDate, setDueDate] = useState(
    report.dueDate ? report.dueDate.slice(0, 10) : '',
  );
  const [justification, setJustification] = useState('');
  const [resolutionComment, setResolutionComment] = useState(report.resolutionComment ?? '');

  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/incidencias/responsables')
      .then((r) => (r.ok ? r.json() : []))
      .then(setResponsables)
      .catch(() => setResponsables([]));
  }, []);

  const handleAssign = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/incidencias/${report.id}/asignar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority,
          assigneeId,
          dueDate: dueDate ? new Date(dueDate).toISOString() : '',
          ...(priority === 'CRITICA' && { priorityJustification: justification }),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al asignar');
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/incidencias/${report.id}/resolver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionComment }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al resolver');
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">{report.title}</h2>
        <p className="text-sm text-gray-500 mb-6">{report.folio} · Estado: {report.status}</p>

        {/* Asignación */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>

          {priority === 'CRITICA' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justificación (10-200 caracteres) *
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="">Selecciona un responsable</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>{r.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha compromiso</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>

          <button
            onClick={handleAssign}
            disabled={submitting}
            className="w-full px-4 py-2.5 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar asignación'}
          </button>
        </div>

        {/* Comentario actual (solo lectura) */}
        {report.resolutionComment && (
          <div className="border-t border-gray-200 pt-4 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Comentario registrado</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-900">
              {report.resolutionComment}
            </div>
          </div>
        )}

        {/* Resolución (solo si el reporte está En atención) */}
        {report.status === 'En atención' && (
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comentario de resolución (10-200 caracteres)
            </label>
            <textarea
              value={resolutionComment}
              onChange={(e) => setResolutionComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mb-2"
            />
            <button
              onClick={handleResolve}
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Marcar como resuelto'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}