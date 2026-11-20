import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Plan } from "@/src/types/plans";
import { DeactivatePlanDialog } from "./deactivate-plan-dialog";
import { PlanFormDialog, type PlanFormDialogProps } from "./plan-form-dialog";
import {
  EMPTY_PLAN_FORM,
  EMPTY_PLANS_MESSAGE,
  formatDuration,
  formatPrice,
  planToFormValues,
  PRICE_MESSAGE,
  toCreatePlanInput,
  toUpdatePlanInput,
  validatePlanForm,
  type PlanFormValues,
} from "./plan-form-logic";
import { PlansTable, type PlansTableProps } from "./plans-table";

const noop = () => {};

const monthly: Plan = {
  id: 1,
  name: "Mensual",
  type: "MONTHLY",
  durationDays: 30,
  price: 25,
  benefits: "Acceso ilimitado",
  isActive: true,
};
const dropIn: Plan = {
  id: 3,
  name: "Clase suelta",
  type: "DROP_IN",
  durationDays: null,
  price: 5,
  benefits: null,
  isActive: true,
};

const valid: PlanFormValues = {
  name: "Mensual Plus",
  type: "MONTHLY",
  durationDays: "30",
  price: "25.00",
  benefits: "",
};

describe("validatePlanForm (FE-3.1)", () => {
  it("acepta un plan válido", () => {
    expect(validatePlanForm(valid)).toEqual({});
  });

  it("un formulario vacío marca nombre, tipo y precio, así que no se envía", () => {
    expect(Object.keys(validatePlanForm(EMPTY_PLAN_FORM)).sort()).toEqual(["name", "price", "type"]);
  });

  it.each(["0", "0.00", "-5", "25.555", "abc", ""])("marca el precio %s y no se envía", (price) => {
    expect(validatePlanForm({ ...valid, price }).price).toBe(PRICE_MESSAGE);
  });

  it("acepta un precio de 0.01", () => {
    expect(validatePlanForm({ ...valid, price: "0.01" }).price).toBeUndefined();
  });

  it.each(["0", "366", "1.5", ""])("marca la duración %s", (durationDays) => {
    expect(validatePlanForm({ ...valid, durationDays }).durationDays).toBeDefined();
  });

  it("en Clase suelta no exige duración", () => {
    expect(validatePlanForm({ ...valid, type: "DROP_IN", durationDays: "" })).toEqual({});
  });

  it.each(["Ab", "a".repeat(41), "   "])("marca el nombre %#", (name) => {
    expect(validatePlanForm({ ...valid, name }).name).toBeDefined();
  });

  it("marca beneficios de más de 300 caracteres", () => {
    expect(validatePlanForm({ ...valid, benefits: "b".repeat(301) }).benefits).toBeDefined();
  });
});

describe("cuerpos de las solicitudes", () => {
  it("el alta de un Mensual envía la duración y omite beneficios vacíos", () => {
    expect(toCreatePlanInput({ ...valid, name: "  Mensual Plus " })).toEqual({
      name: "Mensual Plus",
      type: "MONTHLY",
      durationDays: 30,
      price: 25,
    });
  });

  it("el alta de una Clase suelta no envía duración", () => {
    const input = toCreatePlanInput({ ...valid, type: "DROP_IN", durationDays: "", benefits: "Una clase" });
    expect(input).toEqual({ name: "Mensual Plus", type: "DROP_IN", price: 25, benefits: "Una clase" });
  });

  it("la edición nunca envía el tipo y vacía los beneficios con null", () => {
    const input = toUpdatePlanInput({ ...valid, price: "27.50" }, "MONTHLY");
    expect(input).toEqual({ name: "Mensual Plus", durationDays: 30, price: 27.5, benefits: null });
    expect(input).not.toHaveProperty("type");
  });

  it("la edición de una Clase suelta no envía duración", () => {
    expect(toUpdatePlanInput(planToFormValues(dropIn), "DROP_IN")).not.toHaveProperty("durationDays");
  });

  it("planToFormValues precarga el plan con el precio en 2 decimales", () => {
    expect(planToFormValues(monthly)).toEqual({
      name: "Mensual",
      type: "MONTHLY",
      durationDays: "30",
      price: "25.00",
      benefits: "Acceso ilimitado",
    });
  });

  it("formatea precio y duración", () => {
    expect(formatPrice(5)).toBe("$5.00");
    expect(formatDuration(monthly)).toBe("30 días");
    expect(formatDuration({ durationDays: 1 })).toBe("1 día");
    expect(formatDuration(dropIn)).toBe("Mismo día");
  });
});

describe("PlanFormDialog", () => {
  const render = (props: Partial<PlanFormDialogProps> = {}) =>
    renderToStaticMarkup(
      <PlanFormDialog
        mode="create"
        values={valid}
        errors={{}}
        saving={false}
        serverError={null}
        onChange={noop}
        onSubmit={noop}
        onClose={noop}
        {...props}
      />,
    );

  it("en un plan Mensual muestra la duración en días", () => {
    const html = render();
    expect(html).toContain("Nuevo plan");
    expect(html).toContain("Duración en días");
    expect(html).toContain("Mensual");
    expect(html).toContain("Trimestral");
    expect(html).toContain("Clase suelta");
  });

  it("al elegir Clase suelta desaparece la duración", () => {
    const html = render({ values: { ...valid, type: "DROP_IN", durationDays: "" } });
    expect(html).not.toContain("Duración en días");
    expect(html).not.toContain('id="plan-durationDays"');
  });

  it("al editar, el tipo queda bloqueado", () => {
    const html = render({ mode: "edit", values: planToFormValues(monthly) });
    expect(html).toContain("Editar plan · Mensual");
    expect(html).toContain("El tipo no se puede cambiar.");
    expect(html).toMatch(/<select[^>]*id="plan-type"[^>]*disabled=""/);
  });

  it("marca el precio en el formulario", () => {
    const html = render({ errors: { price: PRICE_MESSAGE } });
    expect(html).toContain(PRICE_MESSAGE);
    expect(html).toContain('id="plan-price-error"');
  });

  it("mientras guarda deshabilita el botón", () => {
    const html = render({ saving: true });
    expect(html).toContain("Guardando...");
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });

  it("muestra el error del servidor", () => {
    expect(render({ serverError: "Ya existe un plan de clase suelta activo." })).toContain(
      "Ya existe un plan de clase suelta activo.",
    );
  });
});

describe("PlansTable", () => {
  const render = (props: Partial<PlansTableProps> = {}) =>
    renderToStaticMarkup(
      <PlansTable
        plans={[]}
        loading={false}
        error={null}
        onRetry={noop}
        onEdit={noop}
        onDeactivate={noop}
        {...props}
      />,
    );

  it("muestra la carga", () => {
    expect(render({ loading: true })).toContain("Cargando planes...");
  });

  it("muestra el error con la opción de reintentar", () => {
    const html = render({ error: "No pudimos cargar los planes. Intenta de nuevo." });
    expect(html).toContain("No pudimos cargar los planes.");
    expect(html).toContain("Reintentar");
  });

  it("sin planes muestra el mensaje de vacío", () => {
    expect(render()).toContain(EMPTY_PLANS_MESSAGE);
  });

  it("muestra cada plan con su tipo, duración, precio y estado", () => {
    const html = render({ plans: [monthly, dropIn] });
    expect(html).toContain("Mensual");
    expect(html).toContain("30 días");
    expect(html).toContain("$25.00");
    expect(html).toContain("Clase suelta");
    expect(html).toContain("Mismo día");
    expect(html).toContain("Activo");
  });

  it("un plan inactivo se puede editar pero no desactivar otra vez", () => {
    const html = render({ plans: [{ ...monthly, isActive: false }] });
    expect(html).toContain("Inactivo");
    expect(html).toContain("Editar");
    expect(html).not.toContain(">Desactivar<");
  });
});

describe("DeactivatePlanDialog", () => {
  it("pide confirmación con el texto de la historia", () => {
    const html = renderToStaticMarkup(
      <DeactivatePlanDialog plan={monthly} busy={false} error={null} onConfirm={noop} onCancel={noop} />,
    );
    expect(html).toContain("¿Desactivar el plan Mensual? Ya no se podrá vender.");
    expect(html).toContain("Cancelar");
    expect(html).toContain("Desactivar");
  });

  it("mientras desactiva deshabilita los botones", () => {
    const html = renderToStaticMarkup(
      <DeactivatePlanDialog plan={monthly} busy error={null} onConfirm={noop} onCancel={noop} />,
    );
    expect(html).toContain("Desactivando...");
  });
});
