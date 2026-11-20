import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import * as apiClient from "@/src/services/http/api-client";
import type { EnrolledMember, EnrollMemberInput } from "@/src/types/members";
import { EMAIL_TAKEN_MESSAGE, ENROLL_SERVER_ERROR, enrollMember } from "./members-service";

const input: EnrollMemberInput = {
  fullName: "Ana López",
  sex: "F",
  birthDate: "1998-04-12",
  email: "ana@correo.com",
};

const enrolled: EnrolledMember = {
  id: "7b0c2c1e-7d1f-4a43-9a52-0f8f3f7f3a10",
  memberCode: "GYM-000004",
  fullName: "Ana López",
  enrolledAt: "2026-11-18",
  temporaryPassword: "Ab3dE5gH7k",
};

function mockResponse(res: Response | Error) {
  const spy = vi.spyOn(apiClient, "apiFetch");
  if (res instanceof Error) spy.mockRejectedValue(res);
  else spy.mockResolvedValue(res);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

describe("enrollMember (POST /members)", () => {
  it("con 201 devuelve el código y la contraseña temporal, sin enviar el rol", async () => {
    const spy = mockResponse(Response.json(enrolled, { status: 201 }));

    const result = await enrollMember(input);

    expect(result).toEqual({ ok: true, data: enrolled, status: 201 });
    const [path, init] = spy.mock.calls[0];
    expect(path).toBe("members");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(input);
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("role");
  });

  it("con 409 devuelve el mensaje del correo repetido", async () => {
    mockResponse(Response.json({ message: "Ese correo ya está registrado." }, { status: 409 }));

    expect(await enrollMember(input)).toEqual({
      ok: false,
      error: EMAIL_TAKEN_MESSAGE,
      status: 409,
    });
  });

  it("con 400 devuelve el motivo del servidor", async () => {
    mockResponse(
      Response.json(
        { message: ["La fecha de nacimiento no puede ser futura."] },
        { status: 400 },
      ),
    );

    expect(await enrollMember(input)).toEqual({
      ok: false,
      error: "La fecha de nacimiento no puede ser futura.",
      status: 400,
    });
  });

  it("con 403 devuelve el mensaje de acceso denegado", async () => {
    mockResponse(Response.json({ message: "Forbidden" }, { status: 403 }));

    expect(await enrollMember(input)).toMatchObject({ error: ACCESS_DENIED_MESSAGE, status: 403 });
  });

  it("con 500 o sin conexión devuelve el error genérico", async () => {
    mockResponse(new Response("", { status: 500 }));
    expect(await enrollMember(input)).toMatchObject({ ok: false, error: ENROLL_SERVER_ERROR });

    vi.restoreAllMocks();
    mockResponse(new TypeError("Failed to fetch"));
    expect(await enrollMember(input)).toMatchObject({ ok: false, error: ENROLL_SERVER_ERROR });
  });
});
