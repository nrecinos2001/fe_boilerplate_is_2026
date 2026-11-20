import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WRONG_CURRENT_PASSWORD_MESSAGE } from "@/src/services/auth/password-service";
import { useAuthStore } from "@/src/stores/useAuthStore";
import {
  ChangePasswordFormView,
  type ChangePasswordFormViewProps,
} from "./change-password-form-view";
import {
  EMPTY_CHANGE_PASSWORD,
  PASSWORD_UPDATED_MESSAGE,
  validateChangePassword,
  type ChangePasswordValues,
} from "./change-password-logic";

const valid: ChangePasswordValues = {
  currentPassword: "Temporal123",
  newPassword: "NuevaClave1",
  confirmPassword: "NuevaClave1",
};
const noop = () => {};

describe("validateChangePassword (FE-1.2)", () => {
  it("acepta una contraseña válida y confirmada", () => {
    expect(validateChangePassword(valid)).toEqual({});
  });

  it("si las contraseñas no coinciden no se envía", () => {
    expect(validateChangePassword({ ...valid, confirmPassword: "OtraClave1" })).toEqual({
      confirmPassword: "Las contraseñas no coinciden.",
    });
  });

  it("exige la contraseña actual", () => {
    expect(validateChangePassword({ ...valid, currentPassword: "" }).currentPassword).toBeDefined();
  });

  it.each([
    ["Corta1A", "menos de 8"],
    [`Aa1${"x".repeat(70)}`, "más de 72"],
    ["sinmayuscula1", "sin mayúscula"],
    ["SINMINUSCULA1", "sin minúscula"],
    ["SinNumeroAqui", "sin número"],
  ])("rechaza la nueva contraseña %#: %s", (newPassword) => {
    const errors = validateChangePassword({ ...valid, newPassword, confirmPassword: newPassword });
    expect(errors.newPassword).toBeDefined();
  });

  it("acepta 8 y 72 caracteres", () => {
    for (const newPassword of ["Abcdefg1", `Aa1${"x".repeat(69)}`]) {
      expect(
        validateChangePassword({ ...valid, newPassword, confirmPassword: newPassword }),
      ).toEqual({});
    }
  });

  it("rechaza una nueva igual a la actual", () => {
    const errors = validateChangePassword({
      currentPassword: "NuevaClave1",
      newPassword: "NuevaClave1",
      confirmPassword: "NuevaClave1",
    });
    expect(errors.newPassword).toBe("La nueva contraseña debe ser distinta de la actual.");
  });
});

describe("ChangePasswordFormView", () => {
  const render = (props: Partial<ChangePasswordFormViewProps> = {}) =>
    renderToStaticMarkup(
      <ChangePasswordFormView
        values={EMPTY_CHANGE_PASSWORD}
        errors={{}}
        submitting={false}
        serverError={null}
        success={null}
        onChange={noop}
        onSubmit={noop}
        {...props}
      />,
    );

  it("muestra los tres campos y el botón Guardar", () => {
    const html = render();
    expect(html).toContain("Contraseña actual");
    expect(html).toContain("Nueva contraseña");
    expect(html).toContain("Confirmar contraseña");
    expect(html).toContain("Guardar");
  });

  it("mientras guarda deshabilita el botón", () => {
    const html = render({ submitting: true });
    expect(html).toContain("Guardando...");
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });

  it("muestra el error 400 de la contraseña actual", () => {
    expect(render({ serverError: WRONG_CURRENT_PASSWORD_MESSAGE })).toContain(
      WRONG_CURRENT_PASSWORD_MESSAGE,
    );
  });

  it("muestra el éxito y bloquea el formulario", () => {
    const html = render({ success: PASSWORD_UPDATED_MESSAGE });
    expect(html).toContain("Tu contraseña se actualizó.");
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });

  it("muestra los errores de validación bajo cada campo", () => {
    expect(render({ errors: { confirmPassword: "Las contraseñas no coinciden." } })).toContain(
      'id="confirmPassword-error"',
    );
  });
});

describe("useAuthStore.markPasswordChanged", () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: "authenticated",
      accessToken: "token",
      user: {
        id: "u1",
        email: "miembro@gym.local",
        fullName: "Miembro",
        role: "MEMBER",
        mustChangePassword: true,
        isActive: true,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    });
  });

  it("deja mustChangePassword en false sin tocar el token", () => {
    useAuthStore.getState().markPasswordChanged();
    const state = useAuthStore.getState();
    expect(state.user?.mustChangePassword).toBe(false);
    expect(state.accessToken).toBe("token");
  });

  it("sin usuario no hace nada", () => {
    useAuthStore.getState().clearSession();
    useAuthStore.getState().markPasswordChanged();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
