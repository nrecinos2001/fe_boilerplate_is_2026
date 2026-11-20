import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleNavigationLinks } from "@/src/components/dashboard/role-navigation";
import type { Charge, ReceiptPage, ReceiptSummary } from "@/src/types/payments";
import { CardPaymentFormView, type CardPaymentFormViewProps } from "./card-payment-form-view";
import { EMPTY_CARD } from "./card-logic";
import { MyChargesList } from "./my-charges-list";
import {
  buildCardPaymentInput,
  dueDateText,
  isOverdue,
  membershipStatusMessage,
  NO_PENDING_CHARGES_MINE_MESSAGE,
  NO_RECEIPTS_MESSAGE,
  payButtonLabel,
  PROCESSING_MESSAGE,
  receiptViewFromSummary,
  totalPages,
  totalPending,
} from "./my-payments-logic";
import { MyReceiptsList, type MyReceiptsListProps } from "./my-receipts-list";

const noop = () => {};
const KEY = "0d6f3c1e-7d1f-4a43-9a52-0f8f3f7f3a10";
// 20/11/2026 a las 10:00 en El Salvador.
const NOW = new Date("2026-11-20T16:00:00.000Z");

const membership: Charge = {
  chargeId: 3,
  type: "MEMBERSHIP",
  concept: "Membresía Mensual",
  amount: 25,
  dueDate: "2026-11-22",
  status: "PENDING",
};
const lateSession: Charge = {
  chargeId: 4,
  type: "PERSONAL_SESSION",
  concept: "Sesión personal",
  amount: 15.1,
  dueDate: "2026-11-14",
  status: "PENDING",
};

const summary: ReceiptSummary = {
  receiptId: 5,
  number: "C-000005",
  issuedAt: "2026-11-19T23:12:12.000Z",
  concept: "Membresía Mensual (prueba)",
  amount: 25,
  method: "CARD",
  cardLast4: "4242",
};
const cashSummary: ReceiptSummary = {
  ...summary,
  receiptId: 4,
  number: "C-000004",
  method: "CASH",
  cardLast4: null,
};
const page: ReceiptPage = { data: [summary, cashSummary], total: 2, page: 1, pageSize: 20 };

describe("reglas de Mis pagos (FE-16.1)", () => {
  it("un cobro está vencido solo si su fecha ya pasó en el gimnasio", () => {
    expect(isOverdue("2026-11-19", NOW)).toBe(true);
    expect(isOverdue("2026-11-20", NOW)).toBe(false);
    expect(isOverdue("2026-11-22", NOW)).toBe(false);
  });

  it("dice 'Vence' o 'Venció' con la fecha sin correr el día", () => {
    expect(dueDateText(membership, NOW)).toBe("Vence 22/11/2026");
    expect(dueDateText(lateSession, NOW)).toBe("Venció 14/11/2026");
  });

  it("suma lo pendiente sin errores de decimales", () => {
    expect(totalPending([membership, lateSession])).toBe(40.1);
    expect(totalPending([])).toBe(0);
  });

  it("el botón dice el monto que se va a pagar", () => {
    expect(payButtonLabel(25)).toBe("Pagar $25.00");
  });

  it("convierte un comprobante de la lista al formato de la tarjeta y la descarga", () => {
    expect(receiptViewFromSummary(summary)).toEqual({
      receiptId: 5,
      receiptNumber: "C-000005",
      issuedAt: summary.issuedAt,
      concept: summary.concept,
      amount: 25,
      paymentMethod: "CARD",
      cardLast4: "4242",
    });
  });

  it("calcula las páginas de comprobantes (al menos 1)", () => {
    expect(totalPages({ total: 0, pageSize: 20 })).toBe(1);
    expect(totalPages({ total: 20, pageSize: 20 })).toBe(1);
    expect(totalPages({ total: 21, pageSize: 20 })).toBe(2);
  });
});

describe("reglas del pago en línea (FE-16.2)", () => {
  it("arma el cuerpo con la tarjeta limpia y la clave, sin monto ni id de miembro", () => {
    const body = buildCardPaymentInput(
      { cardNumber: "4242 4242 4242 4242", holderName: " Juan Perez ", expiry: "12/30", cvv: "123" },
      KEY,
    );
    expect(body).toEqual({
      card: { cardNumber: "4242424242424242", holderName: "Juan Perez", expiry: "12/30", cvv: "123" },
      idempotencyKey: KEY,
    });
  });

  it("avisa el estado de la membresía solo cuando el cobro era de membresía", () => {
    expect(membershipStatusMessage({ membershipStatus: "ACTIVE" })).toBe("Tu membresía está activa.");
    expect(membershipStatusMessage({ membershipStatus: "PENDING_PAYMENT" })).toBe(
      "Tu membresía sigue pendiente de pago.",
    );
    expect(membershipStatusMessage({ membershipStatus: null })).toBeNull();
    expect(membershipStatusMessage({ membershipStatus: "NONE" })).toBeNull();
  });
});

describe("MyChargesList", () => {
  it("muestra cada cobro con su tipo, monto, fecha, total y botón de pago", () => {
    const html = renderToStaticMarkup(
      <MyChargesList charges={[lateSession, membership]} error={null} onPay={noop} now={NOW} />,
    );
    expect(html).toContain("Membresía Mensual");
    expect(html).toContain("Sesión personal");
    expect(html).toContain("Vence 22/11/2026");
    expect(html).toContain("Venció 14/11/2026");
    expect(html).toContain("Pagar $25.00");
    expect(html).toContain("Pagar $15.10");
    expect(html).toContain("$40.10");
  });

  it("sin cobros pendientes lo dice", () => {
    const html = renderToStaticMarkup(<MyChargesList charges={[]} error={null} onPay={noop} />);
    expect(html).toContain(NO_PENDING_CHARGES_MINE_MESSAGE);
    expect(html).not.toContain("Pagar $");
  });

  it("mientras carga no muestra la lista; con error muestra el aviso", () => {
    expect(renderToStaticMarkup(<MyChargesList charges={null} error={null} onPay={noop} />)).toContain(
      "Cargando tus cobros",
    );
    const html = renderToStaticMarkup(<MyChargesList charges={[]} error="Falló" onPay={noop} />);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain(NO_PENDING_CHARGES_MINE_MESSAGE);
  });
});

function renderForm(overrides: Partial<CardPaymentFormViewProps> = {}) {
  return renderToStaticMarkup(
    <CardPaymentFormView
      charge={membership}
      card={EMPTY_CARD}
      cardErrors={{}}
      processing={false}
      error={null}
      onCardChange={noop}
      onSubmit={noop}
      onCancel={noop}
      now={NOW}
      {...overrides}
    />,
  );
}

describe("CardPaymentFormView", () => {
  it("muestra el cobro, los datos de tarjeta y el botón con el monto", () => {
    const html = renderForm();
    expect(html).toContain("Membresía Mensual");
    expect(html).toContain("$25.00");
    expect(html).toContain("Número de tarjeta");
    expect(html).toContain("CVV");
    expect(html).toContain("Pagar $25.00");
    expect(html).toContain("Cancelar");
  });

  it("mientras procesa bloquea los campos y los botones y avisa que espere", () => {
    const html = renderForm({ processing: true });
    expect(html).toContain("Procesando pago…");
    expect(html).toContain(PROCESSING_MESSAGE);
    expect(html).toMatch(/<fieldset[^>]*disabled/);
    expect(html).toMatch(/<button type="submit" disabled/);
    expect(html).toContain('aria-busy="true"');
  });

  it("muestra el rechazo de la pasarela", () => {
    const html = renderForm({ error: "Pago rechazado: Fondos insuficientes." });
    expect(html).toContain("Pago rechazado: Fondos insuficientes.");
    expect(html).toContain('role="alert"');
  });

  it("el CVV no se ve y el navegador no autocompleta la tarjeta", () => {
    const html = renderForm();
    expect(html).toMatch(/id="my-card-cvv"[^>]*type="password"|type="password"[^>]*id="my-card-cvv"/);
    expect(html).not.toContain('autoComplete="cc-number"');
    expect(html).toContain('autoComplete="off"');
  });
});

function renderReceipts(overrides: Partial<MyReceiptsListProps> = {}) {
  return renderToStaticMarkup(
    <MyReceiptsList
      page={page}
      error={null}
      downloadingId={null}
      downloadError={null}
      onDownload={noop}
      onPageChange={noop}
      {...overrides}
    />,
  );
}

describe("MyReceiptsList", () => {
  it("lista los comprobantes con número, concepto, monto y método", () => {
    const html = renderReceipts();
    expect(html).toContain("C-000005");
    expect(html).toContain("C-000004");
    expect(html).toContain("Membresía Mensual (prueba) · $25.00");
    expect(html).toContain("Tarjeta terminada en 4242");
    expect(html).toContain("Efectivo");
    expect(html.match(/Descargar PDF/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("solo el comprobante que se baja dice 'Descargando…' y los demás esperan", () => {
    const html = renderReceipts({ downloadingId: 5 });
    expect(html.match(/Descargando…/g)).toHaveLength(1);
    expect(html.match(/<button[^>]*disabled/g)).toHaveLength(2);
  });

  it("sin comprobantes lo dice y no muestra paginación", () => {
    const html = renderReceipts({ page: { data: [], total: 0, page: 1, pageSize: 20 } });
    expect(html).toContain(NO_RECEIPTS_MESSAGE);
    expect(html).not.toContain("Siguiente");
  });

  it("con más de 20 comprobantes muestra la paginación", () => {
    const html = renderReceipts({ page: { ...page, total: 45, page: 2 } });
    expect(html).toContain("Página 2 de 3");
    expect(html).toContain("Anterior");
    expect(html).toContain("Siguiente");
  });

  it("muestra el error de descarga", () => {
    const html = renderReceipts({ downloadError: "No pudimos descargar el comprobante. Intenta de nuevo." });
    expect(html).toContain("No pudimos descargar el comprobante");
  });
});

describe("acceso desde el tablero", () => {
  it("el miembro ve 'Mis pagos' y recepción no", () => {
    const member = renderToStaticMarkup(<RoleNavigationLinks status="authenticated" role="MEMBER" />);
    expect(member).toContain('href="/miembro/pagos"');
    const admin = renderToStaticMarkup(<RoleNavigationLinks status="authenticated" role="ADMIN" />);
    expect(admin).not.toContain("/miembro/pagos");
  });
});
