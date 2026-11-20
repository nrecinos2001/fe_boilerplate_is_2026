import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import * as apiClient from "@/src/services/http/api-client";
import type { CardPaymentInput, CardPaymentResult, Charge, ReceiptPage } from "@/src/types/payments";
import {
  fetchMyCharges,
  fetchMyReceipts,
  LOAD_MY_CHARGES_ERROR,
  LOAD_MY_RECEIPTS_ERROR,
  payMyChargeWithCard,
} from "./member-payments-service";
import {
  CHARGE_ALREADY_PAID_MESSAGE,
  CHARGE_NOT_FOUND_MESSAGE,
  PAYMENT_ERROR,
} from "./payments-service";

const charge: Charge = {
  chargeId: 3,
  type: "MEMBERSHIP",
  concept: "Membresía Mensual",
  amount: 25,
  dueDate: "2026-11-30",
  status: "PENDING",
};

const receiptPage: ReceiptPage = {
  data: [
    {
      receiptId: 2,
      number: "C-000002",
      issuedAt: "2026-11-19T21:42:00.000Z",
      concept: "Membresía Mensual",
      amount: 25,
      method: "CARD",
      cardLast4: "4242",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

const paid: CardPaymentResult = {
  chargeId: 3,
  status: "PAID",
  receiptId: 2,
  receiptNumber: "C-000002",
  membershipStatus: "ACTIVE",
  concept: "Membresía Mensual",
  amount: 25,
  paymentMethod: "CARD",
  cardLast4: "4242",
  issuedAt: "2026-11-19T21:42:00.000Z",
};

const input: CardPaymentInput = {
  card: { cardNumber: "4242424242424242", holderName: "Juan Perez", expiry: "12/30", cvv: "123" },
  idempotencyKey: "0d6f3c1e-7d1f-4a43-9a52-0f8f3f7f3a10",
};

function mockResponse(res: Response | Error) {
  const spy = vi.spyOn(apiClient, "apiFetch");
  if (res instanceof Error) spy.mockRejectedValue(res);
  else spy.mockResolvedValue(res);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

describe("fetchMyCharges (GET /charges/me)", () => {
  it("pide los cobros del token filtrados por estado, sin id de miembro", async () => {
    const spy = mockResponse(Response.json({ data: [charge] }));
    const result = await fetchMyCharges("PENDING");
    expect(spy.mock.calls[0][0]).toBe("charges/me?status=PENDING");
    expect(result).toEqual({ ok: true, data: [charge], status: 200 });
  });

  it("sin estado pide todos los cobros", async () => {
    const spy = mockResponse(Response.json({ data: [] }));
    await fetchMyCharges();
    expect(spy.mock.calls[0][0]).toBe("charges/me");
  });

  it("con 403 devuelve el mensaje de acceso denegado", async () => {
    mockResponse(Response.json({ message: "Forbidden" }, { status: 403 }));
    expect(await fetchMyCharges("PENDING")).toEqual({
      ok: false,
      error: ACCESS_DENIED_MESSAGE,
      status: 403,
    });
  });

  it("con 500 o sin conexión devuelve el mensaje genérico", async () => {
    mockResponse(new Response(null, { status: 500 }));
    expect(await fetchMyCharges("PENDING")).toMatchObject({ error: LOAD_MY_CHARGES_ERROR });
    vi.restoreAllMocks();
    mockResponse(new TypeError("Failed to fetch"));
    expect(await fetchMyCharges("PENDING")).toEqual({
      ok: false,
      error: LOAD_MY_CHARGES_ERROR,
      status: 0,
    });
  });
});

describe("fetchMyReceipts (GET /receipts/me)", () => {
  it("pide la página indicada y devuelve la página completa", async () => {
    const spy = mockResponse(Response.json(receiptPage));
    const result = await fetchMyReceipts(2);
    expect(spy.mock.calls[0][0]).toBe("receipts/me?page=2");
    expect(result).toEqual({ ok: true, data: receiptPage, status: 200 });
  });

  it("con 400 devuelve el motivo del servidor", async () => {
    mockResponse(Response.json({ message: ["page must not be less than 1"] }, { status: 400 }));
    expect(await fetchMyReceipts(0)).toMatchObject({ ok: false, status: 400, error: "page must not be less than 1" });
  });

  it("sin conexión devuelve el mensaje genérico", async () => {
    mockResponse(new TypeError("Failed to fetch"));
    expect(await fetchMyReceipts()).toMatchObject({ ok: false, error: LOAD_MY_RECEIPTS_ERROR });
  });
});

describe("payMyChargeWithCard (POST /charges/{id}/card-payment)", () => {
  it("con 201 devuelve el comprobante y envía tarjeta y clave, sin monto", async () => {
    const spy = mockResponse(Response.json(paid, { status: 201 }));
    const result = await payMyChargeWithCard(3, input);

    expect(result).toEqual({ ok: true, data: paid, status: 201 });
    const [path, init] = spy.mock.calls[0];
    expect(path).toBe("charges/3/card-payment");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual(input);
    expect(body).not.toHaveProperty("amount");
  });

  it("con tarjeta rechazada devuelve 'Pago rechazado' con el motivo", async () => {
    mockResponse(
      Response.json(
        { statusCode: 400, message: "Fondos insuficientes", declineReason: "Fondos insuficientes" },
        { status: 400 },
      ),
    );
    expect(await payMyChargeWithCard(3, input)).toEqual({
      ok: false,
      error: "Pago rechazado: Fondos insuficientes.",
      status: 400,
    });
  });

  it("con 404 (cobro ajeno o inexistente) y 409 (ya pagado) devuelve el mensaje de la historia", async () => {
    mockResponse(Response.json({ message: "No encontramos ese cobro." }, { status: 404 }));
    expect(await payMyChargeWithCard(99, input)).toMatchObject({ error: CHARGE_NOT_FOUND_MESSAGE, status: 404 });
    vi.restoreAllMocks();
    mockResponse(Response.json({ message: "Este cobro ya está pagado." }, { status: 409 }));
    expect(await payMyChargeWithCard(3, input)).toMatchObject({ error: CHARGE_ALREADY_PAID_MESSAGE, status: 409 });
  });

  it("sin respuesta devuelve el mensaje genérico, sin lanzar", async () => {
    mockResponse(new TypeError("Failed to fetch"));
    expect(await payMyChargeWithCard(3, input)).toEqual({ ok: false, error: PAYMENT_ERROR, status: 0 });
  });
});
