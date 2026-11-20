import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/src/services/http/api-client";
import type { PersonalSession, TrainerSlot, TrainerSummary } from "@/src/types/personal-sessions";
import {
  bookPersonalSession,
  fetchActiveTrainers,
  fetchMyPersonalSessions,
  fetchSessionPricing,
  fetchTrainerSlots,
} from "./personal-sessions-service";

const trainer: TrainerSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Carlos Entrenador",
  email: "carlos@gymhub.test",
};

const sampleSlot: TrainerSlot = {
  availabilityBlockId: "a0000000-0000-4000-8000-000000000001",
  date: "2026-11-23",
  startTime: "08:00",
  endTime: "09:00",
  startsAt: "2026-11-23T14:00:00.000Z",
  endsAt: "2026-11-23T15:00:00.000Z",
};

const sampleSession: PersonalSession = {
  id: 1,
  trainerId: trainer.id,
  trainer,
  memberId: "22222222-2222-4222-8222-222222222222",
  availabilityBlockId: sampleSlot.availabilityBlockId,
  startsAt: sampleSlot.startsAt,
  endsAt: sampleSlot.endsAt,
  price: 15,
  chargeId: 42,
  chargeStatus: "PENDING",
  status: "SCHEDULED",
  createdAt: "2026-11-18T10:00:00.000Z",
};

describe("personal-sessions-service (H11)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchActiveTrainers lee GET trainers con formato { data }", async () => {
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [trainer] }), { status: 200 }),
    );

    const result = await fetchActiveTrainers();

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([trainer]);
    expect(spy).toHaveBeenCalledWith("trainers");
  });

  it("fetchTrainerSlots nunca excede 14 días aunque reciba un rango mayor", async () => {
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          trainer,
          from: "2026-11-18T00:00:00.000Z",
          to: "2026-12-02T00:00:00.000Z",
          slots: [sampleSlot],
        }),
        { status: 200 },
      ),
    );

    const from = new Date("2026-11-18T00:00:00.000Z");
    const fifteenDaysLater = new Date("2026-12-03T00:00:00.000Z");
    const result = await fetchTrainerSlots(trainer.id, { from, to: fifteenDaysLater });

    expect(result.ok).toBe(true);
    expect(result.data?.slots).toHaveLength(1);

    const calledPath = spy.mock.calls[0][0];
    const url = new URL(`https://example.test/${calledPath}`);
    const sentFrom = new Date(url.searchParams.get("from")!);
    const sentTo = new Date(url.searchParams.get("to")!);
    expect(sentTo.getTime() - sentFrom.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("fetchTrainerSlots maneja AbortError sin reportar error", async () => {
    const abortErr = new Error("Aborted");
    abortErr.name = "AbortError";
    vi.spyOn(apiClient, "apiFetch").mockRejectedValue(abortErr);

    const result = await fetchTrainerSlots(trainer.id);

    expect(result.ok).toBe(false);
    expect(result.aborted).toBe(true);
    expect(result.code).toBe("ABORTED");
  });

  it("fetchSessionPricing lee tarifa configurada o sin configurar", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ configured: false, price: null }), { status: 200 }),
    );
    const unconfigured = await fetchSessionPricing();
    expect(unconfigured.ok).toBe(true);
    expect(unconfigured.data).toEqual({ configured: false, price: null });

    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ configured: true, price: 20 }), { status: 200 }),
    );
    const configured = await fetchSessionPricing();
    expect(configured.ok).toBe(true);
    expect(configured.data).toEqual({ configured: true, price: 20 });
  });

  it("bookPersonalSession envía únicamente { trainerId, startsAt } y maneja 201, 409, 400 y 503", async () => {
    const postSpy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
      new Response(JSON.stringify(sampleSession), { status: 201 }),
    );

    const success = await bookPersonalSession({
      trainerId: trainer.id,
      startsAt: sampleSlot.startsAt,
    });

    expect(success.ok).toBe(true);
    expect(success.data?.price).toBe(15);
    expect(success.data?.chargeId).toBe(42);
    expect(postSpy).toHaveBeenCalledWith("personal-sessions", {
      method: "POST",
      body: JSON.stringify({
        trainerId: trainer.id,
        startsAt: sampleSlot.startsAt,
      }),
    });

    // 409 horario tomado
    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Ese horario ya fue tomado." }), { status: 409 }),
    );
    const conflict = await bookPersonalSession({
      trainerId: trainer.id,
      startsAt: sampleSlot.startsAt,
    });
    expect(conflict.ok).toBe(false);
    expect(conflict.code).toBe("SLOT_ALREADY_TAKEN");
    expect(conflict.error).toBe("Ese horario ya fue tomado.");

    // 400 < 12h
    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: "Las sesiones se agendan con al menos 12 horas de anticipación.",
        }),
        { status: 400 },
      ),
    );
    const tooSoon = await bookPersonalSession({
      trainerId: trainer.id,
      startsAt: sampleSlot.startsAt,
    });
    expect(tooSoon.ok).toBe(false);
    expect(tooSoon.code).toBe("MIN_ADVANCE_REQUIRED");
    expect(tooSoon.error).toBe("Las sesiones se agendan con al menos 12 horas de anticipación.");

    // 503 tarifa no configurada
    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "El precio de la sesión personal aún no está configurado." }),
        { status: 503 },
      ),
    );
    const noPrice = await bookPersonalSession({
      trainerId: trainer.id,
      startsAt: sampleSlot.startsAt,
    });
    expect(noPrice.ok).toBe(false);
    expect(noPrice.code).toBe("PRICING_UNAVAILABLE");
    expect(noPrice.error).toContain("precio de la sesión personal no está configurado");
  });

  it("fetchMyPersonalSessions lee GET personal-sessions/me y propaga SessionExpiredError", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [sampleSession] }), { status: 200 }),
    );

    const okRes = await fetchMyPersonalSessions();
    expect(okRes.ok).toBe(true);
    expect(okRes.data?.[0].chargeStatus).toBe("PENDING");

    vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(
      new apiClient.SessionExpiredError(),
    );

    const expiredRes = await fetchMyPersonalSessions();
    expect(expiredRes.ok).toBe(false);
    expect(expiredRes.sessionExpired).toBe(true);
  });
});
