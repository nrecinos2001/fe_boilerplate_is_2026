import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/src/services/http/api-client";
import { cancelClass } from "./cancel-class-service";

afterEach(() => vi.restoreAllMocks());

describe("cancelClass (H09)", () => {
  it("envía el motivo y refleja reservas y avisos cancelados", async () => {
    const fetch = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
      Response.json({ reservationsCancelled: 14, noticesSent: 14 }),
    );
    const result = await cancelClass(7, "El entrenador no estará disponible");
    expect(fetch).toHaveBeenCalledWith("classes/7/cancel", {
      method: "PATCH",
      body: JSON.stringify({ reason: "El entrenador no estará disponible" }),
    });
    expect(result).toMatchObject({ ok: true, data: { reservationsCancelled: 14, noticesSent: 14 } });
  });

  it("conserva el motivo del conflicto enviado por el backend", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
      Response.json({ message: "La clase ya inició." }, { status: 409 }),
    );
    await expect(cancelClass(7, "El entrenador no estará disponible")).resolves.toMatchObject({
      ok: false,
      status: 409,
      error: "La clase ya inició.",
    });
  });
});
