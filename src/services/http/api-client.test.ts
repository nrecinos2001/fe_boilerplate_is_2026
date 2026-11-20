import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, SessionExpiredError, setOnSessionExpired } from "./api-client";
import { REFRESH_ENDPOINT } from "@/src/services/auth/refresh-session";
import { useAuthStore } from "@/src/stores/useAuthStore";
import type { ClientSession } from "@/src/types/auth";

const user = {
  id: "u1",
  email: "admin@gymhub.test",
  fullName: "Admin",
  role: "ADMIN" as const,
  mustChangePassword: false,
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
};

function session(accessToken: string): ClientSession {
  return { accessToken, expiresIn: 900, user };
}

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) =>
    handler(String(input), init),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

const authHeader = (init: RequestInit) => new Headers(init.headers).get("Authorization");
const refreshCalls = (fn: ReturnType<typeof mockFetch>) =>
  fn.mock.calls.filter(([url]) => String(url) === REFRESH_ENDPOINT).length;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const tick = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => {
  useAuthStore.setState({ status: "authenticated", accessToken: "expired", user });
  setOnSessionExpired(vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch + refresh", () => {
  it("5 solicitudes con 401 a la vez producen un solo POST /auth/refresh", async () => {
    const fetchMock = mockFetch(async (url, init) => {
      if (url === REFRESH_ENDPOINT) {
        await tick(); // el refresh tarda: las 5 solicitudes llegan antes de que termine
        return json(session("fresh"));
      }
      return authHeader(init) === "Bearer fresh" ? json({ ok: true }) : json({}, 401);
    });

    const responses = await Promise.all(
      ["a", "b", "c", "d", "e"].map((p) => apiFetch(`/classes/${p}`)),
    );

    expect(refreshCalls(fetchMock)).toBe(1);
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe("fresh");
    // 5 originales + 1 refresh + 5 reintentos
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  it("un 401 que llega después de otro refresh reintenta con el token nuevo sin refrescar de nuevo", async () => {
    let releaseSlow!: () => void;
    const slowGate = new Promise<void>((r) => (releaseSlow = r));

    const fetchMock = mockFetch(async (url, init) => {
      if (url === REFRESH_ENDPOINT) return json(session("fresh"));
      if (authHeader(init) === "Bearer fresh") return json({ ok: true });
      if (url.endsWith("/slow")) await slowGate; // vuelve con 401 cuando el refresh ya terminó
      return json({}, 401);
    });

    const slow = apiFetch("/slow");
    await apiFetch("/fast"); // dispara y completa el refresh
    releaseSlow();
    const res = await slow;

    expect(res.status).toBe(200);
    expect(refreshCalls(fetchMock)).toBe(1);
  });

  it("si el refresh token es inválido limpia la sesión y avisa", async () => {
    const onExpired = vi.fn();
    setOnSessionExpired(onExpired);
    mockFetch(() => json({}, 401));

    await expect(apiFetch("/me")).rejects.toBeInstanceOf(SessionExpiredError);
    expect(onExpired).toHaveBeenCalledOnce();
    expect(useAuthStore.getState()).toMatchObject({
      status: "unauthenticated",
      accessToken: null,
      user: null,
    });
  });

  it("sin token en memoria (recarga) rehidrata con refresh antes de la solicitud", async () => {
    useAuthStore.setState({ status: "loading", accessToken: null, user: null });
    const fetchMock = mockFetch((url, init) =>
      url === REFRESH_ENDPOINT
        ? json(session("rehydrated"))
        : json({ auth: authHeader(init) }),
    );

    const res = await apiFetch("/auth/me");

    expect(await res.json()).toEqual({ auth: "Bearer rehydrated" });
    expect(refreshCalls(fetchMock)).toBe(1);
    expect(useAuthStore.getState().user?.role).toBe("ADMIN");
  });

  it("enruta por el proxy de Next con el Bearer del store", async () => {
    useAuthStore.setState({ accessToken: "valid" });
    const fetchMock = mockFetch(() => json({}));

    await apiFetch("/classes?week=1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/classes?week=1");
    expect(authHeader(init!)).toBe("Bearer valid");
  });
});

describe("useAuthStore", () => {
  it("nunca escribe el access token en localStorage ni sessionStorage", () => {
    const storage = () => ({ setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() });
    const local = storage();
    const sessionStore = storage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", sessionStore);

    useAuthStore.getState().setSession(session("secret-token"));
    useAuthStore.getState().clearSession();

    expect(local.setItem).not.toHaveBeenCalled();
    expect(sessionStore.setItem).not.toHaveBeenCalled();
  });
});
