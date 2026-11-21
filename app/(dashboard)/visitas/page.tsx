import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/current-user';
import { apiFetch } from '@/lib/api';

type Pre = {
  id: string;
  codigo: string;
  nombreVisitante: string;
  documento: string;
  inicio: string;
  fin: string;
  estado: string;
  acompanantes: number;
  motivo: string | null;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEstadoStyles(estado: string): string {
  switch (estado) {
    case 'VIGENTE': return 'bg-green-100 text-green-700';
    case 'USADA': return 'bg-gray-100 text-gray-700';
    case 'CANCELADA': return 'bg-red-100 text-red-700';
    case 'EXPIRADA': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default async function VisitasPage() {
  const user = await getCurrentUser();
  let preautorizaciones: Pre[] = [];
  try {
    preautorizaciones = await apiFetch('/preautorizaciones');
  } catch {
    preautorizaciones = [];
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Visitas</p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">Mis pre-autorizaciones</h1>
          <p className="text-gray-600">Comparte el código con tu visitante para agilizar su acceso.</p>
        </div>
        <Link href="/visitas/nueva" className="flex items-center gap-2 px-4 py-2 bg-[#0a2f1f] text-white rounded-lg text-sm hover:bg-[#164a33] transition">
          <Plus size={16} /> Nueva pre-autorización
        </Link>
      </div>

      {preautorizaciones.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          No tienes pre-autorizaciones. Crea la primera con el botón de arriba.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Visitante</div>
            <div className="col-span-3">Vigencia</div>
            <div className="col-span-2">Código</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-1 text-right">Acomp.</div>
          </div>

          {preautorizaciones.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
              <div className="col-span-4">
                <p className="font-semibold text-sm text-gray-900">{p.nombreVisitante}</p>
                <p className="text-xs text-gray-500">Doc: {p.documento}</p>
              </div>
              <div className="col-span-3 text-xs text-gray-700">
                <p>{formatDateTime(p.inicio)}</p>
                <p className="text-gray-400">→ {formatDateTime(p.fin)}</p>
              </div>
              <div className="col-span-2">
                <span className="font-mono text-sm font-bold text-[#0a2f1f]">{p.codigo}</span>
              </div>
              <div className="col-span-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getEstadoStyles(p.estado)}`}>
                  {p.estado}
                </span>
              </div>
              <div className="col-span-1 text-right text-sm text-gray-700">
                {p.acompanantes}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}