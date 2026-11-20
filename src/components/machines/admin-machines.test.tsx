import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Machine, MachineStatusChange } from "@/src/types/machines";
import { ChangeStatusModal } from "./change-status-modal";
import { MachineInventoryTable } from "./machine-inventory-table";
import { EMPTY_HISTORY_MESSAGE, StatusHistoryPanel } from "./status-history-panel";
import { StatusBadge } from "./status-badge";

const machine: Machine = {
  id: 2,
  code: "CAR-002",
  name: "Bicicleta estática 1",
  area: "CARDIO",
  status: "OPERATIONAL",
};

const noop = () => {};

describe("StatusBadge", () => {
  it.each([
    ["OPERATIONAL", "Operativa", "emerald"],
    ["UNDER_MAINTENANCE", "En mantenimiento", "amber"],
    ["OUT_OF_SERVICE", "Fuera de servicio", "red"],
  ] as const)("%s se muestra como %s en %s", (status, label, color) => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />);
    expect(html).toContain(label);
    expect(html).toContain(`bg-${color}-100`);
  });
});

describe("MachineInventoryTable", () => {
  const render = (props: Partial<Parameters<typeof MachineInventoryTable>[0]>) =>
    renderToStaticMarkup(
      <MachineInventoryTable
        machines={[]}
        loading={false}
        error={null}
        onRetry={noop}
        onChangeStatus={noop}
        onShowHistory={noop}
        {...props}
      />,
    );

  it("muestra la carga", () => {
    expect(render({ loading: true })).toContain("Cargando máquinas...");
  });

  it("muestra el error con la opción de reintentar", () => {
    const html = render({ error: "No pudimos cargar las máquinas." });
    expect(html).toContain("No pudimos cargar las máquinas.");
    expect(html).toContain("Reintentar");
  });

  it("muestra cada máquina con su área, estado y acciones", () => {
    const html = render({ machines: [machine] });
    expect(html).toContain("CAR-002");
    expect(html).toContain("Bicicleta estática 1");
    expect(html).toContain("Cardio");
    expect(html).toContain("Operativa");
    expect(html).toContain("Cambiar estado");
    expect(html).toContain("Historial");
  });
});

describe("StatusHistoryPanel", () => {
  const entry: MachineStatusChange = {
    fromStatus: "OPERATIONAL",
    toStatus: "UNDER_MAINTENANCE",
    reason: "Cambio de banda por desgaste",
    changedBy: "admin@gymhub.test",
    changedAt: new Date(2026, 10, 7, 18, 30).toISOString(),
  };
  const render = (props: Partial<Parameters<typeof StatusHistoryPanel>[0]>) =>
    renderToStaticMarkup(
      <StatusHistoryPanel
        machine={machine}
        entries={[]}
        loading={false}
        error={null}
        onRetry={noop}
        onClose={noop}
        {...props}
      />,
    );

  it("muestra la carga", () => {
    expect(render({ loading: true })).toContain("Cargando historial...");
  });

  it("muestra el error", () => {
    expect(render({ error: "No pudimos cargar el historial." })).toContain(
      "No pudimos cargar el historial.",
    );
  });

  it("sin cambios muestra el mensaje de historial vacío", () => {
    expect(render({})).toContain(EMPTY_HISTORY_MESSAGE);
  });

  it("muestra fecha, hora, estados, motivo y autor", () => {
    const html = render({ entries: [entry] });
    expect(html).toContain("Operativa → En mantenimiento");
    expect(html).toContain("Cambio de banda por desgaste");
    expect(html).toContain("07/11/2026 18:30 · admin@gymhub.test");
  });
});

describe("ChangeStatusModal", () => {
  it("el selector no ofrece el estado actual", () => {
    const html = renderToStaticMarkup(
      <ChangeStatusModal machine={machine} onClose={noop} onSaved={vi.fn()} />,
    );
    expect(html).toContain('value="UNDER_MAINTENANCE"');
    expect(html).toContain('value="OUT_OF_SERVICE"');
    expect(html).not.toContain('value="OPERATIONAL"');
    expect(html).toContain("Motivo (5 a 200 caracteres)");
    expect(html).toContain("Guardar cambio");
  });
});
