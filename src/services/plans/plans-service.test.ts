import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import * as apiClient from "@/src/services/http/api-client";
import type { Plan } from "@/src/types/plans";
import {
  createPlan,
  DEACTIVATE_PLAN_ERROR,
  deactivatePlan,
  fetchPlans,
  LOAD_PLANS_ERROR,
  PLAN_NAME_TAKEN_MESSAGE,
  SAVE_PLAN_ERROR,
  updatePlan,
} from "./plans-service";

const plan: Plan = {
  id: 1,
  name: "Mensual",
  type: "MONTHLY",
  durationDays: 30,
  price: 25,
  benefits: null,
  isActive: true,
};

function mockResponse(res: Response | Error) {
  const spy = vi.spyOn(apiClient, "apiFetch");
  if (res instanceof Error) spy.mockRejectedValue(res);
  else spy.mockResolvedValue(res);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

describe("fetchPlans (GET /plans)", () => {
  it("trae todos los planes por defecto", async () => {
    const spy = mockResponse(Response.json({ data: [plan] }));
    expect(await fetchPlans()).toEqual({ ok: true, data: [plan], status: 200 });
    expect(spy).toHaveBeenCalledWith("plans");
  });

  it("con activeOnly pide solo los activos", async () => {
    const spy = mockResponse(Response.json({ data: [] }));
    await fetchPlans(true);
    expect(spy).toHaveBeenCalledWith("plans?active=true");
  });

  it("con error o sin conexión devuelve el mensaje de carga", async () => {
    mockResponse(new Response("", { status: 500 }));
    expect(await fetchPlans()).toMatchObject({ ok: false, error: LOAD_PLANS_ERROR });
    vi.restoreAllMocks();
    mockResponse(new TypeError("Failed to fetch"));
    expect(await fetchPlans()).toMatchObject({ ok: false, error: LOAD_PLANS_ERROR, status: 0 });
  });
});

describe("createPlan (POST /plans)", () => {
  it("envía el cuerpo y devuelve el plan creado", async () => {
    const spy = mockResponse(Response.json(plan, { status: 201 }));
    const input = { name: "Mensual", type: "MONTHLY" as const, durationDays: 30, price: 25 };

    expect(await createPlan(input)).toEqual({ ok: true, data: plan, status: 201 });
    expect(spy).toHaveBeenCalledWith("plans", { method: "POST", body: JSON.stringify(input) });
  });

  it("con 409 devuelve el motivo del servidor", async () => {
    mockResponse(
      Response.json({ message: "Ya existe un plan de clase suelta activo." }, { status: 409 }),
    );
    expect(await createPlan({ name: "Otra", type: "DROP_IN", price: 5 })).toEqual({
      ok: false,
      error: "Ya existe un plan de clase suelta activo.",
      status: 409,
    });
  });

  it("con 409 sin cuerpo asume el nombre repetido", async () => {
    mockResponse(new Response("", { status: 409 }));
    expect(await createPlan({ name: "Mensual", type: "MONTHLY", durationDays: 30, price: 25 }))
      .toMatchObject({ error: PLAN_NAME_TAKEN_MESSAGE });
  });

  it("con 400 une los mensajes de validación", async () => {
    mockResponse(
      Response.json({ message: ["La clase suelta no lleva duración."] }, { status: 400 }),
    );
    expect(await createPlan({ name: "X", type: "DROP_IN", price: 5 })).toMatchObject({
      error: "La clase suelta no lleva duración.",
      status: 400,
    });
  });

  it("con 403 devuelve acceso denegado y con 500 el error genérico", async () => {
    mockResponse(new Response("", { status: 403 }));
    expect(await createPlan({ name: "Mensual", type: "MONTHLY", durationDays: 30, price: 25 }))
      .toMatchObject({ error: ACCESS_DENIED_MESSAGE });
    vi.restoreAllMocks();
    mockResponse(new Response("", { status: 500 }));
    expect(await createPlan({ name: "Mensual", type: "MONTHLY", durationDays: 30, price: 25 }))
      .toMatchObject({ error: SAVE_PLAN_ERROR });
  });
});

describe("updatePlan y deactivatePlan", () => {
  it("updatePlan usa PATCH /plans/{id}", async () => {
    const spy = mockResponse(Response.json({ ...plan, price: 30 }));
    const res = await updatePlan(1, { price: 30 });
    expect(res).toMatchObject({ ok: true, data: { price: 30 } });
    expect(spy).toHaveBeenCalledWith("plans/1", { method: "PATCH", body: '{"price":30}' });
  });

  it("deactivatePlan usa PATCH /plans/{id}/deactivate sin cuerpo", async () => {
    const spy = mockResponse(Response.json({ ...plan, isActive: false }));
    expect(await deactivatePlan(1)).toMatchObject({ ok: true, data: { isActive: false } });
    expect(spy).toHaveBeenCalledWith("plans/1/deactivate", { method: "PATCH", body: undefined });
  });

  it("deactivatePlan con 404 devuelve el motivo genérico de desactivar", async () => {
    mockResponse(Response.json({ message: "No encontramos ese plan." }, { status: 404 }));
    expect(await deactivatePlan(9)).toMatchObject({ ok: false, error: DEACTIVATE_PLAN_ERROR });
  });
});
