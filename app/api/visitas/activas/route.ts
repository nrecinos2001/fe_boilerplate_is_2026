import { NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';

export async function GET() {
  try {
    const data = await apiFetch('/visitas/activas');
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Error interno.' }, { status: 500 });
  }
}