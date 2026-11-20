import { describe, expect, it } from "vitest";
import { homeRouteForRole } from "./role-routes";

describe("homeRouteForRole", () => {
  it("envía al entrenador a su jornada", () => {
    expect(homeRouteForRole("TRAINER")).toBe("/trainer");
  });
  it("usa el dashboard para el resto de roles o sin rol", () => {
    expect(homeRouteForRole("ADMIN")).toBe("/dashboard");
    expect(homeRouteForRole("MEMBER")).toBe("/dashboard");
    expect(homeRouteForRole("RECEPTION")).toBe("/dashboard");
    expect(homeRouteForRole(null)).toBe("/dashboard");
  });
});
