'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import AsignarModal from './AsignarModal';

type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

type ApiReport = {
  id: string;
  folio: string;
  title: string;
  category: string;
  location: string;
  status: string;
  unit: string;
  priority: Priority | null;
  priorityJustification: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  resolutionComment: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; email: string } | null;
  user: { id: string; email: string };
  photos: { id: string; url: string }[];
};

type ApiResponse = {
  reports: ApiReport[];
  counts: Record<string, number>;
};

type Props = {
  adminEmail: string;
};

const PRIORITIES: Priority[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

function getPriorityStyles(p: Priority | null): string {
  switch (p) {
    case 'CRITICA': return 'bg-red-100 text-red-700';
    case 'ALTA': return 'bg-orange-100 text-orange-700';
    case 'MEDIA': return 'bg-yellow-100 text-yellow-700';
    case 'BAJA': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function AdminIncidenciasList({ adminEmail }: Props) {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [search, setSearch] = useState('');

  const [selectedReport, setSelectedReport] = useState<ApiReport | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // useCallback evita que load cambie en cada render
  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterUnit) params.set('unit', filterUnit);

    try {
      const res = await fetch(`/api/incidencias/admin?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al cargar reportes');
      }
      const data: ApiResponse = await res.json();
      setReports(data.reports);
      setCounts(data.counts);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterPriority, filterUnit]);

  // Solo se dispara cuando cambian los filtros o reloadKey
  useEffect(() => {
    let ignore = false;

    const run = async () => {
      // No llamamos setIsLoading(true) síncronamente: usamos una microtask
      if (!ignore) setIsLoading(true);
      await load();
      if (ignore) return;
    };

    run();

    return () => {
      ignore = true;
    };
  }, [load, reloadKey]);

  const filtered = reports.filter((r) => {
    const s = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(s) ||
      r.folio.toLowerCase().includes(s) ||
      r.user.email.toLowerCase().includes(s)
    );
  });

  const handleSaved = () => {
    setSelectedReport(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Administración
        </p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">
          Panel de incidencias
        </h1>
        <p className="text-gray-600">
          Hola {adminEmail}. Clasifica prioridad, asigna responsables y resuelve reportes.
        </p>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(['BAJA', 'MEDIA', 'ALTA', 'CRITICA', 'SIN_PRIORIDAD'] as const).map((p) => (
          <div key={p} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">
              {p === 'SIN_PRIORIDAD' ? 'Sin prioridad' : p}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {counts[p] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          >
            <option value="">Todos los estados</option>
            <option value="Abierto">Abierto</option>
            <option value="En atención">En atención</option>
            <option value="Resuelto">Resuelto</option>
            <option value="Cerrado">Cerrado</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          >
            <option value="">Todas las prioridades</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Unidad (ej. A-19)"
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por título, folio o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Asunto / Folio</div>
          <div className="col-span-2">Unidad</div>
          <div className="col-span-2">Responsable</div>
          <div className="col-span-2">Prioridad</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1 text-right">Acciones</div>
        </div>

        {isLoading && <div className="p-8 text-center text-gray-500">Cargando...</div>}
        {!isLoading && error && <div className="p-8 text-center text-red-600">{error}</div>}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">No hay reportes con esos filtros.</div>
        )}

        {!isLoading && !error && filtered.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-4 items-center p-4 border-b border-gray-100 hover:bg-gray-50">
            <div className="col-span-3">
              <p className="font-semibold text-sm text-gray-900">{r.title}</p>
              <p className="text-xs text-gray-500">{r.folio}</p>
            </div>
            <div className="col-span-2 text-sm text-gray-700">{r.unit}</div>
            <div className="col-span-2 text-sm text-gray-700">
              {r.assignee?.email ?? <span className="text-gray-400">Sin asignar</span>}
            </div>
            <div className="col-span-2">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityStyles(r.priority)}`}>
                {r.priority ?? 'Sin prioridad'}
              </span>
            </div>
            <div className="col-span-2 text-sm text-gray-700">{r.status}</div>
            <div className="col-span-1 text-right">
              <button
                onClick={() => setSelectedReport(r)}
                className="text-sm font-medium text-[#0a2f1f] hover:underline"
              >
                Gestionar
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedReport && (
        <AsignarModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}