// lib/notificaciones.ts

export type Notificacion = {
  id: number;
  titulo: string | null;
  mensaje: string;
  moduloOrigen: string;
  fechaCreacion: string;
  leida: boolean;
  enlaceAccion: string | null;
};

export type PaginaNotificaciones = {
  total: number;
  page: number;
  size: number;
  items: Notificacion[];
};

// ✅ TIPOS EXACTOS (con guion bajo en sin_leer)
export type Filtro = "todas" | "sin_leer" | "leidas";
export type ModuloFiltro = "todos" | "pagos" | "reservas" | "incidencias" | "visitas" | "paqueteria" | "votaciones" | "anuncios";

export const TAMANO_PAGINA = 20;

export function parseFiltro(valor: string | undefined): Filtro {
  if (valor === "sin_leer" || valor === "sin-leer") return "sin_leer";
  if (valor === "leidas") return "leidas";
  return "todas";
}

// ✅ FUNCIÓN EXPORTADA CORRECTAMENTE
export function parseModulo(valor: string | undefined): ModuloFiltro {
  const validos: ModuloFiltro[] = ["todos", "pagos", "reservas", "incidencias", "visitas", "paqueteria", "votaciones", "anuncios"];
  return validos.includes(valor as ModuloFiltro) ? (valor as ModuloFiltro) : "todos";
}

export const MODULOS: Record<string, { etiqueta: string; accion: string }> = {
  pagos: { etiqueta: "Cuotas", accion: "Ver estado de cuenta" },
  reservas: { etiqueta: "Reservas", accion: "Ver mis reservas" },
  incidencias: { etiqueta: "Incidencias", accion: "Ver mis reportes" },
  visitas: { etiqueta: "Visitas", accion: "Ver autorización" },
  paqueteria: { etiqueta: "Paquetería", accion: "Ver paquete" },
  votaciones: { etiqueta: "Votaciones", accion: "Ver asamblea" },
  anuncios: { etiqueta: "Comunicados", accion: "Leer comunicado" },
};

export function etiquetaModulo(modulo: string) {
  return MODULOS[modulo]?.etiqueta ?? modulo;
}

export function etiquetaAccion(modulo: string) {
  return MODULOS[modulo]?.accion ?? "Ver detalle";
}

export function rutaSegura(enlace: string | null): string | null {
  if (!enlace) return null;
  return enlace.startsWith("/") && !enlace.startsWith("//") ? enlace : null;
}

const TZ = "America/El_Salvador";

export function formatearFecha(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const fecha = new Intl.DateTimeFormat("es-SV", {
    day: "2-digit", month: "short", year: "numeric", timeZone: TZ,
  }).format(d).replace(/\./g, "").replace(/ de /g, " ");
  const hora = new Intl.DateTimeFormat("es-SV", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ,
  }).format(d);
  return `${fecha} · ${hora} h`;
}