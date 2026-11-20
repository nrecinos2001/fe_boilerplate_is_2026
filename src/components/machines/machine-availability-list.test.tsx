import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { MachineAvailability } from "@/src/types/machines";
import {
  EMPTY_AVAILABILITY_MESSAGE,
  MachineAvailabilityList,
} from "./machine-availability-list";

const noop = () => {};

const machines: MachineAvailability[] = [
  { name: "Bicicleta estática 1", area: "CARDIO", status: "OPERATIONAL" },
  { name: "Caminadora 1", area: "CARDIO", status: "UNDER_MAINTENANCE" },
  { name: "Prensa de piernas", area: "STRENGTH", status: "OUT_OF_SERVICE" },
];

const render = (props: Partial<Parameters<typeof MachineAvailabilityList>[0]>) =>
  renderToStaticMarkup(
    <MachineAvailabilityList machines={[]} loading={false} error={null} onRetry={noop} {...props} />,
  );

describe("MachineAvailabilityList", () => {
  it("muestra la carga", () => {
    expect(render({ loading: true })).toContain("Cargando máquinas...");
  });

  it("con error del servidor muestra el mensaje y Reintentar", () => {
    const html = render({ error: "No pudimos cargar las máquinas." });
    expect(html).toContain("No pudimos cargar las máquinas.");
    expect(html).toContain("Reintentar");
  });

  it("sin resultados muestra el mensaje de vacío", () => {
    expect(render({})).toContain(EMPTY_AVAILABILITY_MESSAGE);
  });

  it("agrupa por área y muestra cada estado con su color", () => {
    const html = render({ machines });
    expect(html.indexOf("Cardio")).toBeLessThan(html.indexOf("Fuerza"));
    expect(html).not.toContain("Peso libre");
    expect(html).toMatch(/Bicicleta estática 1.*bg-emerald-100.*Operativa/);
    expect(html).toMatch(/Caminadora 1.*bg-amber-100.*En mantenimiento/);
    expect(html).toMatch(/Prensa de piernas.*bg-red-100.*Fuera de servicio/);
  });

  it("no tiene ningún botón para cambiar estados", () => {
    const html = render({ machines });
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Cambiar estado");
  });
});
