import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.toString();
    const path = search ? `/incidencias/admin/list?${search}` : '/incidencias/admin/list';
    const data = await apiFetch(path);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Error interno.' }, { status: 500 });
  }
}