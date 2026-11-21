'use server';

import { ApiError, apiFetch } from '@/lib/api';
import { expireSession } from '@/lib/session';

export async function obtenerReporteIncidenciasAction(params: {
  desde?: string;
  hasta?: string;
  seccion?: string;
}) {
  const query = new URLSearchParams();
  if (params.desde) query.set('desde', params.desde);
  if (params.hasta) query.set('hasta', params.hasta);
  if (params.seccion && params.seccion !== 'TODAS') query.set('seccion', params.seccion);

  try {
    const qs = query.toString();
    const data = await apiFetch<any>(qs ? `reportes/incidencias?${qs}` : 'reportes/incidencias');
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return {
      success: false,
      error: error?.message || 'No se pudo cargar el reporte de incidencias abiertas.',
    };
  }
}

export async function obtenerReporteVotacionesAction(params: {
  desde?: string;
  hasta?: string;
  seccion?: string;
}) {
  const query = new URLSearchParams();
  if (params.desde) query.set('desde', params.desde);
  if (params.hasta) query.set('hasta', params.hasta);
  if (params.seccion && params.seccion !== 'TODAS') query.set('seccion', params.seccion);

  try {
    const qs = query.toString();
    const data = await apiFetch<any>(qs ? `reportes/votaciones?${qs}` : 'reportes/votaciones');
    return { success: true, data };
  } catch (error: any) {
    // Sesión vencida: borra la cookie y vuelve al login en vez de mostrar el error.
    if (error instanceof ApiError && error.status === 401) await expireSession();
    return {
      success: false,
      error: error?.message || 'No se pudo cargar el reporte de participación.',
    };
  }
}