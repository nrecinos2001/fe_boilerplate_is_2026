import { NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';

export async function GET() {
  try {
    const data = await apiFetch('/preautorizaciones');
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, codigo: error.codigo },
        { status: error.status },
      );
    }
    return NextResponse.json({ message: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await apiFetch('/preautorizaciones', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, codigo: error.codigo },
        { status: error.status },
      );
    }
    return NextResponse.json({ message: 'Error interno.' }, { status: 500 });
  }
}