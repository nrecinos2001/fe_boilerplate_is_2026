import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { newIdempotencyKey } from "@/src/lib/idempotency-key";
import type { Charge, MemberOption, PaymentReceipt } from "@/src/types/payments";
import { CardFields } from "./card-fields";
import {
  CARD_NUMBER_MESSAGE,
  CVV_MESSAGE,
  EMPTY_CARD,
  EXPIRY_MESSAGE,
  formatCardNumberInput,
  formatCvvInput,
  formatExpiryInput,
  HOLDER_NAME_MESSAGE,
  toCardInput,
  validateCard,
  type CardValues,
} from "./card-logic";
import { issuedAtText, paymentMethodText, ReceiptCard } from "./receipt-card";
import {
  buildPaymentInput,
  chargeOptionLabel,
  formatDueDate,
  initialChargeId,
  NO_MEMBERS_FOUND_MESSAGE,
  NO_PENDING_CHARGES_MESSAGE,
  shouldSearch,
  showNoMembersFound,
  visibleMemberOptions,
} from "./register-payment-logic";
import {
  RegisterPaymentFormView,
  type RegisterPaymentFormViewProps,
} from "./register-payment-form-view";

const noop = () => {};
const KEY = "0d6f3c1e-7d1f-4a43-9a52-0f8f3f7f3a10";

const ana: MemberOption = { memberId: "7b0c2c1e-7d1f-4a43-9a52-0f8f3f7f3a10", email: "ana@correo.com" };

const membership: Charge = {
  chargeId: 3,
  type: "MEMBERSHIP",
  concept: "Membresía Mensual",
  amount: 25,
  dueDate: "2026-11-30",
  status: "PENDING",
};
const session: Charge = {
  chargeId: 4,
  type: "PERSONAL_SESSION",
  concept: "Sesión personal",
  amount: 15,
  dueDate: "2026-11-21",
  status: "PENDING",
};

const validCard: CardValues = {
  cardNumber: "4242 4242 4242 4242",
  holderName: " Ana López ",
  expiry: "12/30",
  cvv: "123",
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
  // 15:42 en El Salvador (UTC-6).
  issuedAt: "2026-11-19T21:42:00.000Z",
};

describe("validateCard (mismas reglas que la pasarela)", () => {
  it("acepta una tarjeta válida, con espacios en el número", () => {
    expect(validateCard(validCard)).toEqual({});
  });

  it("marca los cuatro campos de una tarjeta vacía", () => {
    expect(validateCard(EMPTY_CARD)).toEqual({
      cardNumber: CARD_NUMBER_MESSAGE,
      holderName: HOLDER_NAME_MESSAGE,
      expiry: EXPIRY_MESSAGE,
      cvv: CVV_MESSAGE,
    });
  });

  it.each(["4242 4242 4242 424", "4242424242424242 1"])("rechaza el número %s", (cardNumber) => {
    expect(validateCard({ ...validCard, cardNumber }).cardNumber).toBe(CARD_NUMBER_MESSAGE);
  });

  it.each(["Al", "a".repeat(61), "   "])("rechaza el titular %#", (holderName) => {
    expect(validateCard({ ...validCard, holderName }).holderName).toBe(HOLDER_NAME_MESSAGE);
  });

  it.each(["13/30", "1/30", "12-30", "12/2030"])("rechaza el vencimiento %s", (expiry) => {
    expect(validateCard({ ...validCard, expiry }).expiry).toBe(EXPIRY_MESSAGE);
  });

  it("no rechaza una tarjeta vencida: lo decide la pasarela", () => {
    expect(validateCard({ ...validCard, expiry: "01/20" })).toEqual({});
  });

  it.each(["12", "1234", "12a"])("rechaza el CVV %s", (cvv) => {
    expect(validateCard({ ...validCard, cvv }).cvv).toBe(CVV_MESSAGE);
  });

  it("toCardInput quita espacios del número y recorta el titular", () => {
    expect(toCardInput(validCard)).toEqual({
      cardNumber: "4242424242424242",
      holderName: "Ana López",
      expiry: "12/30",
      cvv: "123",
    });
  });

  it("da formato a lo que se escribe", () => {
    expect(formatCardNumberInput("4242a42424242424299")).toBe("4242 4242 4242 4242");
    expect(formatExpiryInput("1230")).toBe("12/30");
    expect(formatExpiryInput("12/3")).toBe("12/3");
    expect(formatExpiryInput("1")).toBe("1");
    expect(formatCvvInput("12a34")).toBe("123");
  });
});

describe("reglas de la pantalla de cobro (FE-15.1)", () => {
  it("busca desde 2 caracteres sin contar espacios", () => {
    expect(shouldSearch(" a ")).toBe(false);
    expect(shouldSearch("an")).toBe(true);
  });

  it("con menos de 2 caracteres o con miembro elegido no muestra opciones", () => {
    const results = { query: "ana", options: [ana] };
    expect(visibleMemberOptions("ana", results, null)).toEqual([ana]);
    expect(visibleMemberOptions("a", results, null)).toEqual([]);
    expect(visibleMemberOptions("ana", results, ana)).toEqual([]);
  });

  it("'No se encontraron miembros' solo si terminó la búsqueda de ese mismo texto", () => {
    const empty = { query: "zz", options: [] };
    expect(showNoMembersFound("zz", empty, null, false)).toBe(true);
    expect(showNoMembersFound("zz", empty, null, true)).toBe(false);
    expect(showNoMembersFound("zzz", empty, null, false)).toBe(false);
    expect(showNoMembersFound("z", { query: "z", options: [] }, null, false)).toBe(false);
  });

  it("muestra el vencimiento sin correr el día por la zona horaria", () => {
    expect(formatDueDate("2026-11-30")).toBe("30/11/2026");
    expect(chargeOptionLabel(membership)).toBe("Membresía Mensual · $25.00 · vence 30/11/2026");
  });

  it("con un solo cobro pendiente lo deja elegido", () => {
    expect(initialChargeId([membership])).toBe(3);
    expect(initialChargeId([membership, session])).toBeNull();
    expect(initialChargeId([])).toBeNull();
  });

  it("en efectivo no envía datos de tarjeta", () => {
    expect(buildPaymentInput(3, "CASH", validCard, KEY)).toEqual({
      chargeId: 3,
      paymentMethod: "CASH",
      idempotencyKey: KEY,
    });
  });

  it("con tarjeta envía los datos limpios y nunca el monto", () => {
    const input = buildPaymentInput(3, "CARD", validCard, KEY);
    expect(input.card).toEqual(toCardInput(validCard));
    expect(input).not.toHaveProperty("amount");
  });
});

describe("newIdempotencyKey", () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("genera un uuid distinto en cada clic", () => {
    const a = newIdempotencyKey();
    expect(a).toMatch(UUID_V4);
    expect(newIdempotencyKey()).not.toBe(a);
  });

  it("sin randomUUID (http por IP de la red) lo arma con getRandomValues", () => {
    const fallback = {
      getRandomValues: (bytes: Uint8Array) => crypto.getRandomValues(bytes),
    } as unknown as Crypto;
    expect(newIdempotencyKey(fallback)).toMatch(UUID_V4);
  });
});

describe("RegisterPaymentFormView", () => {
  const render = (props: Partial<RegisterPaymentFormViewProps> = {}) =>
    renderToStaticMarkup(
      <RegisterPaymentFormView
        query=""
        searching={false}
        options={[]}
        noMembersFound={false}
        member={null}
        charges={null}
        chargeId={null}
        method="CASH"
        card={EMPTY_CARD}
        cardErrors={{}}
        processing={false}
        error={null}
        onQueryChange={noop}
        onChooseMember={noop}
        onChangeMember={noop}
        onChargeChange={noop}
        onMethodChange={noop}
        onCardChange={noop}
        onSubmit={noop}
        {...props}
      />,
    );

  it("sin miembro solo muestra la búsqueda, sin botón Cobrar", () => {
    const html = render();
    expect(html).toContain("Miembro");
    expect(html).toContain('placeholder="Correo del miembro"');
    expect(html).not.toContain("Cobrar");
  });

  it("muestra las opciones encontradas y el aviso de búsqueda vacía", () => {
    expect(render({ query: "ana", options: [ana] })).toContain("ana@correo.com");
    expect(render({ query: "zz", noMembersFound: true })).toContain(NO_MEMBERS_FOUND_MESSAGE);
    expect(render({ query: "ana", searching: true })).toContain("Buscando…");
  });

  it("avisa cuando el miembro no tiene cobros pendientes", () => {
    const html = render({ member: ana, query: ana.email, charges: [] });
    expect(html).toContain(NO_PENDING_CHARGES_MESSAGE);
    expect(html).toContain("Cambiar");
    expect(html).not.toContain("Cobrar");
  });

  it("mientras carga los cobros lo indica", () => {
    expect(render({ member: ana, charges: null })).toContain("Cargando cobros…");
  });

  it("con cobros pendientes: Cobrar deshabilitado hasta elegir uno", () => {
    const html = render({ member: ana, charges: [membership, session] });
    expect(html).toContain("Selecciona un cobro pendiente");
    expect(html).toContain("Sesión personal · $15.00 · vence 21/11/2026");
    expect(html).toMatch(/<button type="submit" disabled=""/);
    expect(html).not.toContain('id="amount"');
  });

  it("con un cobro elegido muestra el monto en solo lectura y habilita Cobrar", () => {
    const html = render({ member: ana, charges: [membership], chargeId: 3 });
    expect(html).toMatch(/<input id="amount" readOnly="" tabindex="-1"[^>]*value="\$25.00"/);
    expect(html).toContain(">Cobrar</button>");
    expect(html).not.toMatch(/<button type="submit" disabled=""/);
  });

  it("en efectivo no pide datos de tarjeta; con tarjeta sí", () => {
    const base = { member: ana, charges: [membership], chargeId: 3 };
    expect(render(base)).not.toContain("Datos de la tarjeta");
    const html = render({ ...base, method: "CARD" });
    for (const label of ["Número de tarjeta", "Nombre del titular", "Vencimiento (MM/AA)", "CVV"]) {
      expect(html).toContain(label);
    }
  });

  it("mientras procesa deshabilita todo y muestra 'Procesando pago…'", () => {
    const html = render({ member: ana, charges: [membership], chargeId: 3, method: "CARD", processing: true });
    expect(html).toContain("Procesando pago…");
    expect(html).toMatch(/<button type="submit" disabled=""/);
    expect(html).toMatch(/<fieldset disabled=""/);
  });

  it("muestra el error del pago", () => {
    const html = render({
      member: ana,
      charges: [membership],
      chargeId: 3,
      error: "Pago rechazado: Fondos insuficientes.",
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Pago rechazado: Fondos insuficientes.");
  });
});

describe("CardFields", () => {
  it("muestra cada error bajo su campo y oculta el CVV", () => {
    const html = renderToStaticMarkup(
      <CardFields
        values={EMPTY_CARD}
        errors={{ cardNumber: CARD_NUMBER_MESSAGE, cvv: CVV_MESSAGE }}
        disabled={false}
        onChange={noop}
      />,
    );
    expect(html).toContain('id="card-cardNumber-error"');
    expect(html).toContain(CARD_NUMBER_MESSAGE);
    expect(html).toContain(CVV_MESSAGE);
    expect(html).toMatch(/id="card-cvv"[^>]*type="password"/);
    expect(html).not.toContain('autoComplete="cc-');
  });
});

describe("ReceiptCard (FE-15.2)", () => {
  const render = (props: Partial<Parameters<typeof ReceiptCard>[0]> = {}) =>
    renderToStaticMarkup(
      <ReceiptCard receipt={receipt} downloading={false} downloadError={null} onDownload={noop} {...props} />,
    );

  it("muestra número, fecha del gimnasio, concepto, monto y método", () => {
    const html = render();
    expect(html).toContain("Pago registrado. Comprobante C-000002.");
    expect(html).toContain("19/11/2026 15:42");
    expect(html).toContain("Membresía Mensual");
    expect(html).toContain("$25.00");
    expect(html).toContain("Tarjeta terminada en 4242");
    expect(html).toContain("Descargar PDF");
  });

  it("indica la descarga en curso y su error", () => {
    expect(render({ downloading: true })).toContain("Descargando…");
    expect(render({ downloadError: "No pudimos descargar." })).toContain("No pudimos descargar.");
  });

  it("acepta otro título y acciones extra (para el pago del miembro, H16)", () => {
    const html = render({ heading: "Pago aprobado", children: <button>Nuevo cobro</button> });
    expect(html).toContain("Pago aprobado. Comprobante C-000002.");
    expect(html).toContain("Nuevo cobro");
  });

  it("textos de método y fecha", () => {
    expect(paymentMethodText({ paymentMethod: "CASH", cardLast4: null })).toBe("Efectivo");
    expect(paymentMethodText({ paymentMethod: "CARD", cardLast4: null })).toBe("Tarjeta");
    expect(issuedAtText("2026-11-20T05:30:00.000Z")).toBe("19/11/2026 23:30");
  });
});
