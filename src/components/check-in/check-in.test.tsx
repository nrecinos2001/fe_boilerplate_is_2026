import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import * as apiClient from "@/src/services/http/api-client";
import {
  CHECK_IN_ERROR,
  LOOKUP_ERROR,
  lookupMembers,
  registerCheckIn,
} from "@/src/services/check-ins/check-ins-service";
import type { CheckInMember } from "@/src/types/check-ins";
import {
  checkInSuccessMessage,
  formatCheckInTime,
  isMembershipCurrent,
  nextPaymentLabel,
  NO_MEMBERS_FOUND_MESSAGE,
  RECENT_CHECK_IN_MESSAGE,
  shouldLookup,
  statusLabel,
} from "./check-in-logic";
import { CheckInView, type CheckInViewProps } from "./check-in-view";

const noop = () => {};

const juan: CheckInMember = {
  memberId: "7b0c2c1e-7d1f-4a43-9a52-0f8f3f7f3a10",
  memberCode: "GYM-000001",
  fullName: "Juan Perez",
  membershipStatus: "ACTIVE",
  nextPaymentDate: "2026-12-08",
};
const luis: CheckInMember = {
  memberId: "8c1d3d2f-8e2a-4b54-8b63-1a9a4a8a4b21",
  memberCode: "GYM-000003",
  fullName: "Luis Martinez",
  membershipStatus: "NONE",
  nextPaymentDate: null,
};

function mockResponse(res: Response | Error) {
  const spy = vi.spyOn(apiClient, "apiFetch");
  if (res instanceof Error) spy.mockRejectedValue(res);
  else spy.mockResolvedValue(res);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

describe("lógica del check-in (FE-13.1)", () => {
  it("no busca con menos de 2 caracteres", () => {
    expect(shouldLookup(" a ")).toBe(false);
    expect(shouldLookup("Ju")).toBe(true);
  });

  it("muestra la hora del ingreso en El Salvador", () => {
    // 18:05 UTC = 12:05 en El Salvador.
    expect(formatCheckInTime("2026-11-19T18:05:00.000Z")).toBe("12:05");
    expect(checkInSuccessMessage("2026-11-19T18:05:00.000Z")).toBe(
      "Ingreso registrado a las 12:05.",
    );
  });

  it("traduce el estado y la próxima fecha de pago", () => {
    expect(statusLabel(juan)).toBe("Activa");
    expect(statusLabel(luis)).toBe("Sin membresía");
    expect(nextPaymentLabel(juan)).toBe("08/12/2026");
    expect(nextPaymentLabel(luis)).toBe("Sin fecha");
  });

  it("solo la membresía Activa está vigente", () => {
    expect(isMembershipCurrent(juan)).toBe(true);
    expect(isMembershipCurrent(luis)).toBe(false);
    expect(isMembershipCurrent({ membershipStatus: "EXPIRED" })).toBe(false);
  });
});

describe("check-ins-service", () => {
  it("lookupMembers busca con el término recortado", async () => {
    const spy = mockResponse(Response.json({ data: [juan] }));
    expect(await lookupMembers("  gym-000001 ")).toEqual({ ok: true, data: [juan], status: 200 });
    expect(spy).toHaveBeenCalledWith("check-ins/lookup?q=gym-000001");
  });

  it("lookupMembers con 403 da acceso denegado y sin conexión el error genérico", async () => {
    mockResponse(new Response("", { status: 403 }));
    expect(await lookupMembers("Juan")).toMatchObject({ error: ACCESS_DENIED_MESSAGE });
    vi.restoreAllMocks();
    mockResponse(new TypeError("Failed to fetch"));
    expect(await lookupMembers("Juan")).toMatchObject({ error: LOOKUP_ERROR, status: 0 });
  });

  it("registerCheckIn envía solo el miembro y devuelve el ingreso", async () => {
    const result = {
      checkInId: 21,
      memberCode: "GYM-000001",
      checkedInAt: "2026-11-19T18:05:00.000Z",
      membershipStatus: "ACTIVE",
      isException: false,
    };
    const spy = mockResponse(Response.json(result, { status: 201 }));
    expect(await registerCheckIn(juan.memberId)).toEqual({ ok: true, data: result, status: 201 });
    expect(spy).toHaveBeenCalledWith("check-ins", {
      method: "POST",
      body: JSON.stringify({ memberId: juan.memberId }),
    });
  });

  it("registerCheckIn con 409 devuelve el mensaje de los 30 minutos", async () => {
    mockResponse(Response.json({ message: RECENT_CHECK_IN_MESSAGE }, { status: 409 }));
    expect(await registerCheckIn(juan.memberId)).toEqual({
      ok: false,
      error: RECENT_CHECK_IN_MESSAGE,
      status: 409,
    });
  });

  it("registerCheckIn con 500 devuelve el error genérico", async () => {
    mockResponse(new Response("", { status: 500 }));
    expect(await registerCheckIn(juan.memberId)).toMatchObject({ error: CHECK_IN_ERROR });
  });
});

describe("CheckInView", () => {
  const render = (props: Partial<CheckInViewProps> = {}) =>
    renderToStaticMarkup(
      <CheckInView
        term=""
        results={[]}
        searching={false}
        searchError={null}
        selected={null}
        registering={false}
        success={null}
        error={null}
        onTermChange={noop}
        onSelect={noop}
        onRegister={noop}
        {...props}
      />,
    );

  it("muestra los resultados con su estado", () => {
    const html = render({ term: "ju", results: [juan, luis] });
    expect(html).toContain("Juan Perez");
    expect(html).toContain("GYM-000001");
    expect(html).toContain("Activa");
    expect(html).toContain("Sin membresía");
  });

  it("sin resultados muestra el mensaje de la historia y no hay botón de registrar", () => {
    const html = render({ term: "nadie" });
    expect(html).toContain(NO_MEMBERS_FOUND_MESSAGE);
    expect(html).not.toContain("Registrar ingreso");
  });

  it("con menos de 2 caracteres no muestra el mensaje de vacío", () => {
    expect(render({ term: "n" })).not.toContain(NO_MEMBERS_FOUND_MESSAGE);
  });

  it("mientras busca lo indica", () => {
    expect(render({ term: "Juan", searching: true })).toContain("Buscando...");
  });

  it("al elegir un miembro muestra su tarjeta con estado, próxima fecha de pago y el botón", () => {
    const html = render({ term: "Juan", selected: juan });
    expect(html).toContain("Miembro seleccionado");
    expect(html).toContain("08/12/2026");
    expect(html).toContain("Registrar ingreso");
    expect(html).not.toContain("no está vigente");
  });

  it("si la membresía no está vigente lo avisa en la tarjeta", () => {
    const html = render({ term: "Luis", selected: luis });
    expect(html).toContain("Sin fecha");
    expect(html).toContain("La membresía de este miembro no está vigente.");
  });

  it("mientras registra deshabilita el botón", () => {
    const html = render({ term: "Juan", selected: juan, registering: true });
    expect(html).toContain("Registrando...");
    expect(html).toMatch(/<button type="button" disabled=""[^>]*>Registrando/);
  });

  it("muestra el éxito y el error del servidor", () => {
    expect(render({ success: "Ingreso registrado a las 12:05." })).toContain(
      "Ingreso registrado a las 12:05.",
    );
    expect(render({ selected: juan, error: RECENT_CHECK_IN_MESSAGE })).toContain(
      RECENT_CHECK_IN_MESSAGE,
    );
  });
});
