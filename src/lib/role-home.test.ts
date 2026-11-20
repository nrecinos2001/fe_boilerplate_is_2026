import { describe, expect, it } from "vitest";
import {
  CHANGE_PASSWORD_PATH,
  passwordChangeRedirect,
  pathAfterLogin,
  roleHomePath,
} from "./role-home";

const pending = { role: "MEMBER" as const, mustChangePassword: true };
const done = { role: "RECEPTION" as const, mustChangePassword: false };

describe("passwordChangeRedirect (FE-1.2)", () => {
  it.each(["/dashboard", "/classes", "/recepcion/miembros/nuevo"])(
    "con contraseña temporal, %s redirige a /cambiar-contrasena",
    (path) => {
      expect(passwordChangeRedirect(path, pending)).toBe(CHANGE_PASSWORD_PATH);
    },
  );

  it("con contraseña temporal, deja quedarse en /cambiar-contrasena", () => {
    expect(passwordChangeRedirect(CHANGE_PASSWORD_PATH, pending)).toBeNull();
  });

  it("sin contraseña temporal, /cambiar-contrasena lleva al inicio del rol", () => {
    expect(passwordChangeRedirect(CHANGE_PASSWORD_PATH, done)).toBe(roleHomePath("RECEPTION"));
  });

  it("sin contraseña temporal, no toca las demás rutas", () => {
    expect(passwordChangeRedirect("/dashboard", done)).toBeNull();
  });

  it.each(["/", "/home", "/login"])("no redirige en la ruta abierta %s", (path) => {
    expect(passwordChangeRedirect(path, pending)).toBeNull();
  });

  it("sin usuario cargado no redirige", () => {
    expect(passwordChangeRedirect("/dashboard", null)).toBeNull();
  });
});

describe("pathAfterLogin", () => {
  it("con contraseña temporal va a cambiarla", () => {
    expect(pathAfterLogin(pending)).toBe(CHANGE_PASSWORD_PATH);
  });

  it("sin contraseña temporal va al inicio del rol", () => {
    expect(pathAfterLogin(done)).toBe(roleHomePath("RECEPTION"));
  });
});
