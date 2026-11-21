
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LogIn,
  Users,
  PackagePlus,
  Package,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const ITEMS: NavItem[] = [
  { href: "/mi-comunidad", label: "Mi comunidad", icon: Home },
  { href: "/seguridad/visitas", label: "Registro de entrada", icon: LogIn },
  { href: "/seguridad/panel", label: "Panel de seguridad", icon: Users },
  { href: "/paquetes/nuevo", label: "Llegada de paquete", icon: PackagePlus },
  { href: "/paquetes", label: "Paquetes pendientes", icon: Package },
  { href: "/areas/disponibilidad", label: "Disponibilidad de áreas", icon: LayoutGrid },
];

function matches(pathname: string, href: string): boolean {
  if (href === "/paquetes") {
    return (
      pathname === "/paquetes" ||
      /^\/paquetes\/[^/]+\/entrega$/.test(pathname)
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, href: string): boolean {
  if (!matches(pathname, href)) return false;

  return !ITEMS.some(
    (other) =>
      other.href !== href &&
      other.href.length > href.length &&
      matches(pathname, other.href),
  );
}

export default function SecurityNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 font-semibold mb-2 px-2 uppercase tracking-wider">
          Navegación
        </p>

        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-2 py-2 text-sm rounded-md transition mt-1 ${
                active
                  ? "bg-[#164a33] text-white"
                  : "text-gray-300 hover:text-white hover:bg-[#164a33]"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
