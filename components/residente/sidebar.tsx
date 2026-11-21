"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; disponible?: boolean };

// Mismas pantallas que ResidentNav (la barra de (dashboard)) para un residente. Un item sin
// `disponible: true` se muestra pero no es enlace (pantalla aún no construida).
const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "General",
    items: [
      { label: "Mi comunidad", href: "/mi-comunidad", disponible: true },
      { label: "Estado de cuenta", href: "/estado-de-cuenta", disponible: true },
      { label: "Realizar pago", href: "/pagos", disponible: true },
      { label: "Notificaciones", href: "/notificaciones", disponible: true },
    ],
  },
  {
    titulo: "Mi comunidad",
    items: [
      { label: "Cartelera", href: "/cartelera", disponible: true },
      { label: "Directorio", href: "/directorio", disponible: true },
      { label: "Áreas comunes", href: "/areas/disponibilidad", disponible: true },
      { label: "Nueva reserva", href: "/reservas/nueva", disponible: true },
      { label: "Mis reservas", href: "/reservas", disponible: true },
      { label: "Incidencias", href: "/incidencias", disponible: true },
      { label: "Mis visitas", href: "/visitas", disponible: true },
      { label: "Paquetes", href: "/paquetes", disponible: true },
      { label: "Asambleas", href: "/asambleas", disponible: true },
    ],
  },
];

function Grupos({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-6">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="mb-2 px-3 text-[10px] tracking-[0.18em] text-white/50">
            {grupo.titulo.toUpperCase()}
          </p>
          <ul className="flex flex-col gap-0.5">
            {grupo.items.map((item) => {
              // "Preferencias de avisos" cuelga del centro de notificaciones.
              const activo =
                pathname.startsWith(item.href) ||
                (item.href === "/notificaciones" && pathname.startsWith("/preferencias"));
              const base = "block rounded-lg px-3 py-2 text-sm";
              return (
                <li key={item.href}>
                  {item.disponible ? (
                    <Link
                      href={item.href}
                      aria-current={activo ? "page" : undefined}
                      className={`${base} ${
                        activo
                          ? "bg-white/15 font-medium"
                          : "text-white/85 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={`${base} cursor-not-allowed text-white/40`}
                      title="Próximamente"
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Debajo de `md` la barra lateral se oculta; este menú desplegable muestra los mismos items.
// `key={pathname}` lo vuelve a cerrar al navegar.
export function MenuMovil() {
  const pathname = usePathname();

  return (
    <details key={pathname} className="bg-habita-900 text-white md:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3">
        <span className="font-serif text-2xl">habita</span>
        <span className="rounded-lg border border-white/30 px-3 py-1.5 text-sm">Menú</span>
      </summary>
      <nav aria-label="Principal" className="px-2 pb-5">
        <Grupos pathname={pathname} />
      </nav>
    </details>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-habita-900 px-5 py-7 text-white md:flex">
      <div className="mb-8">
        <p className="font-serif text-3xl leading-none">habita</p>
        <p className="mt-1 text-[10px] tracking-[0.18em] text-white/55">
          GESTIÓN DE CONDOMINIOS
        </p>
      </div>

      <nav aria-label="Principal">
        <Grupos pathname={pathname} />
      </nav>
    </aside>
  );
}
