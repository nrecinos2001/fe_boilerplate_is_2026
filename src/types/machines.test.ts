import { describe, expect, it } from "vitest";
import {
  MISSING_REASON_MESSAGE,
  REASON_LENGTH_MESSAGE,
  formatChangeDate,
  statusOptionsFor,
  validateReason,
} from "./machines";

describe("statusOptionsFor", () => {
  it("ofrece solo los dos estados distintos al actual", () => {
    expect(statusOptionsFor("OPERATIONAL")).toEqual(["UNDER_MAINTENANCE", "OUT_OF_SERVICE"]);
    expect(statusOptionsFor("UNDER_MAINTENANCE")).toEqual(["OPERATIONAL", "OUT_OF_SERVICE"]);
    expect(statusOptionsFor("OUT_OF_SERVICE")).toEqual(["OPERATIONAL", "UNDER_MAINTENANCE"]);
  });
});

describe("validateReason", () => {
  it.each(["", "    "])("sin motivo pide escribirlo (%j)", (reason) => {
    expect(validateReason(reason)).toBe(MISSING_REASON_MESSAGE);
  });

  it("rechaza menos de 5 y más de 200 caracteres", () => {
    expect(validateReason("abcd")).toBe(REASON_LENGTH_MESSAGE);
    expect(validateReason("a".repeat(201))).toBe(REASON_LENGTH_MESSAGE);
  });

  it("acepta de 5 a 200 caracteres, sin contar los espacios de los extremos", () => {
    expect(validateReason("  abcde  ")).toBeNull();
    expect(validateReason("a".repeat(200))).toBeNull();
  });
});

describe("formatChangeDate", () => {
  it("muestra fecha y hora como dd/mm/aaaa hh:mm", () => {
    const local = new Date(2026, 10, 7, 18, 30);
    expect(formatChangeDate(local.toISOString())).toBe("07/11/2026 18:30");
  });
});
