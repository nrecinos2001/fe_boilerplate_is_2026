import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/src/services/http/api-client";
import {
  changePassword,
  CHANGE_PASSWORD_SERVER_ERROR,
  WRONG_CURRENT_PASSWORD_MESSAGE,
} from "./password-service";

const input = { currentPassword: "Temporal123", newPassword: "NuevaClave1" };

function mockResponse(res: Response | Error) {
  const spy = vi.spyOn(apiClient, "apiFetch");
  if (res instanceof Error) spy.mockRejectedValue(res);
  else spy.mockResolvedValue(res);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

describe("changePassword (PATCH /auth/password)", () => {
  it("con 204 devuelve ok y envía el cuerpo esperado", async () => {
    const spy = mockResponse(new Response(null, { status: 204 }));

    const result = await changePassword(input);

    expect(result).toEqual({ ok: true, data: null, status: 204 });
    expect(spy).toHaveBeenCalledWith("auth/password", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  });

  it("con 400 devuelve el motivo del servidor", async () => {
    mockResponse(Response.json({ message: WRONG_CURRENT_PASSWORD_MESSAGE }, { status: 400 }));

    const result = await changePassword(input);

    expect(result).toEqual({ ok: false, error: WRONG_CURRENT_PASSWORD_MESSAGE, status: 400 });
  });

  it("con 400 de validación une los mensajes del arreglo", async () => {
    mockResponse(
      Response.json(
        { message: ["La contraseña debe incluir minúscula, mayúscula y número."] },
        { status: 400 },
      ),
    );

    const result = await changePassword(input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("minúscula, mayúscula y número");
  });

  it("con 400 sin cuerpo asume que la contraseña actual no coincide", async () => {
    mockResponse(new Response("", { status: 400 }));

    const result = await changePassword(input);

    expect(result.ok === false && result.error).toBe(WRONG_CURRENT_PASSWORD_MESSAGE);
  });

  it("con 500 o sin conexión devuelve el error genérico", async () => {
    mockResponse(new Response("", { status: 500 }));
    expect(await changePassword(input)).toMatchObject({
      ok: false,
      error: CHANGE_PASSWORD_SERVER_ERROR,
    });

    vi.restoreAllMocks();
    mockResponse(new TypeError("Failed to fetch"));
    expect(await changePassword(input)).toMatchObject({
      ok: false,
      error: CHANGE_PASSWORD_SERVER_ERROR,
    });
  });
});
