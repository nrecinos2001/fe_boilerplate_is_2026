import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query') ?? '';
    if (!query) {
      return NextResponse.json({ message: 'Falta el parámetro query' }, { status: 400 });
    }
    const data = await apiFetch(`/visitas/buscar?query=${encodeURIComponent(query)}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Error interno.' }, { status: 500 });
  }
}