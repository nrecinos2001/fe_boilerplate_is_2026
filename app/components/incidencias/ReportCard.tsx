import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export type ReportStatus = 'Recibida' | 'En atención' | 'Por confirmar' | 'Cerrada';

export interface Report {
  id: string;          
  folio: string;       
  title: string;
  location: string;
  date: string;
  time: string;
  status: ReportStatus;
  photosCount: number;
  resolutionPhotosCount?: number;
}

export default function ReportCard({ report }: { report: Report }) {
  const getStatusStyles = (status: ReportStatus) => {
    switch (status) {
      case 'Recibida':
        return 'bg-[#e6f0eb] text-[#0a2f1f]'; 
      case 'En atención':
        return 'bg-[#e6f0eb] text-[#0a2f1f]'; 
      case 'Por confirmar':
        return 'bg-[#f5f0e6] text-[#8c6d3f]'; 
      case 'Cerrada':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 items-center p-4 border-b border-gray-200 bg-white hover:bg-gray-50 transition">
      <div className="col-span-4">
        <p className="font-semibold text-gray-900 text-sm">{report.title}</p>
        <p className="text-xs text-gray-500 mt-1">
          {report.folio} · {report.date}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {report.photosCount} {report.photosCount === 1 ? 'foto original' : 'fotos originales'} 
          {report.resolutionPhotosCount ? ` · ${report.resolutionPhotosCount} de resolución` : ''}
        </p>
      </div>

      <div className="col-span-3">
        <p className="text-sm text-gray-700">{report.location}</p>
      </div>

      <div className="col-span-2">
        <p className="text-sm text-gray-700">{report.date}</p>
        <p className="text-xs text-gray-500">{report.time}</p>
      </div>

      <div className="col-span-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyles(report.status)}`}>
          {report.status}
        </span>
        {report.status === 'Por confirmar' && (
          <p className="text-xs text-gray-500 mt-1">Pendiente de tu confirmación</p>
        )}
      </div>

      <div className="col-span-1 text-right">
        <Link 
          href={`/incidencias/${report.id}`} 
          className="text-sm font-medium text-[#0a2f1f] hover:underline flex items-center justify-end gap-1"
        >
          {report.status === 'Por confirmar' ? 'Revisar resolución' : 'Ver detalle'}
        </Link>
      </div>
    </div>
  );
}