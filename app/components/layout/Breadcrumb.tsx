
"use client";

import { usePathname } from "next/navigation";
import type { Role } from "@/lib/current-user";

function crumbsFor(pathname: string, role?: Role): string[] {
  if (pathname === "/mi-comunidad") {
    return ["Mi comunidad", "Inicio"];
  }

  if (pathname.startsWith("/notificaciones")) {
    return ["Mi comunidad", "Notificaciones"];
  }

  if (pathname.startsWith("/cuotas/reglas")) {
    return ["Administración", "Cuotas y reglas"];
  }

  if (pathname.startsWith("/cuotas/generacion")) {
    return ["Administración", "Generación de cuotas"];
  }

  if (pathname.startsWith("/morosidad")) {
    return ["Administración", "Morosidad"];
  }

  if (pathname.startsWith("/areas/disponibilidad")) {
    return ["Mi comunidad", "Áreas comunes", "Disponibilidad"];
  }

  if (pathname === "/areas" || pathname.startsWith("/areas/")) {
    return ["Administración", "Gestión de áreas"];
  }

  if (pathname.startsWith("/paquetes")) {
    if (role === "RESIDENTE") {
      if (pathname === "/paquetes") {
        return ["Mi comunidad", "Paquetes"];
      }

      return ["Mi comunidad", "Paquetes", "Detalle"];
    }

    if (pathname === "/paquetes/nuevo") {
      return ["Caseta de seguridad", "Recepción de paquetes"];
    }

    if (/^\/paquetes\/[^/]+\/entrega$/.test(pathname)) {
      return ["Caseta de seguridad", "Paquetes", "Entrega"];
    }

    return ["Caseta de seguridad", "Paquetes"];
  }
  if (pathname === "/asambleas") {
    return ["Mi comunidad", "Asambleas"];
  }
  if (/^\/asambleas\/[^/]+$/.test(pathname)) {
    return ["Mi comunidad", "Asambleas", "Detalle"];
  }
  if (/^\/admin\/asambleas\/[^/]+\/resultados$/.test(pathname)) {
    return ["Administración", "Asambleas / Resultados"];
  }
  if (pathname === "/admin/asambleas/nueva") {
    return ["Administración", "Convocar asamblea"];
  }

  if (/^\/admin\/asambleas\/[^/]+\/editar$/.test(pathname)) {
    return ["Administración", "Asambleas", "Editar borrador"];
  }

  if (/^\/admin\/asambleas\/[^/]+$/.test(pathname)) {
    return ["Administración", "Asambleas", "Convocatoria"];
  }

  if (pathname === "/admin/asambleas") {
    return ["Administración", "Asambleas"];
  }

  if (pathname.startsWith("/admin/incidencias")) {
    return ["Administración", "Panel de incidencias"];
  }

  if (pathname.startsWith("/seguridad/panel")) {
    return ["Seguridad", "Panel de seguridad"];
  }
  if (pathname.startsWith("/estado-de-cuenta") || pathname.startsWith("/pagos")) {
    return role === "ADMINISTRADOR"
      ? ["Administración financiera", "Estado de cuenta"]
      : ["Mi cuenta", "Cuotas y pagos"];
  }

  if (pathname === "/reservas/nueva") {
    return ["Mi comunidad", "Áreas comunes", "Nueva reserva"];
  }
  if (pathname === "/reservas") {
    return ["Mi comunidad", "Mis reservas"];
  }

  if (pathname === "/visitas/nueva") {
    return ["Mi comunidad", "Mis visitas", "Nueva visita"];
  }
  if (pathname === "/visitas") {
    return ["Mi comunidad", "Mis visitas"];
  }
  if (pathname === "/seguridad/visitas") {
    return ["Seguridad", "Registro de entrada"];
  }

  if (pathname === "/cartelera") {
    return ["Mi comunidad", "Cartelera"];
  }
  if (pathname === "/usuarios") {
    return ["Administración", "Registrar usuario"];
  }
  if (pathname === "/administracion/cartelera/nuevo") {
    return ["Administración", "Publicar comunicado"];
  }
  if (pathname === "/directorio") {
    return ["Mi comunidad", "Directorio"];
  }
  if (pathname === "/perfil/privacidad") {
    return ["Mi comunidad", "Directorio", "Privacidad"];
  }

  if (pathname === "/reportes/incidencias") {
    return ["Administración", "Reporte de incidencias"];
  }
  if (pathname === "/reportes/votaciones") {
    return ["Administración", "Reporte de votaciones"];
  }

  if (pathname === "/incidencias/nuevo") {
    return ["Mi comunidad", "Incidencias", "Nueva"];
  }
  if (/^\/incidencias\/[^/]+$/.test(pathname)) {
    return ["Mi comunidad", "Incidencias", "Detalle"];
  }
  if (pathname === "/incidencias") {
    return ["Mi comunidad", "Incidencias"];
  }

  return ["Mi comunidad"];
}

export default function Breadcrumb({ role }: { role?: Role }) {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname, role);

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
      {crumbs.map((crumb, i) => {
        const ultimo = i === crumbs.length - 1;
        return (
          // En pantallas angostas solo se muestra la sección actual.
          <span key={crumb} className={`min-w-0 items-center gap-2 ${ultimo ? "flex" : "hidden sm:flex"}`}>
            {i > 0 && <span className="hidden text-gray-400 sm:inline">&gt;</span>}
            <span className={ultimo ? "truncate font-medium text-gray-900" : undefined}>{crumb}</span>
          </span>
        );
      })}
    </div>
  );
}
