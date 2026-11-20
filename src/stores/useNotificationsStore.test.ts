import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "@/src/services/notifications/notifications-service";
import { useNotificationsStore } from "./useNotificationsStore";

describe("useNotificationsStore", () => {
  beforeEach(() => {
    useNotificationsStore.setState({ unread: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("al marcar un aviso el contador baja en 1 y nunca queda negativo", () => {
    useNotificationsStore.getState().setUnread(2);
    useNotificationsStore.getState().decrementUnread();
    expect(useNotificationsStore.getState().unread).toBe(1);
    useNotificationsStore.getState().decrementUnread(5);
    expect(useNotificationsStore.getState().unread).toBe(0);
  });

  it("refreshUnread toma el valor del backend", async () => {
    vi.spyOn(service, "fetchUnreadCount").mockResolvedValue({ ok: true, data: 120 });

    await useNotificationsStore.getState().refreshUnread();
    expect(useNotificationsStore.getState().unread).toBe(120);
  });

  it("si la consulta falla conserva el valor anterior", async () => {
    useNotificationsStore.getState().setUnread(4);
    vi.spyOn(service, "fetchUnreadCount").mockResolvedValue({ ok: false, error: "x", status: 0 });

    await useNotificationsStore.getState().refreshUnread();
    expect(useNotificationsStore.getState().unread).toBe(4);
  });
});
