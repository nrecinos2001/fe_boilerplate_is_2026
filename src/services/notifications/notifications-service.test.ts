import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/src/services/http/api-client";
import {
  LOAD_INBOX_ERROR,
  LOAD_UNREAD_ERROR,
  MARK_ALL_READ_ERROR,
  MARK_READ_ERROR,
  fetchInbox,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications-service";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const noContent = () => new Response(null, { status: 204 });

describe("notifications-service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchInbox", () => {
    it("pide la página y devuelve los avisos", async () => {
      const page = {
        data: [
          {
            id: 1,
            title: "Clase cancelada",
            message: "La clase de Yoga fue cancelada.",
            source: "CLASSES",
            createdAt: "2026-11-13T14:30:00.000Z",
            isRead: false,
          },
        ],
        total: 1,
        page: 2,
        pageSize: 20,
      };
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json(page));

      await expect(fetchInbox(2)).resolves.toEqual({ ok: true, data: page });
      expect(spy).toHaveBeenCalledWith("notifications/me?page=2");
    });

    it("con un 400 devuelve el mensaje del backend", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        json({ message: ["La página debe ser 1 o mayor."] }, 400),
      );

      await expect(fetchInbox(0)).resolves.toEqual({
        ok: false,
        error: "La página debe ser 1 o mayor.",
        status: 400,
      });
    });

    it("con un error del servidor devuelve el mensaje genérico", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ message: "boom" }, 500));

      await expect(fetchInbox(1)).resolves.toEqual({ ok: false, error: LOAD_INBOX_ERROR, status: 500 });
    });

    it("sin conexión devuelve el mensaje genérico", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(fetchInbox(1)).resolves.toEqual({ ok: false, error: LOAD_INBOX_ERROR, status: 0 });
    });
  });

  describe("fetchUnreadCount", () => {
    it("devuelve el número de avisos sin leer", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ unread: 7 }));

      await expect(fetchUnreadCount()).resolves.toEqual({ ok: true, data: 7 });
      expect(spy).toHaveBeenCalledWith("notifications/me/unread-count");
    });

    it("si falla devuelve el error", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({}, 503));

      await expect(fetchUnreadCount()).resolves.toEqual({ ok: false, error: LOAD_UNREAD_ERROR, status: 503 });
    });
  });

  describe("markNotificationRead", () => {
    it("manda un PATCH y acepta el 204 sin cuerpo", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(noContent());

      await expect(markNotificationRead(12)).resolves.toEqual({ ok: true, data: null });
      expect(spy).toHaveBeenCalledWith("notifications/12/read", { method: "PATCH" });
    });

    it("un aviso de otra persona devuelve el 404 del backend", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ message: "No encontramos ese aviso." }, 404));

      await expect(markNotificationRead(99)).resolves.toEqual({
        ok: false,
        error: "No encontramos ese aviso.",
        status: 404,
      });
    });

    it("sin conexión devuelve el mensaje genérico", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(markNotificationRead(1)).resolves.toEqual({ ok: false, error: MARK_READ_ERROR, status: 0 });
    });
  });

  describe("markAllNotificationsRead", () => {
    it("manda un PATCH a read-all", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(noContent());

      await expect(markAllNotificationsRead()).resolves.toEqual({ ok: true, data: null });
      expect(spy).toHaveBeenCalledWith("notifications/me/read-all", { method: "PATCH" });
    });

    it("con un error del servidor devuelve el mensaje genérico", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ message: "boom" }, 500));

      await expect(markAllNotificationsRead()).resolves.toEqual({
        ok: false,
        error: MARK_ALL_READ_ERROR,
        status: 500,
      });
    });
  });
});
