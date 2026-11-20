import { formatBadge } from "@/src/types/notifications";

interface BellBadgeProps {
  unread: number;
}

/** Ícono de campana con el contador de avisos sin leer ("99+" por encima de 99). */
export function BellBadge({ unread }: BellBadgeProps) {
  const badge = formatBadge(unread);
  const label =
    unread > 0 ? `Avisos: ${unread} sin leer` : "Avisos: no tienes avisos sin leer";

  return (
    <span className="relative inline-flex" aria-label={label} title={label}>
      <span aria-hidden="true" className="text-xl leading-none">
        🔔
      </span>
      {badge && (
        <span
          data-testid="bell-badge"
          className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-semibold leading-5 text-white"
        >
          {badge}
        </span>
      )}
    </span>
  );
}
