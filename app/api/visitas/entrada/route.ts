import { NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await apiFetch('/visitas/entrada', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      // FIX: propagar el mensaje real del backend
      return NextResponse.json(
        { message: error.message, codigo: error.codigo },
        { status: error.status },
      );
    }
    console.error('[api/visitas/entrada] Error inesperado:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error interno.' },
      { status: 500 },
    );
  }
}