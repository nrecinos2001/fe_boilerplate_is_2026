import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MembershipCard } from "./membership-card";
import { NO_MEMBERSHIP_MESSAGE, RENEW_MESSAGE, type MyMembership } from "@/src/types/membership";

const render = (membership: MyMembership) =>
  renderToStaticMarkup(createElement(MembershipCard, { membership }));

const active: MyMembership = {
  status: "ACTIVE",
  planName: "Mensual",
  planType: "MONTHLY",
  endDate: "2026-12-15",
  daysLeft: 27,
  includedClass: null,
};

describe("MembershipCard (H05)", () => {
  it("muestra plan, estado, vencimiento y días restantes", () => {
    const html = render(active);
    expect(html).toContain("Tu membresía");
    expect(html).toContain("Mensual");
    expect(html).toContain("Activa");
    expect(html).toContain("15/12/2026");
    expect(html).toContain("27 días restantes");
    expect(html).toContain('data-tone="success"');
  });

  it("vencida: color rojo, estado resaltado y el mensaje como alerta", () => {
    const html = render({ ...active, status: "EXPIRED", daysLeft: 0 });
    expect(html).toContain('data-tone="danger"');
    expect(html).toContain("Vencida");
    expect(html).toContain("ring-2");
    expect(html).toContain('role="alert"');
    expect(html).toContain(RENEW_MESSAGE);
  });

  it("sin membresía: solo el mensaje, sin datos de plan", () => {
    const html = render({
      status: "NONE",
      planName: null,
      planType: null,
      endDate: null,
      daysLeft: null,
      includedClass: null,
    });
    expect(html).toContain(NO_MEMBERSHIP_MESSAGE);
    expect(html).not.toContain("Vence el");
  });

  it("no tiene ningún campo para elegir a otro miembro", () => {
    const html = render(active);
    expect(html).not.toMatch(/<(input|select|textarea)\b/);
  });
});
