import { describe, expect, it } from "vitest";
import {
  blockAtCell,
  getMonday,
  nextFreeSlot,
  slotCount,
  slotsPerWeekday,
  validateRange,
} from "./availability";
import type { AvailabilityBlock } from "@/src/types/availability";

function block(weekday: number, startTime: string, endTime: string): AvailabilityBlock {
  return {
    id: `${weekday}-${startTime}`,
    userId: "u",
    weekday,
    startTime,
    endTime,
    createdAt: "",
    updatedAt: "",
  };
}

describe("validateRange", () => {
  it("rechaza rangos vacíos, invertidos o menores a 60 min", () => {
    expect(validateRange("", "10:00")).toMatch(/Completa/);
    expect(validateRange("10:00", "09:00")).toMatch(/posterior/);
    expect(validateRange("15:00", "15:30")).toMatch(/60 minutos/);
  });
  it("acepta 60 min o más", () => {
    expect(validateRange("15:00", "16:00")).toBeNull();
  });
});

describe("slotCount", () => {
  it("descarta el remanente menor a 60 min", () => {
    expect(slotCount("08:00", "10:30")).toBe(2);
  });
});

describe("blockAtCell / slotsPerWeekday", () => {
  const blocks = [block(1, "08:00", "11:00"), block(3, "09:00", "10:00")];
  it("encuentra el bloque que cubre la celda", () => {
    expect(blockAtCell(blocks, 1, 10)?.id).toBe("1-08:00");
    expect(blockAtCell(blocks, 1, 11)).toBeUndefined();
    expect(blockAtCell(blocks, 2, 9)).toBeUndefined();
  });
  it("cuenta espacios por día", () => {
    expect(slotsPerWeekday(blocks)).toEqual([3, 0, 1, 0, 0, 0, 0]);
  });
});

describe("getMonday / nextFreeSlot", () => {
  it("devuelve el lunes de la semana", () => {
    expect(getMonday(new Date(2026, 10, 18)).getDate()).toBe(16);
    expect(getMonday(new Date(2026, 10, 22)).getDate()).toBe(16);
    expect(getMonday(new Date(2026, 10, 16)).getDay()).toBe(1);
  });
  it("encuentra el próximo espacio posterior a ahora", () => {
    const monday = new Date(2026, 10, 16);
    const now = new Date(2026, 10, 16, 16, 42);
    const next = nextFreeSlot([block(1, "15:00", "18:00"), block(3, "09:00", "10:00")], monday, now);
    expect(next?.date.getHours()).toBe(17);
    expect(next?.weekdayIndex).toBe(0);
    expect(nextFreeSlot([block(1, "08:00", "09:00")], monday, now)).toBeNull();
  });
});
