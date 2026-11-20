export class LoyaltyApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LoyaltyApiError";
    this.status = status;
  }
}

export async function consultarLealtad<T>(
  ruta: string,
  opciones?: RequestInit,
): Promise<T> {
  const respuesta = await fetch(ruta, {
    ...opciones,
    cache: "no-store",
  });
  const datos: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const cuerpo =
      datos !== null && typeof datos === "object"
        ? (datos as Record<string, unknown>)
        : null;
    const mensaje = typeof cuerpo?.message === "string" ? cuerpo.message : "";
    throw new LoyaltyApiError(respuesta.status, mensaje);
  }

  return datos as T;
}

export type SaldoLealtad = { balance: number };

export type BeneficioLealtad = {
  id: string;
  name: string;
  pointsRequired: number;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number | string;
  active: boolean;
};

export type BeneficiosLealtad = { items: BeneficioLealtad[] };

export type PedidoTakeawayCliente = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  createdAt: string;
};

export type CompraParaCanje =
  | { accountId: string; orderId?: never }
  | { orderId: string; accountId?: never };

export type SolicitudCanje = { benefitId: string } & CompraParaCanje;

export type ResultadoCanje = {
  id: string;
  pointsRedeemed: number;
  balance: number;
  discountApplied: number;
  status: "RESERVADO";
};

export function obtenerSaldoLealtad() {
  return consultarLealtad<SaldoLealtad>("/api/cliente/loyalty/balance");
}

export function obtenerBeneficiosLealtad() {
  return consultarLealtad<BeneficiosLealtad>("/api/cliente/loyalty/benefits");
}

export function obtenerPedidosTakeawayCliente() {
  return consultarLealtad<PedidoTakeawayCliente[]>("/api/cliente/takeaway");
}

export function solicitarCanjeLealtad(solicitud: SolicitudCanje) {
  return consultarLealtad<ResultadoCanje>("/api/cliente/loyalty/redemptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(solicitud),
  });
}
