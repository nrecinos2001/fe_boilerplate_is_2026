import Link from "next/link";

interface MemberSessionsNavProps {
  active: "book" | "mine";
}

export function MemberSessionsNav({ active }: MemberSessionsNavProps) {
  const activeTabClass =
    "rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs";
  const inactiveTabClass =
    "rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors";

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <nav aria-label="Migas de pan" className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/dashboard" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Inicio
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {active === "book" ? "Agendar sesión personal" : "Mis sesiones"}
          </span>
        </nav>

        <nav aria-label="Navegación de sesiones personales" className="flex flex-wrap gap-2">
          <Link
            href="/miembro/sesiones/agendar"
            aria-current={active === "book" ? "page" : undefined}
            className={active === "book" ? activeTabClass : inactiveTabClass}
          >
            Agendar sesión
          </Link>
          <Link
            href="/miembro/sesiones"
            aria-current={active === "mine" ? "page" : undefined}
            className={active === "mine" ? activeTabClass : inactiveTabClass}
          >
            Mis sesiones
          </Link>
        </nav>
      </div>

      <span className="self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 sm:self-center">
        Rol: Miembro
      </span>
    </div>
  );
}
