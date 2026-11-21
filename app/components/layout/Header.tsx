import { Suspense } from "react";
import { etiquetaRol, getCurrentUser } from "@/lib/current-user";
import { BellLink, NotificationBell } from "@/components/residente/notification-bell";
import Breadcrumb from "@/app/components/layout/Breadcrumb";
import MenuMovil from "@/app/components/layout/MenuMovil";

function getInitials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function getDisplayName(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function Header() {
  const user = await getCurrentUser();
  const initials = user ? getInitials(user.email) : '??';
  const displayName = user ? getDisplayName(user.email) : 'Invitado';
  const roleLabel = etiquetaRol(user?.role);
  const unitLabel = user?.unit ? `${user.unit.tower} · ${user.unit.code}` : null;

  return (
    <header className="h-16 border-b border-gray-200 bg-[#fbf8f1] flex items-center justify-between gap-3 px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <MenuMovil role={user?.role} />
        <Breadcrumb role={user?.role} />
      </div>

      <div className="flex shrink-0 items-center gap-4 md:gap-6">
        {/* El backend solo da notificaciones a residentes. */}
        {user?.role === "RESIDENTE" && (
          <Suspense fallback={<BellLink count={0} />}>
            <NotificationBell />
          </Suspense>
        )}
        <div className="flex items-center gap-3 border-l border-gray-300 pl-4 md:pl-6">
          <div className="w-8 h-8 bg-[#0a2f1f] text-white rounded-full flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-semibold text-gray-900 leading-none truncate max-w-[160px]">
              {displayName}
            </p>
            <p className="text-gray-500 text-xs">
              {roleLabel}
              {unitLabel && <span className="text-gray-400"> · {unitLabel}</span>}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}