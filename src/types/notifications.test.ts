import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_SOURCES,
  SOURCE_LABELS,
  formatBadge,
  formatNotificationDate,
  sourceLabel,
  totalPages,
} from "./notifications";

describe("formatBadge", () => {
  it("sin avisos no muestra nada", () => {
    expect(formatBadge(0)).toBe("");
    expect(formatBadge(-3)).toBe("");
  });

  it("muestra el número hasta 99", () => {
    expect(formatBadge(1)).toBe("1");
    expect(formatBadge(99)).toBe("99");
  });

  it("por encima de 99 muestra 99+", () => {
    expect(formatBadge(100)).toBe("99+");
    expect(formatBadge(5000)).toBe("99+");
  });
});

describe("sourceLabel", () => {
  it("todos los módulos tienen etiqueta en español", () => {
    for (const source of NOTIFICATION_SOURCES) {
      expect(SOURCE_LABELS[source]).toBeTruthy();
    }
    expect(sourceLabel("CLASSES")).toBe("Clases grupales");
    expect(sourceLabel("MEMBERSHIPS")).toBe("Membresías");
  });

  it("un módulo desconocido se muestra tal cual", () => {
    expect(sourceLabel("OTRO")).toBe("OTRO");
  });
});

describe("formatNotificationDate", () => {
  it("usa dd/mm/aaaa hh:mm en hora local", () => {
    const iso = new Date(2026, 10, 5, 9, 7).toISOString();
    expect(formatNotificationDate(iso)).toBe("05/11/2026 09:07");
  });

  it("una fecha inválida queda vacía", () => {
    expect(formatNotificationDate("no-es-fecha")).toBe("");
  });
});

describe("totalPages", () => {
  it("calcula páginas de 20 y nunca baja de 1", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(20)).toBe(1);
    expect(totalPages(21)).toBe(2);
    expect(totalPages(45, 20)).toBe(3);
  });
});
