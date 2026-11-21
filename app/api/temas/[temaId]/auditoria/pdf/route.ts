import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ temaId: string }> },
) {
  const { temaId } = await params;
  const apiUrl = process.env.API_URL;
  const token = await getSession();
  if (!apiUrl || !token) {
    return NextResponse.json({ message: "No hay sesión iniciada." }, { status: 401 });
  }

  const url = new URL(
    `temas/${encodeURIComponent(temaId)}/auditoria/pdf`,
    apiUrl.replace(/\/?$/, "/"),
  );
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.message === "string" ? body.message : `La API respondió ${res.status}.`;
    return NextResponse.json({ message }, { status: res.status });
  }

  return new Response(await res.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? 'attachment; filename="auditoria.pdf"',
    },
  });
}
