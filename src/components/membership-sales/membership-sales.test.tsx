import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import * as apiClient from "@/src/services/http/api-client";
import { SEARCH_MEMBERS_ERROR, searchMembers } from "@/src/services/members/members-service";
import {
  SELL_MEMBERSHIP_ERROR,
  sellDropIn,
  sellMembership,
} from "@/src/services/memberships/membership-sales-service";
import type { GymClass } from "@/src/types/classes";
import type { MemberSearchItem, SoldDropIn, SoldMembership } from "@/src/types/membership-sales";
import type { Plan } from "@/src/types/plans";
import { MemberPicker, type MemberPickerProps } from "./member-picker";
import { SaleFormView, type SaleFormViewProps } from "./sale-form-view";
import {
  chargeScreenHref,
  declinedMessage,
  dropInClassesToday,
  emptySale,
  formatDate,
  NO_DROP_IN_CLASSES_MESSAGE,
  NO_MEMBERS_FOUND_MESSAGE,
  NO_PLANS_FOR_SALE_MESSAGE,
  plansForSale,
  PROCESSING_PAYMENT_MESSAGE,
  saleSuccessMessage,
  shouldSearch,
  spotsLeft,
  toDropInInput,
  toSellInput,
  validateCard,
  validateSale,
  type SaleValues,
} from "./sale-logic";
import { DropInSummary, SaleSummary } from "./sale-summary";

const TODAY = "2026-11-19";
const noop = () => {};

const juan: MemberSearchItem = {
  id: "7b0c2c1e-7d1f-4a43-9a52-0f8f3f7f3a10",
  memberCode: "GYM-000001",
  fullName: "Juan Perez",
  email: "miembro@gymhub.test",
};

const plan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 1,
  name: "Mensual",
  type: "MONTHLY",
  durationDays: 30,
  price: 25,
  benefits: null,
  isActive: true,
  ...overrides,
});

const sold: SoldMembership = {
  id: 12,
  plan: "Mensual",
  planType: "MONTHLY",
  startDate: "2026-11-19",
  endDate: "2026-12-18",
  status: "PENDING_PAYMENT",
  isRenewal: true,
  chargeId: 34,
  amount: 25,
};

function mockResponse(res: Response | Error) {
  const spy = vi.spyOn(apiClient, "apiFetch");
  if (res instanceof Error) spy.mockRejectedValue(res);
  else spy.mockResolvedValue(res);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

const NOW = new Date(2026, 10, 19, 10, 0);
const dropInPlan = plan({ id: 3, name: "Clase suelta", type: "DROP_IN", durationDays: null, price: 5 });

const gymClass = (overrides: Partial<GymClass> = {}): GymClass => ({
  id: 4,
  name: "Spinning",
  trainerId: "t1",
  trainer: { id: "t1", fullName: "Entrenador", email: "e@gymhub.test" },
  startsAt: new Date(2026, 10, 19, 18, 0).toISOString(),
  endsAt: new Date(2026, 10, 19, 18, 50).toISOString(),
  capacity: 10,
  confirmedReservations: 7,
  status: "SCHEDULED",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const card = { cardNumber: "4242 4242 4242 4242", holderName: "Ana Pérez", expiry: "12/30", cvv: "123" };

describe("lógica de la venta (FE-4.1)", () => {
  const valid: SaleValues = { ...emptySale(TODAY), member: juan, planId: "1" };

  it("acepta una venta Mensual completa con inicio hoy", () => {
    expect(validateSale(valid, plan(), TODAY, NOW)).toEqual({});
  });

  it("exige miembro y plan, y en Mensual no acepta una fecha pasada", () => {
    expect(Object.keys(validateSale(emptySale(TODAY), undefined, TODAY, NOW)).sort()).toEqual([
      "member",
      "planId",
    ]);
    expect(validateSale({ ...valid, startDate: "2026-11-18" }, plan(), TODAY, NOW).startDate).toBe(
      "La fecha de inicio no puede ser anterior a hoy.",
    );
  });

  it("arma el cuerpo con el id del miembro y el plan como número", () => {
    expect(toSellInput(valid)).toEqual({ memberId: juan.id, planId: 1, startDate: TODAY });
  });

  it("ofrece todos los planes activos, incluida la Clase suelta", () => {
    const plans = [
      plan(),
      plan({ id: 2, name: "Trimestral", type: "QUARTERLY", durationDays: 90 }),
      dropInPlan,
      plan({ id: 4, name: "Viejo", isActive: false }),
    ];
    expect(plansForSale(plans).map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("no busca con menos de 2 caracteres", () => {
    expect(shouldSearch(" a ")).toBe(false);
    expect(shouldSearch("Ju")).toBe(true);
  });

  it("formatea el mensaje de éxito y el enlace a cobrar", () => {
    expect(formatDate("2026-12-09")).toBe("09/12/2026");
    expect(saleSuccessMessage("2026-12-09")).toBe("Membresía registrada. Vence el 09/12/2026.");
    expect(chargeScreenHref(juan.id)).toBe(`/recepcion/cobros?memberId=${juan.id}`);
  });
});

describe("lógica de la clase suelta (FE-4.1)", () => {
  const dropInValues: SaleValues = {
    ...emptySale(TODAY),
    member: juan,
    planId: "3",
    classId: "4",
    paymentMethod: "CASH",
  };

  it("exige clase de hoy y método de pago, no la fecha de inicio", () => {
    const errors = validateSale({ ...dropInValues, classId: "", paymentMethod: "", startDate: "" }, dropInPlan, TODAY, NOW);
    expect(Object.keys(errors).sort()).toEqual(["classId", "paymentMethod"]);
  });

  it("en efectivo no pide tarjeta", () => {
    expect(validateSale(dropInValues, dropInPlan, TODAY, NOW)).toEqual({});
  });

  it("con tarjeta valida número, titular, vencimiento y CVV", () => {
    const errors = validateSale({ ...dropInValues, paymentMethod: "CARD" }, dropInPlan, TODAY, NOW);
    expect(Object.keys(errors).sort()).toEqual(["cardNumber", "cvv", "expiry", "holderName"]);
    expect(validateSale({ ...dropInValues, paymentMethod: "CARD", card }, dropInPlan, TODAY, NOW)).toEqual({});
  });

  it("rechaza una tarjeta vencida y acepta la del mes actual", () => {
    expect(validateCard({ ...card, expiry: "10/26" }, NOW).expiry).toBe("La tarjeta está vencida.");
    expect(validateCard({ ...card, expiry: "11/26" }, NOW).expiry).toBeUndefined();
  });

  it("solo ofrece clases de hoy programadas, que no han iniciado y con cupo", () => {
    const classes = [
      gymClass({ id: 1 }),
      gymClass({ id: 2, confirmedReservations: 10 }),
      gymClass({ id: 3, status: "CANCELLED" }),
      gymClass({ id: 5, startsAt: new Date(2026, 10, 19, 9, 0).toISOString() }),
      gymClass({ id: 6, startsAt: new Date(2026, 10, 20, 9, 0).toISOString() }),
      gymClass({ id: 7, startsAt: new Date(2026, 10, 19, 12, 0).toISOString() }),
    ];
    expect(dropInClassesToday(classes, NOW).map((c) => c.id)).toEqual([7, 1]);
    expect(spotsLeft(gymClass())).toBe(3);
  });

  it("arma el cuerpo: tarjeta sin espacios solo con CARD y la clave de idempotencia", () => {
    expect(toDropInInput(dropInValues, "key-1")).toEqual({
      memberId: juan.id,
      classId: 4,
      paymentMethod: "CASH",
      idempotencyKey: "key-1",
    });
    expect(toDropInInput({ ...dropInValues, paymentMethod: "CARD", card }, "key-2").card).toEqual({
      ...card,
      cardNumber: "4242424242424242",
    });
  });

  it("muestra el rechazo con el formato de la historia", () => {
    expect(declinedMessage("Fondos insuficientes")).toBe("Pago rechazado: Fondos insuficientes.");
  });
});

describe("sellDropIn (POST /memberships/drop-in)", () => {
  const input = { memberId: juan.id, classId: 4, paymentMethod: "CASH" as const, idempotencyKey: "k" };

  it("con 201 devuelve el comprobante", async () => {
    const sale = {
      membershipId: 15,
      reservationId: 87,
      receiptNumber: "C-000012",
      amount: 5,
      endDate: TODAY,
      className: "Spinning",
      classStartsAt: "2026-11-19T18:00:00.000Z",
    };
    const spy = mockResponse(Response.json(sale, { status: 201 }));
    expect(await sellDropIn(input)).toEqual({ ok: true, data: sale, status: 201 });
    expect(spy).toHaveBeenCalledWith("memberships/drop-in", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

  it.each([
    [409, "La clase está llena."],
    [400, "Fondos insuficientes"],
  ])("con %i devuelve el motivo del servidor", async (status, message) => {
    mockResponse(Response.json({ message }, { status }));
    expect(await sellDropIn(input)).toEqual({ ok: false, error: message, status });
  });
});

describe("searchMembers (GET /members?q=)", () => {
  it("busca con el término recortado y devuelve los miembros", async () => {
    const spy = mockResponse(Response.json({ data: [juan] }));
    expect(await searchMembers("  GYM-000001 ")).toEqual({ ok: true, data: [juan], status: 200 });
    expect(spy).toHaveBeenCalledWith("members?q=GYM-000001");
  });

  it("con 403 devuelve acceso denegado y con error o sin conexión el genérico", async () => {
    mockResponse(new Response("", { status: 403 }));
    expect(await searchMembers("Juan")).toMatchObject({ ok: false, error: ACCESS_DENIED_MESSAGE });
    vi.restoreAllMocks();
    mockResponse(new TypeError("Failed to fetch"));
    expect(await searchMembers("Juan")).toMatchObject({ ok: false, error: SEARCH_MEMBERS_ERROR });
  });
});

describe("sellMembership (POST /memberships)", () => {
  it("con 201 devuelve la membresía con su vencimiento", async () => {
    const spy = mockResponse(Response.json(sold, { status: 201 }));
    const input = { memberId: juan.id, planId: 1, startDate: TODAY };
    expect(await sellMembership(input)).toEqual({ ok: true, data: sold, status: 201 });
    expect(spy).toHaveBeenCalledWith("memberships", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

  it.each([
    [409, "El miembro ya tiene una membresía pendiente de pago."],
    [400, "El plan está desactivado y ya no se vende."],
    [404, "No encontramos ese miembro."],
  ])("con %i devuelve el motivo del servidor", async (status, message) => {
    mockResponse(Response.json({ message }, { status }));
    expect(await sellMembership({ memberId: juan.id, planId: 1 })).toEqual({
      ok: false,
      error: message,
      status,
    });
  });

  it("con 403 acceso denegado y con 500 el error genérico", async () => {
    mockResponse(new Response("", { status: 403 }));
    expect(await sellMembership({ memberId: juan.id, planId: 1 })).toMatchObject({
      error: ACCESS_DENIED_MESSAGE,
    });
    vi.restoreAllMocks();
    mockResponse(new Response("", { status: 500 }));
    expect(await sellMembership({ memberId: juan.id, planId: 1 })).toMatchObject({
      error: SELL_MEMBERSHIP_ERROR,
    });
  });
});

describe("MemberPicker", () => {
  const render = (props: Partial<MemberPickerProps> = {}) =>
    renderToStaticMarkup(
      <MemberPicker
        term=""
        results={[]}
        searching={false}
        searchError={null}
        selected={null}
        disabled={false}
        onTermChange={noop}
        onSelect={noop}
        onClear={noop}
        {...props}
      />,
    );

  it("muestra los resultados con nombre y código", () => {
    const html = render({ term: "Juan", results: [juan] });
    expect(html).toContain("Juan Perez");
    expect(html).toContain("GYM-000001");
  });

  it("sin resultados muestra el mensaje de la historia", () => {
    expect(render({ term: "Nadie" })).toContain(NO_MEMBERS_FOUND_MESSAGE);
  });

  it("con menos de 2 caracteres no muestra el mensaje de vacío", () => {
    expect(render({ term: "N" })).not.toContain(NO_MEMBERS_FOUND_MESSAGE);
  });

  it("mientras busca lo indica", () => {
    expect(render({ term: "Juan", searching: true })).toContain("Buscando...");
  });

  it("con un miembro elegido lo muestra con la opción de cambiarlo", () => {
    const html = render({ selected: juan });
    expect(html).toContain("Juan Perez");
    expect(html).toContain("Cambiar");
    expect(html).not.toContain('id="member-search"');
  });
});

describe("SaleFormView", () => {
  const render = (props: Partial<SaleFormViewProps> = {}) =>
    renderToStaticMarkup(
      <SaleFormView
        picker={{
          term: "",
          results: [],
          searching: false,
          searchError: null,
          onTermChange: noop,
          onSelect: noop,
          onClear: noop,
        }}
        dropIn={{
          classes: [gymClass()],
          classesLoading: false,
          classesError: null,
          onClassChange: noop,
          onPaymentMethodChange: noop,
          onCardChange: noop,
        }}
        values={{ ...emptySale(TODAY), member: juan }}
        errors={{}}
        plans={[plan(), dropInPlan]}
        plansLoading={false}
        plansError={null}
        today={TODAY}
        submitting={false}
        serverError={null}
        onPlanChange={noop}
        onStartDateChange={noop}
        onSubmit={noop}
        onCancel={noop}
        {...props}
      />,
    );

  it("muestra los planes con duración y precio, y la fecha con mínimo hoy", () => {
    const html = render();
    expect(html).toContain("Mensual · Mensual · 30 días · $25.00");
    expect(html).toContain(`min="${TODAY}"`);
    expect(html).toContain("Registrar");
  });

  it("sin planes para vender lo indica", () => {
    expect(render({ plans: [] })).toContain(NO_PLANS_FOR_SALE_MESSAGE);
  });

  it("mientras registra deshabilita el botón", () => {
    const html = render({ submitting: true });
    expect(html).toContain("Registrando...");
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });

  it("muestra el error del servidor y los de validación", () => {
    const html = render({
      serverError: "El miembro ya tiene una membresía pendiente de pago.",
      errors: { planId: "Elige el plan." },
    });
    expect(html).toContain("El miembro ya tiene una membresía pendiente de pago.");
    expect(html).toContain("Elige el plan.");
  });

  const dropInValues = { ...emptySale(TODAY), member: juan, planId: "3" };

  it("al elegir Clase suelta se oculta la fecha y aparecen la clase con sus lugares y el pago", () => {
    const html = render({ values: dropInValues });
    expect(html).toContain("Clase suelta · Clase suelta · mismo día · $5.00");
    expect(html).not.toContain('id="sale-start"');
    expect(html).toContain("Spinning · 3 lugares libres");
    expect(html).toContain("Efectivo");
    expect(html).toContain("Tarjeta");
    expect(html).toContain("Cobrar y registrar");
    expect(html).not.toContain('id="card-cardNumber"');
  });

  it("con Tarjeta pide los datos de la tarjeta", () => {
    const html = render({ values: { ...dropInValues, paymentMethod: "CARD" } });
    expect(html).toContain('id="card-cardNumber"');
    expect(html).toContain("Datos de la tarjeta (no se guardan)");
  });

  it("sin clases de hoy con cupo lo indica", () => {
    const html = render({
      values: dropInValues,
      dropIn: {
        classes: [],
        classesLoading: false,
        classesError: null,
        onClassChange: noop,
        onPaymentMethodChange: noop,
        onCardChange: noop,
      },
    });
    expect(html).toContain(NO_DROP_IN_CLASSES_MESSAGE);
  });

  it("mientras procesa la tarjeta deshabilita el botón con Procesando pago…", () => {
    const html = render({
      values: { ...dropInValues, paymentMethod: "CARD" },
      submitting: true,
    });
    expect(html).toContain(PROCESSING_PAYMENT_MESSAGE);
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });
});

describe("DropInSummary", () => {
  it("muestra la clase, lo pagado y el comprobante, sin Ir a cobrar", () => {
    const sale: SoldDropIn = {
      membershipId: 15,
      reservationId: 87,
      receiptNumber: "C-000012",
      amount: 5,
      endDate: TODAY,
      className: "Spinning",
      classStartsAt: new Date(2026, 10, 19, 18, 0).toISOString(),
    };
    const html = renderToStaticMarkup(<DropInSummary sale={sale} member={juan} onNewSale={noop} />);
    expect(html).toContain("Membresía registrada. Vence el 19/11/2026.");
    expect(html).toContain("Spinning · 18:00");
    expect(html).toContain("C-000012");
    expect(html).toContain("$5.00");
    expect(html).not.toContain("Ir a cobrar");
  });
});

describe("SaleSummary", () => {
  it("muestra el vencimiento calculado, el cobro pendiente y el botón Ir a cobrar", () => {
    const html = renderToStaticMarkup(<SaleSummary sale={sold} member={juan} onNewSale={noop} />);
    expect(html).toContain("Membresía registrada. Vence el 18/12/2026.");
    expect(html).toContain("Pendiente de pago");
    expect(html).toContain("$25.00");
    expect(html).toContain("(renovación)");
    expect(html).toContain("Ir a cobrar");
    expect(html).toContain(`href="/recepcion/cobros?memberId=${juan.id}"`);
  });
});
