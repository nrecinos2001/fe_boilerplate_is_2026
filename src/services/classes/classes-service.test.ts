import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelMyReservation,
  createClass,
  fetchMemberClasses,
  fetchMyReservations,
  fetchTrainers,
  fetchWeeklyClasses,
  reserveClassSpot,
  updateClass,
} from "./classes-service";
import * as apiClient from "@/src/services/http/api-client";
import type { ClassReservation, GymClass } from "@/src/types/classes";

const mockClass: GymClass = {
  id: 1,
  name: "Spinning Matutino",
  trainerId: "11111111-1111-4111-8111-111111111111",
  trainer: {
    id: "11111111-1111-4111-8111-111111111111",
    fullName: "Entrenador Demo",
    email: "entrenador@gymhub.test",
  },
  startsAt: "2026-12-01T18:00:00.000Z",
  endsAt: "2026-12-01T18:50:00.000Z",
  capacity: 20,
  confirmedReservations: 12,
  spotsLeft: 8,
  status: "SCHEDULED",
  createdAt: "2026-11-08T20:00:00.000Z",
  updatedAt: "2026-11-08T20:00:00.000Z",
};

const mockReservation: ClassReservation = {
  id: 50,
  classId: 1,
  memberId: "22222222-2222-4222-8222-222222222222",
  status: "CONFIRMED",
  cancelledAt: null,
  createdAt: "2026-11-18T10:00:00.000Z",
  gymClass: {
    id: 1,
    name: "Spinning Matutino",
    trainerId: "11111111-1111-4111-8111-111111111111",
    trainer: {
      id: "11111111-1111-4111-8111-111111111111",
      fullName: "Entrenador Demo",
      email: "entrenador@gymhub.test",
    },
    startsAt: "2026-12-01T18:00:00.000Z",
    endsAt: "2026-12-01T18:50:00.000Z",
    capacity: 20,
    confirmedReservations: 13,
    spotsLeft: 7,
    status: "SCHEDULED",
  },
};

describe("classes-service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("cancelMyReservation", () => {
    it("envía solo el id y devuelve el estado actualizado", async () => {
      const cancelled = { ...mockReservation, status: "CANCELLED", cancelledAt: "2026-11-18T11:00:00.000Z" };
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify(cancelled), { status: 200 }),
      );
      const result = await cancelMyReservation(50);
      expect(spy).toHaveBeenCalledWith("classes/reservations/50/cancel", { method: "PATCH" });
      expect(result.data?.status).toBe("CANCELLED");
    });

    it("muestra el mensaje del backend cuando se vence el plazo", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify({ message: "Solo puedes cancelar hasta 2 horas antes de la clase." }), { status: 409 }),
      );
      const result = await cancelMyReservation(50);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error).toBe("Solo puedes cancelar hasta 2 horas antes de la clase.");
    });
  });

  describe("fetchWeeklyClasses", () => {
    it("obtiene las clases de la semana mediante apiFetch", async () => {
      const apiFetchSpy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify([mockClass]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const from = new Date("2026-12-01T00:00:00.000Z");
      const to = new Date("2026-12-07T23:59:59.000Z");

      const result = await fetchWeeklyClasses(from, to);

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe("Spinning Matutino");
      expect(apiFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("classes?from="),
      );
    });

    it("maneja error en la respuesta del backend sin lanzar excepción", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(
          JSON.stringify({ message: "Error al consultar clases." }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      );

      const result = await fetchWeeklyClasses(new Date(), new Date());

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Error al consultar clases.");
      expect(result.status).toBe(500);
    });
  });

  describe("createClass", () => {
    it("programa una clase con éxito (HTTP 201)", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify(mockClass), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const input = {
        name: "Spinning Matutino",
        trainerId: "11111111-1111-4111-8111-111111111111",
        startsAt: "2026-12-01T18:00:00.000Z",
        endsAt: "2026-12-01T18:50:00.000Z",
        capacity: 20,
      };

      const result = await createClass(input);

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe("SCHEDULED");
    });

    it("captura conflicto HTTP 409 por cruce de horario y devuelve el error para el formulario sin cerrarlo", async () => {
      const conflictMsg =
        'El entrenador ya tiene asignada la clase "Spinning 18:00" (18:00 a 18:50) que se cruza con ese horario.';

      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify({ message: conflictMsg }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const input = {
        name: "Spinning Tarde",
        trainerId: "11111111-1111-4111-8111-111111111111",
        startsAt: "2026-12-01T18:30:00.000Z",
        endsAt: "2026-12-01T19:20:00.000Z",
        capacity: 20,
      };

      const result = await createClass(input);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error).toBe(conflictMsg);
    });
  });

  describe("updateClass", () => {
    it("captura conflicto HTTP 409 al intentar reducir cupo por debajo de reservas confirmadas", async () => {
      const capacityConflictMsg =
        "El cupo no puede ser menor a las 12 reservas confirmadas.";

      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify({ message: capacityConflictMsg }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await updateClass(1, { capacity: 10 });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error).toBe(capacityConflictMsg);
    });

    it("actualiza el cupo con éxito cuando es igual o mayor a reservas confirmadas", async () => {
      const updatedClass = { ...mockClass, capacity: 15 };
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify(updatedClass), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await updateClass(1, { capacity: 15 });

      expect(result.ok).toBe(true);
      expect(result.data?.capacity).toBe(15);
    });
  });

  describe("fetchTrainers", () => {
    it("obtiene la lista de entrenadores filtrando por rol TRAINER", async () => {
      const staffResponse = {
        data: [
          {
            id: "t1",
            fullName: "Entrenador Uno",
            email: "entrenador1@gymhub.test",
            role: "TRAINER",
            isActive: true,
          },
          {
            id: "r1",
            fullName: "Recepcionista Uno",
            email: "recepcion@gymhub.test",
            role: "RECEPTION",
            isActive: true,
          },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      };

      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify(staffResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const trainers = await fetchTrainers();

      expect(trainers).toHaveLength(1);
      expect(trainers[0].fullName).toBe("Entrenador Uno");
    });
  });

  describe("H07 · fetchMemberClasses", () => {
    it("consulta un rango exacto de 7 días y filtra solo clases SCHEDULED", async () => {
      const cancelledClass: GymClass = {
        ...mockClass,
        id: 2,
        name: "Clase Cancelada",
        status: "CANCELLED",
      };

      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify([mockClass, cancelledClass]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const now = new Date("2026-11-18T12:00:00.000Z");
      const result = await fetchMemberClasses(now);

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe(1);

      const calledPath = spy.mock.calls[0][0];
      const url = new URL(`https://example.test/${calledPath}`);
      const from = new Date(url.searchParams.get("from")!);
      const to = new Date(url.searchParams.get("to")!);
      expect(to.getTime() - from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("rechaza de forma segura una respuesta inesperada sin romper la página", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
      );

      const result = await fetchMemberClasses();

      expect(result.ok).toBe(false);
      expect(result.code).toBe("UNEXPECTED_RESPONSE");
    });

    it("propaga estado sessionExpired ante SessionExpiredError (401)", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValue(
        new apiClient.SessionExpiredError(),
      );

      const result = await fetchMemberClasses();

      expect(result.ok).toBe(false);
      expect(result.sessionExpired).toBe(true);
      expect(result.code).toBe("SESSION_EXPIRED");
    });
  });

  describe("H07 · reserveClassSpot", () => {
    it("envía POST sin memberId en el cuerpo y devuelve la reserva confirmada", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify(mockReservation), { status: 201 }),
      );

      const result = await reserveClassSpot(1);

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe(50);
      expect(spy).toHaveBeenCalledWith("classes/1/reservations", {
        method: "POST",
      });
    });

    it("mapea 409 CLASS_FULL con código y mensaje exacto", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 409,
            code: "CLASS_FULL",
            message: "La clase está llena.",
          }),
          { status: 409 },
        ),
      );

      const result = await reserveClassSpot(1);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(409);
      expect(result.code).toBe("CLASS_FULL");
      expect(result.error).toBe("La clase está llena.");
    });

    it("mapea 409 reserva duplicada", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(
          JSON.stringify({ message: "Ya tienes una reserva en esta clase." }),
          { status: 409 },
        ),
      );

      const result = await reserveClassSpot(1);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("ALREADY_RESERVED");
      expect(result.error).toBe("Ya tienes una reserva en esta clase.");
    });

    it("mapea 403 membresía inactiva y 403 clase suelta", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "Necesitas una membresía activa para reservar." }),
          { status: 403 },
        ),
      );

      const inactiveRes = await reserveClassSpot(1);
      expect(inactiveRes.ok).toBe(false);
      expect(inactiveRes.code).toBe("MEMBERSHIP_INACTIVE");
      expect(inactiveRes.error).toBe("Necesitas una membresía activa para reservar.");

      vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "La clase suelta se compra en recepción y no permite reservar.",
          }),
          { status: 403 },
        ),
      );

      const dropInRes = await reserveClassSpot(1);
      expect(dropInRes.ok).toBe(false);
      expect(dropInRes.code).toBe("DROP_IN_NOT_ALLOWED");
      expect(dropInRes.error).toBe(
        "La clase suelta se compra en recepción y no permite reservar.",
      );
    });

    it("mapea 503 proveedor de membresías no disponible sin éxito falso", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            message:
              "La verificación de membresías todavía no está disponible (pendiente H04 / BE-4.3).",
          }),
          { status: 503 },
        ),
      );

      const result = await reserveClassSpot(1);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(503);
      expect(result.code).toBe("MEMBERSHIP_UNAVAILABLE");
      expect(result.error).toContain("temporalmente indisponible");
    });

    it("maneja respuesta 201 malformada sin mostrar éxito falso", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response("not-json", { status: 201 }),
      );

      const result = await reserveClassSpot(1);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("UNEXPECTED_RESPONSE");
    });
  });

  describe("H07 · fetchMyReservations", () => {
    it("lee { data: [...] } de GET classes/reservations/me", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify({ data: [mockReservation] }), { status: 200 }),
      );

      const result = await fetchMyReservations();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].status).toBe("CONFIRMED");
      expect(spy).toHaveBeenCalledWith("classes/reservations/me");
    });

    it("rechaza payload sin arreglo data", async () => {
      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
        new Response(JSON.stringify([mockReservation]), { status: 200 }),
      );

      const result = await fetchMyReservations();

      expect(result.ok).toBe(false);
      expect(result.code).toBe("UNEXPECTED_RESPONSE");
    });
  });
});
