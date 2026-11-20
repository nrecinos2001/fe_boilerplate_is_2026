"use client";

import Link from "next/link";
import { LogoutButton } from "@/app/logout-button";
import { useAuthStatus, useAuthUser } from "@/src/stores/useAuthStore";

type NavKey = "jornada" | "agenda";

interface NavItem {
  label: string;
  icon: string;
  key?: NavKey;
  href?: string;
}

const NAV: NavItem[] = [
  { label: "Mi jornada", icon: "▦", key: "jornada", href: "/trainer" },
  { label: "Mi agenda", icon: "▤", key: "agenda", href: "/trainer/agenda" },
  { label: "Mis miembros", icon: "◍" },
  { label: "Planes de entrenamiento", icon: "⚲" },
  { label: "Seguimiento", icon: "↗" },
  { label: "Reseñas", icon: "☆" },
];

interface TrainerShellProps {
  active: NavKey;
  crumbs: React.ReactNode;
  children: React.ReactNode;
}

function formatToday(): string {
  const text = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Marco común del panel del entrenador: sidebar, barra superior y control de rol. */
export function TrainerShell({ active, crumbs, children }: TrainerShellProps) {
  const status = useAuthStatus();
  const user = useAuthUser();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tr-green border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== "TRAINER") {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-xl font-bold text-red-800">Acceso restringido</h2>
          <p className="mt-2 text-sm text-red-700">
            Esta pantalla es exclusiva para entrenadores. Tu rol actual es{" "}
            <strong className="uppercase">{user?.role ?? "invitado"}</strong>.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 bg-tr-bg text-[13px] text-tr-ink">
      <aside className="hidden w-56 shrink-0 flex-col justify-between bg-tr-sidebar px-4 pb-5 pt-8 text-white md:flex">
        <div>
          <div className="mb-8 pl-2">
            <div className="text-[23px] italic tracking-tighter">II GymHub</div>
            <div className="text-[8px] font-medium tracking-[.08em] text-[#aab5ab]">
              CLUB DE ENTRENAMIENTO
            </div>
          </div>
          <div className="mb-2 pl-3 text-[9px] font-semibold tracking-[.06em] text-[#aab5ab]">
            ENTRENADOR
          </div>
          <nav className="flex flex-col gap-1.5">
            {NAV.map((item) => {
              const base =
                "flex min-h-[43px] items-center gap-2.5 rounded-[7px] px-3 text-[11px]";
              if (!item.href) {
                return (
                  <span
                    key={item.label}
                    aria-disabled="true"
                    title="Próximamente"
                    className={`${base} cursor-not-allowed text-[#aab5ab]/50`}
                  >
                    <span className="w-4 text-center">{item.icon}</span>
                    {item.label}
                  </span>
                );
              }
              const isActive = item.key === active;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`${base} ${
                    isActive ? "bg-tr-accent text-tr-ink" : "text-[#aab5ab] hover:bg-tr-sidebar-2"
                  }`}
                >
                  <span className="w-4 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div>
          <div className="mb-5 rounded-lg bg-tr-sidebar-2 p-3.5 text-[10px] text-[#aab5ab]">
            <b className="mb-1.5 block text-[13px] text-white">Tu siguiente nivel.</b>
            Cada día cuenta. Vamos a por más.
          </div>
          <div className="text-[11px] font-semibold text-white">{user.fullName}</div>
          <div className="mb-3 text-[10px] text-[#aab5ab]">Entrenador</div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-tr-line bg-white px-5 md:px-8">
          <div className="text-xs text-tr-muted">{crumbs}</div>
          <div className="hidden text-[11px] text-tr-muted sm:block">{formatToday()}</div>
        </header>
        <section className="flex flex-col gap-6 p-5 md:p-8">{children}</section>
      </main>
    </div>
  );
}
