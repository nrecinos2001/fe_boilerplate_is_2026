import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/src/services/http/api-client";
import {
  LOAD_HISTORY_ERROR,
  LOAD_MACHINES_ERROR,
  changeMachineStatus,
  fetchMachineAvailability,
  fetchMachineHistory,
  fetchMachines,
} from "./machines-service";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("machines-service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchMachines", () => {
    it("pide la página y el área, y devuelve el inventario", async () => {
      const page = { data: [], total: 0, page: 2, pageSize: 20 };
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json(page));

      await expect(fetchMachines(2, "CARDIO")).resolves.toEqual({ ok: true, data: page });
      expect(spy).toHaveBeenCalledWith("machines?page=2&area=CARDIO", undefined);
    });

    it("sin área no manda el filtro", async () => {
      const spy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValue(json({ data: [], total: 0, page: 1, pageSize: 20 }));

      await fetchMachines(1);
      expect(spy).toHaveBeenCalledWith("machines?page=1", undefined);
    });

    it("con un error del servidor devuelve el mensaje genérico", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ message: "boom" }, 500));

      await expect(fetchMachines(1)).resolves.toEqual({
        ok: false,
        error: LOAD_MACHINES_ERROR,
        status: 500,
      });
    });

    it("si la red falla devuelve el mensaje genérico", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(fetchMachines(1)).resolves.toMatchObject({
        ok: false,
        error: LOAD_MACHINES_ERROR,
      });
    });
  });

  describe("fetchMachineHistory", () => {
    it("devuelve las filas del historial", async () => {
      const entry = {
        fromStatus: "OPERATIONAL",
        toStatus: "UNDER_MAINTENANCE",
        reason: "Cambio de banda",
        changedBy: "admin@gymhub.test",
        changedAt: "2026-11-07T18:30:00.000Z",
      };
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ data: [entry] }));

      await expect(fetchMachineHistory(4)).resolves.toEqual({ ok: true, data: [entry] });
      expect(spy).toHaveBeenCalledWith("machines/4/status-history", undefined);
    });

    it("con 404 devuelve el mensaje del backend", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        json({ message: "No encontramos esa máquina." }, 404),
      );

      await expect(fetchMachineHistory(99)).resolves.toEqual({
        ok: false,
        error: "No encontramos esa máquina.",
        status: 404,
      });
    });

    it("sin cuerpo JSON usa el mensaje genérico", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(new Response("", { status: 403 }));

      await expect(fetchMachineHistory(1)).resolves.toMatchObject({ error: LOAD_HISTORY_ERROR });
    });
  });

  describe("changeMachineStatus", () => {
    it("manda el estado y el motivo recortado por PATCH", async () => {
      const result = {
        machineId: 3,
        status: "OUT_OF_SERVICE",
        changedAt: "2026-11-13T10:00:00.000Z",
        changedBy: "admin@gymhub.test",
      };
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json(result));

      await expect(changeMachineStatus(3, "OUT_OF_SERVICE", "  Motor roto  ")).resolves.toEqual({
        ok: true,
        data: result,
      });
      expect(spy).toHaveBeenCalledWith("machines/3/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "OUT_OF_SERVICE", reason: "Motor roto" }),
      });
    });

    it("con 409 devuelve el mensaje del backend", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        json({ message: "La máquina ya está en ese estado." }, 409),
      );

      await expect(changeMachineStatus(3, "OPERATIONAL", "Revisión")).resolves.toEqual({
        ok: false,
        error: "La máquina ya está en ese estado.",
        status: 409,
      });
    });

    it("con varios mensajes de validación los une", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        json({ message: ["Escribe el motivo del cambio.", "El estado no es válido."] }, 400),
      );

      await expect(changeMachineStatus(3, "OPERATIONAL", "")).resolves.toMatchObject({
        error: "Escribe el motivo del cambio. El estado no es válido.",
      });
    });
  });

  describe("fetchMachineAvailability", () => {
    it("manda solo los filtros elegidos", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ data: [] }));

      await fetchMachineAvailability({});
      expect(spy).toHaveBeenLastCalledWith("machines/availability", undefined);

      await fetchMachineAvailability({ area: "STRENGTH", status: "OUT_OF_SERVICE" });
      expect(spy).toHaveBeenLastCalledWith(
        "machines/availability?area=STRENGTH&status=OUT_OF_SERVICE",
        undefined,
      );
    });

    it("devuelve la lista de máquinas", async () => {
      const machines = [{ name: "Polea alta", area: "STRENGTH", status: "OPERATIONAL" }];
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({ data: machines }));

      await expect(fetchMachineAvailability({})).resolves.toEqual({ ok: true, data: machines });
    });

    it("con un error del servidor devuelve 'No pudimos cargar las máquinas.'", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(json({}, 503));

      await expect(fetchMachineAvailability({})).resolves.toMatchObject({
        ok: false,
        error: LOAD_MACHINES_ERROR,
      });
    });
  });
});
