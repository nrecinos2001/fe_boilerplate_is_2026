import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCESS_DENIED_MESSAGE, AccessDenied } from "@/src/components/access-denied";
import { gateDecision } from "./role-gate";

const ENROLL_ROLES = ["RECEPTION", "ADMIN"] as const;

describe("gateDecision", () => {
  it("espera mientras la sesión se rehidrata", () => {
    expect(gateDecision("loading", null, ENROLL_ROLES)).toBe("loading");
  });

  it.each(["RECEPTION", "ADMIN"] as const)("deja pasar a %s a la inscripción", (role) => {
    expect(gateDecision("authenticated", role, ENROLL_ROLES)).toBe("allowed");
  });

  it.each(["MEMBER", "TRAINER"] as const)("niega la inscripción a %s", (role) => {
    expect(gateDecision("authenticated", role, ENROLL_ROLES)).toBe("denied");
  });

  it("sin sesión espera la redirección a /login en vez de negar", () => {
    expect(gateDecision("unauthenticated", null, ENROLL_ROLES)).toBe("loading");
  });
});

describe("AccessDenied", () => {
  it("muestra el mensaje de la historia", () => {
    expect(renderToStaticMarkup(<AccessDenied />)).toContain(ACCESS_DENIED_MESSAGE);
  });
});
