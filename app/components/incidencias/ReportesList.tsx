'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronDown, CheckCircle2 } from 'lucide-react';
import ReportCard, { Report } from '@/app/components/incidencias/ReportCard';
import { CONDOMINIO } from '@/lib/condominio';

type ApiReport = {
  id: string;
  folio: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
  photos: { id: string; url: string }[];
};

function mapStatus(apiStatus: string): Report['status'] {
  switch (apiStatus) {
    case 'Abierto':
      return 'Recibida';
    case 'En atención':
      return 'En atención';
    case 'Resuelto':
      return 'Por confirmar';
    case 'Cerrado':
      return 'Cerrada';
    default:
      return 'Recibida';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return (
    new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' h'
  );
}

type ReportesListProps = {
  displayName: string;
};

export default function ReportesList({ displayName }: ReportesListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/incidencias');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? 'Error al cargar reportes');
        }
        const data: ApiReport[] = await res.json();

        const mapped: Report[] = data.map((r) => ({
          id: r.id,
          folio: r.folio,
          title: r.title,
          location: r.location,
          date: formatDate(r.updatedAt || r.createdAt),
          time: formatTime(r.updatedAt || r.createdAt),
          status: mapStatus(r.status),
          photosCount: r.photos.length,
        }));
        setReports(mapped);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredReports = reports.filter((report) => {
    const matchesFilter =
      activeFilter === 'Todos' || report.status === activeFilter;
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.folio.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    Todos: reports.length,
    Recibida: reports.filter((r) => r.status === 'Recibida').length,
    'En atención': reports.filter((r) => r.status === 'En atención').length,
    'Por confirmar': reports.filter((r) => r.status === 'Por confirmar').length,
    Cerrada: reports.filter((r) => r.status === 'Cerrada').length,
  };

  const pendingConfirmation = reports.find((r) => r.status === 'Por confirmar');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Incidencias
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">
            Mis reportes
          </h1>
          <p className="text-gray-600">
            Consulta las incidencias que has reportado y sigue cada avance desde
            aquí.
          </p>
        </div>
        <Link
          href="/incidencias/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition"
        >
          <Plus size={16} /> Nuevo reporte
        </Link>
      </div>

      {pendingConfirmation && (
        <div className="bg-[#f5f0e6] border border-[#e8dfcf] rounded-xl p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-[#0a2f1f]" size={24} />
            <div>
              <p className="font-semibold text-gray-900">
                Tienes una resolución por revisar
              </p>
              <p className="text-sm text-gray-600">
                La incidencia{' '}
                <span className="font-medium">{pendingConfirmation.folio}</span>{' '}
                fue atendida. Confirma si el problema quedó solucionado.
              </p>
            </div>
          </div>
          <Link
            href={`/incidencias/${pendingConfirmation.id}`}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
          >
            Revisar resolución
          </Link>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Reportes de {displayName}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Periodo:</span>
              <button className="flex items-center gap-1 font-medium hover:text-gray-900">
                {new Date().getFullYear()} <ChevronDown size={14} />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  'Todos',
                  'Recibida',
                  'En atención',
                  'Por confirmar',
                  'Cerrada',
                ] as const
              ).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    activeFilter === filter
                      ? 'bg-[#0a2f1f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter} ({counts[filter as keyof typeof counts] ?? 0})
                </button>
              ))}
            </div>

            <div className="relative w-72">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar por asunto o folio"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Asunto / Folio / Registro</div>
          <div className="col-span-3">Ubicación</div>
          <div className="col-span-2">Actualización</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1 text-right">Acciones</div>
        </div>

        <div className="flex flex-col">
          {isLoading && (
            <div className="p-8 text-center text-gray-500">
              Cargando reportes...
            </div>
          )}
          {error && (
            <div className="p-8 text-center text-red-600">{error}</div>
          )}
          {!isLoading && !error && filteredReports.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {reports.length === 0
                ? 'Aún no tienes reportes. Crea el primero con el botón "Nuevo reporte".'
                : 'No se encontraron reportes que coincidan con tu búsqueda.'}
            </div>
          )}
          {!isLoading &&
            !error &&
            filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
          <span>
            {filteredReports.length > 0
              ? `1-${filteredReports.length} de ${filteredReports.length} reportes · Solo tus reportes`
              : 'Sin reportes'}
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-gray-400 cursor-not-allowed">
              Anterior
            </button>
            <button className="px-3 py-1 bg-gray-100 rounded font-medium text-gray-900">
              1
            </button>
            <button className="px-3 py-1 text-gray-400">Siguiente</button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        Información al{' '}
        {new Date().toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
        ,{' '}
        {new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        · Fechas y horas locales de {CONDOMINIO.nombre}.
      </div>
    </div>
  );
}