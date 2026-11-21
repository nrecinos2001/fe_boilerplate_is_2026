import Link from "next/link";
import { contarNoLeidas } from "@/lib/notificaciones-api";

export function BellLink({ count }: { count: number }) {
  const etiqueta =
    count > 0 ? `Notificaciones, ${count} sin leer` : "Notificaciones";
  return (
    <Link
      href="/notificaciones"
      aria-label={etiqueta}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-habita-900 hover:bg-arena"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {count > 0 && (
        <span
          data-testid="bell-count"
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-habita-900 px-1 text-[10px] font-semibold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

// FE-24.2: indicador de no leídas del encabezado. Si el conteo falla, la campana
// se muestra sin número en lugar de romper el encabezado.
export async function NotificationBell() {
  let count = 0;
  try {
    count = await contarNoLeidas();
  } catch {
    count = 0;
  }
  return <BellLink count={count} />;
}
