import { describe, expect, it } from "vitest";
import {
  NO_MEMBERSHIP_MESSAGE,
  RENEW_MESSAGE,
  formatDaysLeft,
  formatEndDate,
  membershipView,
  type MyMembership,
} from "./membership";

const active: MyMembership = {
  status: "ACTIVE",
  planName: "Mensual",
  planType: "MONTHLY",
  endDate: "2026-12-15",
  daysLeft: 27,
  includedClass: null,
};

describe("membership (H05)", () => {
  it("formatea el vencimiento como dd/mm/aaaa sin moverlo de día", () => {
    expect(formatEndDate("2026-12-15")).toBe("15/12/2026");
    expect(formatEndDate("2027-01-01")).toBe("01/01/2027");
  });

  it("describe los días restantes", () => {
    expect(formatDaysLeft(0)).toBe("Vence hoy");
    expect(formatDaysLeft(1)).toBe("1 día restante");
    expect(formatDaysLeft(27)).toBe("27 días restantes");
  });

  it("activa: plan, estado, vencimiento y días restantes, en verde y sin mensaje", () => {
    expect(membershipView(active)).toEqual({
      tone: "success",
      statusLabel: "Activa",
      highlighted: false,
      planLabel: "Mensual",
      endDateLabel: "15/12/2026",
      daysLeftLabel: "27 días restantes",
      includedClassLabel: null,
      message: null,
    });
  });

  it("vencida: estado resaltado en rojo con el mensaje de renovar", () => {
    const view = membershipView({ ...active, status: "EXPIRED", daysLeft: 0 });
    expect(view.tone).toBe("danger");
    expect(view.statusLabel).toBe("Vencida");
    expect(view.highlighted).toBe(true);
    expect(view.daysLeftLabel).toBeNull();
    expect(view.message).toBe(RENEW_MESSAGE);
  });

  it("pendiente de pago: estado resaltado en ámbar con el mensaje de renovar", () => {
    const view = membershipView({ ...active, status: "PENDING_PAYMENT" });
    expect(view.tone).toBe("warning");
    expect(view.statusLabel).toBe("Pendiente de pago");
    expect(view.highlighted).toBe(true);
    expect(view.message).toBe(RENEW_MESSAGE);
  });

  it("clase suelta: plan 'Clase suelta', la clase incluida en hora de El Salvador y vence hoy", () => {
    const view = membershipView({
      status: "ACTIVE",
      planName: "Pase diario",
      planType: "DROP_IN",
      endDate: "2026-11-18",
      daysLeft: 0,
      // 13:00 UTC = 07:00 en El Salvador.
      includedClass: { name: "Spinning Matutino", startsAt: "2026-11-18T13:00:00.000Z" },
    });
    expect(view.planLabel).toBe("Clase suelta");
    expect(view.includedClassLabel).toBe("Spinning Matutino · a las 07:00");
    expect(view.daysLeftLabel).toBe("Vence hoy");
  });

  it("sin membresía: solo el mensaje de acercarse a recepción", () => {
    const view = membershipView({
      status: "NONE",
      planName: null,
      planType: null,
      endDate: null,
      daysLeft: null,
      includedClass: null,
    });
    expect(view.tone).toBe("neutral");
    expect(view.planLabel).toBeNull();
    expect(view.message).toBe(NO_MEMBERSHIP_MESSAGE);
  });
});
