import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleNavigationLinks } from "@/src/components/dashboard/role-navigation";
import { MemberAccessBoundary } from "@/src/components/member/member-role-guard";
import type { AuthUser } from "@/src/types/auth";
import type { ClassReservation, GymClass } from "@/src/types/classes";
import {
  groupMemberClassesByDay,
  partitionReservations,
  runReserveClassFlow,
} from "./member-classes-logic";
import {
  EMPTY_MEMBER_CLASSES_MESSAGE,
  MemberClassesPanel,
} from "./member-classes-view";
import {
  canCancelReservation,
  EMPTY_RESERVATIONS_MESSAGE,
  MyReservationsPanel,
} from "./my-reservations-view";

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

function makeClass(overrides: Partial<GymClass> = {}): GymClass {
  return {
    id: 1,
    name: "Yoga Flow",
    trainerId: "t1",
    trainer: { id: "t1", fullName: "Laura Entrenadora", email: "laura@gymhub.test" },
    startsAt: "2026-12-01T15:00:00.000Z", // 09:00 en El Salvador
    endsAt: "2026-12-01T15:50:00.000Z", // 09:50 en El Salvador
    capacity: 15,
    confirmedReservations: 5,
    spotsLeft: 10,
    status: "SCHEDULED",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeReservation(overrides: Partial<ClassReservation> = {}): ClassReservation {
  return {
    id: 10,
    classId: 1,
    memberId: "m1",
    status: "CONFIRMED",
    cancelledAt: null,
    createdAt: "2026-11-10T00:00:00.000Z",
    gymClass: {
      id: 1,
      name: "Yoga Flow",
      trainerId: "t1",
      trainer: { id: "t1", fullName: "Laura Entrenadora", email: "laura@gymhub.test" },
      startsAt: "2026-12-01T15:00:00.000Z",
      endsAt: "2026-12-01T15:50:00.000Z",
      capacity: 15,
      confirmedReservations: 6,
      spotsLeft: 9,
      status: "SCHEDULED",
    },
    ...overrides,
  };
}

const noop = () => undefined;

describe("Navegación y control de rol (H07)", () => {
  it("MEMBER ve enlaces a Clases grupales y Mis reservas, pero nunca a /classes ADMIN", () => {
    const html = renderToStaticMarkup(
      <RoleNavigationLinks status="authenticated" role="MEMBER" />,
    );
    expect(html).toContain("/miembro/clases");
    expect(html).toContain("/miembro/reservas");
    expect(html).not.toContain('href="/classes"');
  });

  it("ADMIN ve enlace a /classes y nunca acciones exclusivas de MEMBER", () => {
    const html = renderToStaticMarkup(
      <RoleNavigationLinks status="authenticated" role="ADMIN" />,
    );
    expect(html).toContain('href="/classes"');
    expect(html).not.toContain("/miembro/clases");
    expect(html).not.toContain("/miembro/reservas");
  });

  it("MemberAccessBoundary bloquea a ADMIN y permite MEMBER", () => {
    const blockedHtml = renderToStaticMarkup(
      <MemberAccessBoundary status="authenticated" user={adminUser}>
        <div>Contenido privado</div>
      </MemberAccessBoundary>,
    );
    expect(blockedHtml).toContain("Acceso restringido");
    expect(blockedHtml).not.toContain("Contenido privado");

    const allowedHtml = renderToStaticMarkup(
      <MemberAccessBoundary status="authenticated" user={memberUser}>
        <div>Contenido privado</div>
      </MemberAccessBoundary>,
    );
    expect(allowedHtml).toContain("Contenido privado");
  });
});

describe("FE-7.1 · Calendario del miembro y reserva", () => {
  it("agrupa por día en America/El_Salvador y ordena por hora", () => {
    const lateSvClass = makeClass({
      id: 1,
      name: "Boxeo Nocturno",
      startsAt: "2026-12-01T02:00:00.000Z", // 30 nov 20:00 SV
      endsAt: "2026-12-01T02:50:00.000Z",
    });
    const morningNextDay = makeClass({
      id: 2,
      name: "Spinning 07:00",
      startsAt: "2026-12-01T13:00:00.000Z", // 01 dic 07:00 SV
      endsAt: "2026-12-01T13:50:00.000Z",
    });
    const eveningNextDay = makeClass({
      id: 3,
      name: "CrossFit 18:00",
      startsAt: "2026-12-02T00:00:00.000Z", // 01 dic 18:00 SV
      endsAt: "2026-12-02T00:50:00.000Z",
    });

    const groups = groupMemberClassesByDay([eveningNextDay, morningNextDay, lateSvClass]);
    expect(groups.map((g) => g.dateKey)).toEqual(["2026-11-30", "2026-12-01"]);
    expect(groups[1].classes.map((c) => c.name)).toEqual(["Spinning 07:00", "CrossFit 18:00"]);
  });

  it("muestra estados de carga, vacío, error y sesión expirada", () => {
    const nowMs = new Date("2026-11-20T12:00:00.000Z").getTime();
    const loadingHtml = renderToStaticMarkup(
      <MemberClassesPanel
        classes={[]}
        myReservations={[]}
        loading
        loadError={null}
        sessionExpired={false}
        reservingClassId={null}
        feedback={null}
        nowMs={nowMs}
        onReserve={noop}
        onRetry={noop}
        onDismissFeedback={noop}
      />,
    );
    expect(loadingHtml).toContain("Cargando clases disponibles...");

    const emptyHtml = renderToStaticMarkup(
      <MemberClassesPanel
        classes={[]}
        myReservations={[]}
        loading={false}
        loadError={null}
        sessionExpired={false}
        reservingClassId={null}
        feedback={null}
        nowMs={nowMs}
        onReserve={noop}
        onRetry={noop}
        onDismissFeedback={noop}
      />,
    );
    expect(emptyHtml).toContain(EMPTY_MEMBER_CLASSES_MESSAGE);

    const errorHtml = renderToStaticMarkup(
      <MemberClassesPanel
        classes={[]}
        myReservations={[]}
        loading={false}
        loadError="Error de red"
        sessionExpired={false}
        reservingClassId={null}
        feedback={null}
        nowMs={nowMs}
        onReserve={noop}
        onRetry={noop}
        onDismissFeedback={noop}
      />,
    );
    expect(errorHtml).toContain("Error de red");
    expect(errorHtml).toContain("Reintentar");

    const expiredHtml = renderToStaticMarkup(
      <MemberClassesPanel
        classes={[]}
        myReservations={[]}
        loading={false}
        loadError={null}
        sessionExpired
        reservingClassId={null}
        feedback={null}
        nowMs={nowMs}
        onReserve={noop}
        onRetry={noop}
        onDismissFeedback={noop}
      />,
    );
    expect(expiredHtml).toContain("Tu sesión expiró.");
  });

  it("deshabilita reservar cuando está en curso, llena, pasada o ya reservada", () => {
    const nowMs = new Date("2026-11-20T12:00:00.000Z").getTime();
    const pastClass = makeClass({
      id: 1,
      name: "Clase Pasada",
      startsAt: "2026-11-19T15:00:00.000Z",
      endsAt: "2026-11-19T15:50:00.000Z",
    });
    const fullClass = makeClass({
      id: 2,
      name: "Clase Llena",
      startsAt: "2026-11-21T15:00:00.000Z",
      endsAt: "2026-11-21T15:50:00.000Z",
      spotsLeft: 0,
      confirmedReservations: 15,
    });
    const inFlightClass = makeClass({
      id: 3,
      name: "Clase En Curso",
      startsAt: "2026-11-22T15:00:00.000Z",
      endsAt: "2026-11-22T15:50:00.000Z",
    });
    const openClass = makeClass({
      id: 4,
      name: "Clase Disponible",
      startsAt: "2026-11-23T15:00:00.000Z",
      endsAt: "2026-11-23T15:50:00.000Z",
      spotsLeft: 4,
    });

    const html = renderToStaticMarkup(
      <MemberClassesPanel
        classes={[pastClass, fullClass, inFlightClass, openClass]}
        myReservations={[]}
        loading={false}
        loadError={null}
        sessionExpired={false}
        reservingClassId={3}
        feedback={{
          type: "error",
          message: "Necesitas una membresía activa para reservar.",
        }}
        nowMs={nowMs}
        onReserve={noop}
        onRetry={noop}
        onDismissFeedback={noop}
      />,
    );

    expect(html).toMatch(/disabled[^>]*>Clase finalizada/);
    expect(html).toMatch(/disabled[^>]*>Sin cupos/);
    expect(html).toMatch(/disabled[^>]*>Reservando\.\.\./);
    expect(html).toContain(">Reservar cupo</button>");
    expect(html).toContain("Necesitas una membresía activa para reservar.");
    expect(html).toContain("Clase Disponible");
  });

  it("impide doble clic simultáneo y actualiza cupos y Mis reservas tras éxito o 409 CLASS_FULL", async () => {
    let resolveFirst!: (val: { ok: boolean; data?: ClassReservation }) => void;
    const reserveMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; data?: ClassReservation }>((r) => {
          resolveFirst = r;
        }),
    );
    const updatedClass = makeClass({ id: 1, spotsLeft: 9, confirmedReservations: 6 });
    const reloadClasses = vi.fn().mockResolvedValue({ ok: true, data: [updatedClass] });
    const reloadReservations = vi
      .fn()
      .mockResolvedValue({ ok: true, data: [makeReservation()] });

    const inFlight = new Set<number>();

    const firstPromise = runReserveClassFlow(1, inFlight, {
      reserve: reserveMock,
      reloadClasses,
      reloadReservations,
    });
    const secondOutcome = await runReserveClassFlow(1, inFlight, {
      reserve: reserveMock,
      reloadClasses,
      reloadReservations,
    });

    expect(secondOutcome.ignoredAsDuplicateInFlight).toBe(true);
    expect(reserveMock).toHaveBeenCalledTimes(1);

    resolveFirst({ ok: true, data: makeReservation() });
    const firstOutcome = await firstPromise;

    expect(firstOutcome.ok).toBe(true);
    expect(firstOutcome.classes?.[0].spotsLeft).toBe(9);
    expect(firstOutcome.reservations).toHaveLength(1);

    // Ahora probar 409 CLASS_FULL -> recarga disponibilidad
    const reloadOnFull = vi.fn().mockResolvedValue({
      ok: true,
      data: [makeClass({ id: 1, spotsLeft: 0, confirmedReservations: 15 })],
    });
    const fullOutcome = await runReserveClassFlow(1, inFlight, {
      reserve: vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        code: "CLASS_FULL",
        error: "La clase está llena.",
      }),
      reloadClasses: reloadOnFull,
      reloadReservations: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    });

    expect(fullOutcome.ok).toBe(false);
    expect(fullOutcome.message).toBe("La clase está llena.");
    expect(reloadOnFull).toHaveBeenCalledTimes(1);
    expect(fullOutcome.classes?.[0].spotsLeft).toBe(0);
  });
});

describe("FE-7.2 · Mis reservas", () => {
  it("separa próximas y pasadas ordenando desde la fecha de clase más cercana", () => {
    const nowMs = new Date("2026-11-20T12:00:00.000Z").getTime();
    const pastOlder = makeReservation({
      id: 1,
      gymClass: {
        ...makeReservation().gymClass,
        name: "Pasada Antigua",
        startsAt: "2026-11-10T15:00:00.000Z",
        endsAt: "2026-11-10T15:50:00.000Z",
      },
    });
    const pastRecent = makeReservation({
      id: 2,
      status: "CANCELLED",
      gymClass: {
        ...makeReservation().gymClass,
        name: "Pasada Reciente",
        startsAt: "2026-11-19T15:00:00.000Z",
        endsAt: "2026-11-19T15:50:00.000Z",
      },
    });
    const futureFar = makeReservation({
      id: 3,
      gymClass: {
        ...makeReservation().gymClass,
        name: "Futura Lejana",
        startsAt: "2026-11-26T15:00:00.000Z",
        endsAt: "2026-11-26T15:50:00.000Z",
      },
    });
    const futureSoon = makeReservation({
      id: 4,
      gymClass: {
        ...makeReservation().gymClass,
        name: "Futura Cercana",
        startsAt: "2026-11-21T15:00:00.000Z",
        endsAt: "2026-11-21T15:50:00.000Z",
      },
    });

    const { upcoming, past } = partitionReservations(
      [pastOlder, futureFar, pastRecent, futureSoon],
      nowMs,
    );

    expect(upcoming.map((r) => r.gymClass.name)).toEqual([
      "Futura Cercana",
      "Futura Lejana",
    ]);
    expect(past.map((r) => r.gymClass.name)).toEqual([
      "Pasada Reciente",
      "Pasada Antigua",
    ]);

    const html = renderToStaticMarkup(
      <MyReservationsPanel
        reservations={[pastOlder, futureFar, pastRecent, futureSoon]}
        loading={false}
        error={null}
        sessionExpired={false}
        nowMs={nowMs}
        onRetry={noop}
      />,
    );

    expect(html).toContain("Confirmada");
    expect(html).toContain("Cancelada");
    expect(html).toContain('href="/miembro/clases"');
    expect(html.indexOf("Futura Cercana")).toBeLessThan(html.indexOf("Futura Lejana"));
    expect(html.indexOf("Pasada Reciente")).toBeLessThan(html.indexOf("Pasada Antigua"));
    expect(html).not.toContain("Cancelar reserva");
  });

  it("muestra estado vacío cuando no hay reservas", () => {
    const html = renderToStaticMarkup(
      <MyReservationsPanel
        reservations={[]}
        loading={false}
        error={null}
        sessionExpired={false}
        nowMs={new Date("2026-11-20T12:00:00.000Z").getTime()}
        onRetry={noop}
      />,
    );

    expect(html).toContain(EMPTY_RESERVATIONS_MESSAGE);
  });
});

describe("FE-8.1 · Cancelar mi reserva", () => {
  const nowMs = new Date("2026-11-20T12:00:00.000Z").getTime();
  const startAt = (offsetMs: number) => new Date(nowMs + offsetMs).toISOString();

  it("permite exactamente 2 horas y bloquea 1h59, clase suelta y cancelada", () => {
    const atBoundary = makeReservation({ gymClass: { ...makeReservation().gymClass, startsAt: startAt(2 * 60 * 60 * 1000) } });
    expect(canCancelReservation(atBoundary, nowMs)).toBe(true);
    expect(canCancelReservation({ ...atBoundary, gymClass: { ...atBoundary.gymClass, startsAt: startAt(119 * 60 * 1000) } }, nowMs)).toBe(false);
    expect(canCancelReservation({ ...atBoundary, origin: "DROP_IN" }, nowMs)).toBe(false);
    expect(canCancelReservation({ ...atBoundary, status: "CANCELLED" }, nowMs)).toBe(false);
  });

  it("muestra la acción solo para reservas confirmadas y exige confirmación", () => {
    const upcoming = makeReservation({ gymClass: { ...makeReservation().gymClass, startsAt: startAt(3 * 60 * 60 * 1000) } });
    const html = renderToStaticMarkup(<MyReservationsPanel reservations={[upcoming]} loading={false} error={null} sessionExpired={false} nowMs={nowMs} onRetry={noop} onCancel={async () => {}} />);
    expect(html).toContain("Cancelar reserva");
    expect(html).not.toContain("Confirmar cancelación");
  });
});
