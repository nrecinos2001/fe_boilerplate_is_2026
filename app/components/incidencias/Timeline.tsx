import { Check, Clock } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  status: 'completed' | 'pending';
  attachment?: {
    name: string;
    size: string;
  };
}

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
          {/* Línea conectora (excepto en el último elemento) */}
          {index !== events.length - 1 && (
            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gray-200" />
          )}

       
          <div className="relative z-10 shrink-0 mt-0.5">
            {event.status === 'completed' ? (
              <div className="w-6 h-6 rounded-full bg-[#0a2f1f] flex items-center justify-center text-white">
                <Check size={14} />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-500">
                <Clock size={14} />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
              <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                {event.date} · {event.time}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {event.description}
            </p>


            {event.attachment && (
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{event.attachment.name}</p>
                    <p className="text-xs text-gray-500">{event.attachment.size}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-[#0a2f1f] hover:underline">
                  Ver archivo
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}