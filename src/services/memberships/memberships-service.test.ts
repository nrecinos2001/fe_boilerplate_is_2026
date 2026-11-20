import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/src/services/http/api-client";
import type { MyMembership } from "@/src/types/membership";
import {
  LOAD_MEMBERSHIP_ERROR,
  MEMBERSHIP_UNAVAILABLE_ERROR,
  fetchMyMembership,
} from "./memberships-service";

const membership: MyMembership = {
  status: "ACTIVE",
  planName: "Mensual",
  planType: "MONTHLY",
  endDate: "2026-12-15",
  daysLeft: 27,
  includedClass: null,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("memberships-service (H05)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pide la membresía propia sin enviar ningún id de miembro", async () => {
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json(membership));

    const result = await fetchMyMembership();

    expect(result).toEqual({ ok: true, data: membership });
    expect(spy).toHaveBeenCalledWith("memberships/me");
  });

  it("503: avisa que la consulta aún no está disponible", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
      json({ statusCode: 503, message: "x" }, 503),
    );

    await expect(fetchMyMembership()).resolves.toEqual({
      ok: false,
      error: MEMBERSHIP_UNAVAILABLE_ERROR,
      status: 503,
    });
  });

  it("otro error o falla de red: mensaje genérico, sin lanzar", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(json({ message: "Forbidden" }, 403));
    await expect(fetchMyMembership()).resolves.toMatchObject({
      ok: false,
      error: LOAD_MEMBERSHIP_ERROR,
      status: 403,
    });

    vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(new Error("offline"));
    await expect(fetchMyMembership()).resolves.toMatchObject({
      ok: false,
      error: LOAD_MEMBERSHIP_ERROR,
      status: 0,
    });
  });
});
