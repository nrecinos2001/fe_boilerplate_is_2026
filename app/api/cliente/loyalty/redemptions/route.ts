import { NextResponse } from "next/server";
import { proxyLoyaltyRequest } from "@/lib/server/loyalty-proxy";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const token = await getSession();
  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "La solicitud de canje no es válida." },
      { status: 400 },
    );
  }

  const solicitud = body as Record<string, unknown>;
  const incluyeCuenta = Object.prototype.hasOwnProperty.call(
    solicitud,
    "accountId",
  );
  const incluyePedido = Object.prototype.hasOwnProperty.call(
    solicitud,
    "orderId",
  );
  const tieneCuenta =
    typeof solicitud.accountId === "string" && solicitud.accountId.length > 0;
  const tienePedido =
    typeof solicitud.orderId === "string" && solicitud.orderId.length > 0;

  if (
    typeof solicitud.benefitId !== "string" ||
    !solicitud.benefitId ||
    incluyeCuenta === incluyePedido ||
    (incluyeCuenta && !tieneCuenta) ||
    (incluyePedido && !tienePedido)
  ) {
    return NextResponse.json(
      {
        message:
          "Debes indicar un beneficio y exactamente una compra (accountId u orderId).",
      },
      { status: 400 },
    );
  }

  return proxyLoyaltyRequest(
    "redemptions",
    "POST",
    JSON.stringify({
      benefitId: solicitud.benefitId,
      ...(tieneCuenta ? { accountId: solicitud.accountId } : {}),
      ...(tienePedido ? { orderId: solicitud.orderId } : {}),
    }),
  );
}
