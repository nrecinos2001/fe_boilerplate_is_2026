// lib/preferencias.ts
import { MODULOS } from "./notificaciones";

export type PreferenciaModulo = {
  modulo: keyof typeof MODULOS;
  activo: boolean;
};

export type PreferenciasResponse = PreferenciaModulo[];

// Reutilizamos el catálogo de notificaciones para mantener consistencia
export const MODULOS_PREFERENCIAS = Object.entries(MODULOS).map(([key, val]) => ({
  modulo: key as keyof typeof MODULOS,
  etiqueta: val.etiqueta,
  descripcion: getDescripcionModulo(key),
}));

function getDescripcionModulo(modulo: string): string {
  const descripciones: Record<string, string> = {
    pagos: "Avisos sobre cuotas vencidas o próximas a vencer",
    reservas: "Confirmaciones y cancelaciones de áreas comunes",
    incidencias: "Actualizaciones de tus reportes y solicitudes",
    visitas: "Autorizaciones y registros de visitantes",
    paqueteria: "Notificaciones de paquetes recibidos",
    votaciones: "Convocatorias y resultados de asambleas",
    anuncios: "Comunicados generales de la administración",
  };
  return descripciones[modulo] ?? "Avisos generales";
}