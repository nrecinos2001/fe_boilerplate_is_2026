import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleNavigationLinks } from "@/src/components/dashboard/role-navigation";
import { MemberAccessBoundary } from "@/src/components/member/member-role-guard";
import type { AuthUser } from "@/src/types/auth";
import type {
  PersonalSession,
  TrainerSlot,
  TrainerSummary,
} from "@/src/types/personal-sessions";
import {
  BookPersonalSessionPanel,
  PRICING_UNAVAILABLE_BANNER,
} from "./book-personal-session-view";
import {
  EMPTY_SESSIONS_MESSAGE,
  MySessionsPanel,
} from "./my-sessions-view";
import {
  groupTrainerSlotsByDate,
  LatestTrainerSlotsCoordinator,
  partitionPersonalSessions,
  runBookPersonalSessionFlow,
} from "./personal-sessions-logic";

const memberUser: AuthUser = {
  id: "m1",
  email: "miembro@gymhub.test",
  fullName: "Ana Miembro",
  role: "MEMBER",
  mustChangePassword: false,
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const adminUser: AuthUser = {
  ...memberUser,
  id: "a1",
  role: "ADMIN",
  fullName: "Admin Gym",
};

const trainerA: TrainerSummary = {
  id: "t1",
  fullName: "Carlos Rivas",
  email: "carlos@gymhub.test",
};

const slot1: TrainerSlot = {
  availabilityBlockId: "b1",
  date: "2026-11-23",
  startTime: "10:00",
  endTime: "11:00",
  startsAt: "2026-11-23T16:00:00.000Z",
  endsAt: "2026-11-23T17:00:00.000Z",
};

const slot2: TrainerSlot = {
  availabilityBlockId: "b1",
  date: "2026-11-23",
  startTime: "08:00",
  endTime: "09:00",
  startsAt: "2026-11-23T14:00:00.000Z",
  endsAt: "2026-11-23T15:00:00.000Z",
};

const slotDay2: TrainerSlot = {
  availabilityBlockId: "b2",
  date: "2026-11-24",
  startTime: "09:00",
  endTime: "10:00",
  startsAt: "2026-11-24T15:00:00.000Z",
  endsAt: "2026-11-24T16:00:00.000Z",
};

function makeSession(overrides: Partial<PersonalSession> = {}): PersonalSession {
  return {
    id: 1,
    trainerId: trainerA.id,
    trainer: trainerA,
    memberId: "m1",
    availabilityBlockId: "b1",
    startsAt: "2026-11-23T14:00:00.000Z",
    endsAt: "2026-11-23T15:00:00.000Z",
    price: 15,
    chargeId: 42,
    chargeStatus: "PENDING",
    status: "SCHEDULED",
    createdAt: "2026-11-18T10:00:00.000Z",
    ...overrides,
  };
}

const noop = () => undefined;

describe("Navegación y control de rol (H11)", () => {
  it("MEMBER ve enlaces de sesiones personales y nunca /classes ADMIN", () => {
    const html = renderToStaticMarkup(
      <RoleNavigationLinks status="authenticated" role="MEMBER" />,
    );
    expect(html).toContain("/miembro/sesiones/agendar");
    expect(html).toContain("/miembro/sesiones");
    expect(html).not.toContain('href="/classes"');
  });

  it("ADMIN ve /classes y nunca enlaces de sesiones del miembro", () => {
    const html = renderToStaticMarkup(
      <RoleNavigationLinks status="authenticated" role="ADMIN" />,
    );
    expect(html).toContain('href="/classes"');
    expect(html).not.toContain("/miembro/sesiones");
  });

  it("MemberAccessBoundary restringe a no-MEMBER y permite a MEMBER", () => {
    const denied = renderToStaticMarkup(
      <MemberAccessBoundary status="authenticated" user={adminUser}>
        <div>Agenda privada</div>
      </MemberAccessBoundary>,
    );
    expect(denied).toContain("Acceso restringido");
    expect(denied).not.toContain("Agenda privada");

    const allowed = renderToStaticMarkup(
      <MemberAccessBoundary status="authenticated" user={memberUser}>
        <div>Agenda privada</div>
      </MemberAccessBoundary>,
    );
    expect(allowed).toContain("Agenda privada");
  });
});

describe("FE-11.1 · Selector, espacios de 60 min y agendamiento", () => {
  it("agrupa espacios por date y ordena por hora", () => {
    const grouped = groupTrainerSlotsByDate([slot1, slotDay2, slot2]);

    expect(grouped.map((g) => g.date)).toEqual(["2026-11-23", "2026-11-24"]);
    expect(grouped[0].slots.map((s) => s.startTime)).toEqual(["08:00", "10:00"]);
  });

  it("informa tarifa no configurada sin inventar monto y bloquea confirmación", () => {
    const html = renderToStaticMarkup(
      <BookPersonalSessionPanel
        trainers={[trainerA]}
        selectedTrainerId={trainerA.id}
        slots={[slot2]}
        selectedSlot={slot2}
        pricing={{ configured: false, price: null }}
        initialLoading={false}
        slotsLoading={false}
        loadError={null}
        slotsError={null}
        sessionExpired={false}
        submitting={false}
        bookingError={null}
        bookedConfirmation={null}
        onSelectTrainer={noop}
        onSelectSlot={noop}
        onConfirmBooking={noop}
        onRetryInitial={noop}
        onRetrySlots={noop}
        onDismissFeedback={noop}
      />,
    );

    expect(html).toContain(PRICING_UNAVAILABLE_BANNER);
    expect(html).toMatch(/disabled[^>]*>Tarifa no configurada/);
  });

  it("muestra resumen previo y confirmación real con precio, cobro y enlace a Mis sesiones", () => {
    const booked = makeSession({ price: 25, chargeId: 88, chargeStatus: "PENDING" });
    const html = renderToStaticMarkup(
      <BookPersonalSessionPanel
        trainers={[trainerA]}
        selectedTrainerId={trainerA.id}
        slots={[slot2]}
        selectedSlot={slot2}
        pricing={{ configured: true, price: 25 }}
        initialLoading={false}
        slotsLoading={false}
        loadError={null}
        slotsError={null}
        sessionExpired={false}
        submitting={false}
        bookingError={null}
        bookedConfirmation={booked}
        onSelectTrainer={noop}
        onSelectSlot={noop}
        onConfirmBooking={noop}
        onRetryInitial={noop}
        onRetrySlots={noop}
        onDismissFeedback={noop}
      />,
    );

    expect(html).toContain("Duración: 60 min");
    expect(html).toContain("60 minutos");
    expect(html).toContain("$25.00");
    expect(html).toContain("Cobro #88");
    expect(html).toContain("Pendiente de pago");
    expect(html).toContain('href="/miembro/sesiones"');
  });

  it("LatestTrainerSlotsCoordinator descarta respuestas viejas al cambiar de entrenador", () => {
    const coordinator = new LatestTrainerSlotsCoordinator();
    const reqTrainerA = coordinator.nextRequestId();
    const reqTrainerB = coordinator.nextRequestId();

    expect(coordinator.isLatest(reqTrainerA)).toBe(false);
    expect(coordinator.isLatest(reqTrainerB)).toBe(true);
  });

  it("previene doble clic y tras 409 remueve el horario tomado y recarga disponibilidad", async () => {
    let resolveBooking!: (val: { ok: boolean; data?: PersonalSession }) => void;
    const bookMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; data?: PersonalSession }>((r) => {
          resolveBooking = r;
        }),
    );
    const reloadSlotsMock = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        trainer: trainerA,
        from: "2026-11-18T00:00:00.000Z",
        to: "2026-12-02T00:00:00.000Z",
        slots: [slot1],
      },
    });
    const inFlight = { current: false };

    const first = runBookPersonalSessionFlow(
      { trainerId: trainerA.id, startsAt: slot2.startsAt },
      [slot2, slot1],
      inFlight,
      { book: bookMock, reloadSlots: reloadSlotsMock },
    );
    const duplicateClick = await runBookPersonalSessionFlow(
      { trainerId: trainerA.id, startsAt: slot2.startsAt },
      [slot2, slot1],
      inFlight,
      { book: bookMock, reloadSlots: reloadSlotsMock },
    );

    expect(duplicateClick.ignoredAsDuplicateInFlight).toBe(true);
    expect(bookMock).toHaveBeenCalledTimes(1);

    resolveBooking({ ok: true, data: makeSession() });
    const firstResult = await first;
    expect(firstResult.ok).toBe(true);
    expect(firstResult.refreshedSlots).toEqual([slot1]);

    // Probar 409 -> remueve el slot tomado incluso si recarga lo trajera y vuelve a consultar
    const reloadAfter409 = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        trainer: trainerA,
        from: "2026-11-18T00:00:00.000Z",
        to: "2026-12-02T00:00:00.000Z",
        slots: [slot1],
      },
    });

    const conflictOutcome = await runBookPersonalSessionFlow(
      { trainerId: trainerA.id, startsAt: slot2.startsAt },
      [slot2, slot1],
      inFlight,
      {
        book: vi.fn().mockResolvedValue({
          ok: false,
          status: 409,
          code: "SLOT_ALREADY_TAKEN",
          error: "Ese horario ya fue tomado.",
        }),
        reloadSlots: reloadAfter409,
      },
    );

    expect(conflictOutcome.ok).toBe(false);
    expect(conflictOutcome.errorMessage).toBe("Ese horario ya fue tomado.");
    expect(conflictOutcome.clearSelectedSlot).toBe(true);
    expect(reloadAfter409).toHaveBeenCalledWith(trainerA.id);
    expect(conflictOutcome.refreshedSlots?.some((s) => s.startsAt === slot2.startsAt)).toBe(false);
  });
});

describe("FE-11.2 · Mis sesiones", () => {
  it("ordena próximas y pasadas, traduce estados y NO incluye botón de cancelación", () => {
    const nowMs = new Date("2026-11-20T12:00:00.000Z").getTime();
    const pastSession = makeSession({
      id: 1,
      status: "COMPLETED",
      chargeStatus: "PAID",
      price: 15,
      startsAt: "2026-11-18T14:00:00.000Z",
      endsAt: "2026-11-18T15:00:00.000Z",
    });
    const farFuture = makeSession({
      id: 2,
      status: "SCHEDULED",
      chargeStatus: "PENDING",
      price: 20,
      startsAt: "2026-11-28T14:00:00.000Z",
      endsAt: "2026-11-28T15:00:00.000Z",
    });
    const soonFuture = makeSession({
      id: 3,
      status: "SCHEDULED",
      chargeStatus: "PENDING",
      price: 20,
      startsAt: "2026-11-21T14:00:00.000Z",
      endsAt: "2026-11-21T15:00:00.000Z",
    });

    const { upcoming, past } = partitionPersonalSessions(
      [pastSession, farFuture, soonFuture],
      nowMs,
    );
    expect(upcoming.map((s) => s.id)).toEqual([3, 2]);
    expect(past.map((s) => s.id)).toEqual([1]);

    const html = renderToStaticMarkup(
      <MySessionsPanel
        sessions={[pastSession, farFuture, soonFuture]}
        loading={false}
        error={null}
        sessionExpired={false}
        nowMs={nowMs}
        onRetry={noop}
      />,
    );

    expect(html).toContain("Programada");
    expect(html).toContain("Completada");
    expect(html).toContain("Pendiente de pago");
    expect(html).toContain("Pagado");
    expect(html).toContain("$15.00");
    expect(html).toContain("$20.00");
    expect(html).not.toContain("Cancelar sesión");
    expect(html).not.toContain("Cancelar");
  });

  it("muestra estados de carga, vacío, error y sesión expirada", () => {
    const nowMs = new Date("2026-11-20T12:00:00.000Z").getTime();

    expect(
      renderToStaticMarkup(
        <MySessionsPanel
          sessions={[]}
          loading
          error={null}
          sessionExpired={false}
          nowMs={nowMs}
          onRetry={noop}
        />,
      ),
    ).toContain("Cargando tus sesiones personales...");

    expect(
      renderToStaticMarkup(
        <MySessionsPanel
          sessions={[]}
          loading={false}
          error={null}
          sessionExpired={false}
          nowMs={nowMs}
          onRetry={noop}
        />,
      ),
    ).toContain(EMPTY_SESSIONS_MESSAGE);

    const errHtml = renderToStaticMarkup(
      <MySessionsPanel
        sessions={[]}
        loading={false}
        error="Error del servidor"
        sessionExpired={false}
        nowMs={nowMs}
        onRetry={noop}
      />,
    );
    expect(errHtml).toContain("Error del servidor");
    expect(errHtml).toContain("Reintentar");

    expect(
      renderToStaticMarkup(
        <MySessionsPanel
          sessions={[]}
          loading={false}
          error={null}
          sessionExpired
          nowMs={nowMs}
          onRetry={noop}
        />,
      ),
    ).toContain("Tu sesión expiró.");
  });
});
