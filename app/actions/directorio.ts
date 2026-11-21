'use server';

import { ApiError, apiFetch } from '@/lib/api';
import { expireSession } from '@/lib/session';

export interface PreferenciasPrivacidadPayload {
  visibleGlobal: boolean;
  mostrarTelefono: boolean;
  mostrarCorreo: boolean;
  mostrarNombre: boolean;
  mostrarUnidad: boolean;
}

export async function obtenerPreferenciasDirectorioAction() {
  try {
    const data = await apiFetch<any>('directorio/preferencias');
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return { success: false, error: error?.message || 'No se pudo cargar tu configuración.' };
  }
}

export async function actualizarPreferenciasDirectorioAction(
  payload: PreferenciasPrivacidadPayload,
) {
  try {
    const data = await apiFetch<any>('directorio/preferencias', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return { success: false, error: error?.message || 'Error de conexión al guardar preferencias.' };
  }
}

export async function buscarDirectorioAction(params: {
  q?: string;
  filtro?: 'TODOS' | 'CON_CONTACTO' | 'MI_PERFIL';
  pagina?: number;
  tamano?: number;
}) {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.filtro && params.filtro !== 'TODOS') query.set('filtro', params.filtro);
  if (params.pagina) query.set('pagina', String(params.pagina));
  if (params.tamano) query.set('tamano', String(params.tamano));

  try {
    const qs = query.toString();
    const data = await apiFetch<any>(qs ? `directorio?${qs}` : 'directorio');
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return {
      success: false,
      error: error?.message || 'No se pudo cargar el directorio de vecinos.',
    };
  }
}
