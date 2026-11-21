'use server';

import { ApiError, apiFetch } from '@/lib/api';
import { expireSession } from '@/lib/session';

export async function publicarComunicadoAction(formData: FormData) {
  try {
    const data = await apiFetch<any>('anuncios', {
      method: 'POST',
      body: formData,
    });
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return {
      success: false,
      error: error?.message || 'Error al publicar el comunicado',
    };
  }
}

export async function obtenerMuroComunicadosAction() {
  try {
    const data = await apiFetch<any>('anuncios/muro');
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return {
      success: false,
      error: error?.message || 'No se pudieron cargar los comunicados.',
      data: [],
    };
  }
}

export async function marcarComunicadoLeidoAction(comunicadoId: number) {
  try {
    const data = await apiFetch<any>(`anuncios/${comunicadoId}/leer`, {
      method: 'POST',
    });
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return {
      success: false,
      error: error?.message || 'No se pudo registrar la lectura.',
    };
  }
}
