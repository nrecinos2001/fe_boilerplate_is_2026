import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import * as apiClient from "@/src/services/http/api-client";
import type { Charge, CreatePaymentInput, PaymentReceipt } from "@/src/types/payments";
import {
  CHARGE_ALREADY_PAID_MESSAGE,
  CHARGE_NOT_FOUND_MESSAGE,
  declinedMessage,
  downloadReceiptPdf,
  fetchPendingCharges,
  filenameFromDisposition,
  LOAD_CHARGES_ERROR,
  PAYMENT_ERROR,
  RECEIPT_DOWNLOAD_ERROR,
  registerPayment,
  SEARCH_MEMBERS_ERROR,
  searchMembers,
} from "./payments-service";

const MEMBER_ID = "7b0c2c1e-7d1f-4a43-9a52-0f8f3f7f3a10";

const charge: Charge = {
  chargeId: 3,
  type: "MEMBERSHIP",
  concept: "Membresía Mensual",
  amount: 25,
  dueDate: "2026-11-30",
  status: "PENDING",
};

const receipt: PaymentReceipt = {
  paymentId: 10,
  chargeId: 3,
  concept: "Membresía Mensual",
  amount: 25,
  receiptNumber: "C-000002",
  receiptId: 2,
  paymentMethod: "CARD",
  cardLast4: "4242",
  issuedAt: "2026-11-19T21:42:00.000Z",
};

const cardPayment: CreatePaymentInput = {
  chargeId: 3,
  paymentMethod: "CARD",
  card: { cardNumber: "4242424242424242", holderName: "Ana López", expiry: "12/30", cvv: "123" },
  idempotencyKey: "0d6f3c1e-7d1f-4a43-9a52-0f8f3f7f3a10",
};

function mockResponse(res: Response | Error) {
  const spy = vi.spyOn(apiClient, "apiFetch");
  if (res instanceof Error) spy.mockRejectedValue(res);
  else spy.mockResolvedValue(res);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

describe("searchMembers (GET /charges/member-search)", () => {
  it("codifica el texto y devuelve las opciones", async () => {
    const options = [{ memberId: MEMBER_ID, email: "ana@correo.com" }];
    const spy = mockResponse(Response.json({ data: options }));

    expect(await searchMembers(" ana lópez ")).toEqual({ ok: true, data: options, status: 200 });
    expect(spy.mock.calls[0][0]).toBe("charges/member-search?q=ana%20l%C3%B3pez");
  });

  it("con 403 devuelve el mensaje de acceso denegado", async () => {
    mockResponse(Response.json({ message: "Forbidden" }, { status: 403 }));
    expect(await searchMembers("ana")).toEqual({
      ok: false,
      error: ACCESS_DENIED_MESSAGE,
      status: 403,
    });
  });

  it("sin conexión devuelve el mensaje genérico", async () => {
    mockResponse(new TypeError("Failed to fetch"));
    expect(await searchMembers("ana")).toEqual({
      ok: false,
      error: SEARCH_MEMBERS_ERROR,
      status: 0,
    });
  });
});

describe("fetchPendingCharges (GET /members/{id}/charges)", () => {
  it("pide solo los cobros pendientes del miembro", async () => {
    const spy = mockResponse(Response.json({ data: [charge] }));

    expect(await fetchPendingCharges(MEMBER_ID)).toEqual({ ok: true, data: [charge], status: 200 });
    expect(spy.mock.calls[0][0]).toBe(`members/${MEMBER_ID}/charges?status=PENDING`);
  });

  it("con 404 devuelve el motivo del servidor", async () => {
    mockResponse(Response.json({ message: "El miembro no existe." }, { status: 404 }));
    expect(await fetchPendingCharges(MEMBER_ID)).toEqual({
      ok: false,
      error: "El miembro no existe.",
      status: 404,
    });
  });

  it("con 500 devuelve el mensaje genérico", async () => {
    mockResponse(new Response(null, { status: 500 }));
    expect(await fetchPendingCharges(MEMBER_ID)).toMatchObject({
      error: LOAD_CHARGES_ERROR,
      status: 500,
    });
  });
});

describe("registerPayment (POST /payments)", () => {
  it("con 201 devuelve el comprobante y envía el cuerpo sin monto", async () => {
    const spy = mockResponse(Response.json(receipt, { status: 201 }));

    expect(await registerPayment(cardPayment)).toEqual({ ok: true, data: receipt, status: 201 });
    const [path, init] = spy.mock.calls[0];
    expect(path).toBe("payments");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual(cardPayment);
    expect(body).not.toHaveProperty("amount");
  });

  it("con tarjeta rechazada devuelve 'Pago rechazado' con el motivo", async () => {
    mockResponse(
      Response.json(
        { statusCode: 400, message: "Fondos insuficientes", declineReason: "Fondos insuficientes" },
        { status: 400 },
      ),
    );
    expect(await registerPayment(cardPayment)).toEqual({
      ok: false,
      error: "Pago rechazado: Fondos insuficientes.",
      status: 400,
    });
  });

  it("con un 400 de validación devuelve el motivo tal cual", async () => {
    mockResponse(
      Response.json({ message: ["El CVV debe tener 3 dígitos."] }, { status: 400 }),
    );
    expect(await registerPayment(cardPayment)).toEqual({
      ok: false,
      error: "El CVV debe tener 3 dígitos.",
      status: 400,
    });
  });

  it.each([
    [409, CHARGE_ALREADY_PAID_MESSAGE],
    [404, CHARGE_NOT_FOUND_MESSAGE],
    [403, ACCESS_DENIED_MESSAGE],
    [500, PAYMENT_ERROR],
  ])("con %i devuelve '%s'", async (status, error) => {
    mockResponse(Response.json({ message: "x" }, { status }));
    expect(await registerPayment(cardPayment)).toEqual({ ok: false, error, status });
  });

  it("sin respuesta devuelve el mensaje genérico, sin lanzar", async () => {
    mockResponse(new TypeError("Failed to fetch"));
    expect(await registerPayment(cardPayment)).toEqual({
      ok: false,
      error: PAYMENT_ERROR,
      status: 0,
    });
  });

  it("declinedMessage no duplica el punto final", () => {
    expect(declinedMessage("Tarjeta vencida.")).toBe("Pago rechazado: Tarjeta vencida.");
  });
});

describe("downloadReceiptPdf (GET /receipts/{id}/pdf)", () => {
  it("devuelve el PDF con el nombre que manda el servidor", async () => {
    const spy = mockResponse(
      new Response(new Blob(["%PDF-1.7"], { type: "application/pdf" }), {
        headers: { "Content-Disposition": 'attachment; filename="comprobante-C-000002.pdf"' },
      }),
    );

    const result = await downloadReceiptPdf(2, "C-000002");

    expect(spy.mock.calls[0][0]).toBe("receipts/2/pdf");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filename).toBe("comprobante-C-000002.pdf");
      expect(await result.data.blob.text()).toBe("%PDF-1.7");
    }
  });

  it("sin Content-Disposition arma el nombre con el número", async () => {
    mockResponse(new Response(new Blob(["%PDF"])));
    const result = await downloadReceiptPdf(2, "C-000002");
    expect(result.ok && result.data.filename).toBe("comprobante-C-000002.pdf");
  });

  it("con 404 devuelve el mensaje de error de descarga", async () => {
    mockResponse(Response.json({ message: "No existe" }, { status: 404 }));
    expect(await downloadReceiptPdf(2, "C-000002")).toEqual({
      ok: false,
      error: RECEIPT_DOWNLOAD_ERROR,
      status: 404,
    });
  });

  it("filenameFromDisposition acepta el nombre con o sin comillas", () => {
    expect(filenameFromDisposition('attachment; filename="a.pdf"')).toBe("a.pdf");
    expect(filenameFromDisposition("attachment; filename=b.pdf")).toBe("b.pdf");
    expect(filenameFromDisposition(null)).toBeNull();
  });
});
