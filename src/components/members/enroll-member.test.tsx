import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import { EMAIL_TAKEN_MESSAGE, ENROLL_SERVER_ERROR } from "@/src/services/members/members-service";
import type { EnrolledMember } from "@/src/types/members";
import { applyEnrollError } from "./enroll-member-errors";
import { EnrollMemberFormView, type EnrollMemberFormViewProps } from "./enroll-member-form-view";
import {
  EMPTY_ENROLLMENT,
  FUTURE_BIRTH_DATE_MESSAGE,
  todayIsoDate,
  toEnrollMemberInput,
  validateEnrollment,
  type EnrollMemberValues,
} from "./enroll-member-logic";
import { credentialsText, EnrollmentResultDialog } from "./enrollment-result-dialog";

const TODAY = "2026-11-18";
const valid: EnrollMemberValues = {
  fullName: "Ana López",
  sex: "F",
  birthDate: "1998-04-12",
  email: "ana@correo.com",
};
const noop = () => {};

describe("validateEnrollment (FE-1.1)", () => {
  it("acepta datos válidos", () => {
    expect(validateEnrollment(valid, TODAY)).toEqual({});
  });

  it("marca todos los campos de un formulario vacío, así que no se envía", () => {
    const errors = validateEnrollment(EMPTY_ENROLLMENT, TODAY);
    expect(Object.keys(errors).sort()).toEqual(["birthDate", "email", "fullName", "sex"]);
  });

  it.each([
    ["Al", "menos de 3"],
    ["a".repeat(101), "más de 100"],
    ["   ", "solo espacios"],
  ])("rechaza el nombre %#: %s", (fullName) => {
    expect(validateEnrollment({ ...valid, fullName }, TODAY).fullName).toBeDefined();
  });

  it("acepta un nombre de 3 y de 100 caracteres", () => {
    expect(validateEnrollment({ ...valid, fullName: "Ana" }, TODAY).fullName).toBeUndefined();
    expect(
      validateEnrollment({ ...valid, fullName: "a".repeat(100) }, TODAY).fullName,
    ).toBeUndefined();
  });

  it("rechaza una fecha de nacimiento posterior a hoy con el mensaje de la historia", () => {
    expect(validateEnrollment({ ...valid, birthDate: "2026-11-19" }, TODAY).birthDate).toBe(
      FUTURE_BIRTH_DATE_MESSAGE,
    );
  });

  it("acepta como fecha de nacimiento el día de hoy", () => {
    expect(validateEnrollment({ ...valid, birthDate: TODAY }, TODAY).birthDate).toBeUndefined();
  });

  it.each(["ana", "ana@correo", "ana @correo.com", `${"a".repeat(110)}@correo.com`])(
    "rechaza el correo %s",
    (email) => {
      expect(validateEnrollment({ ...valid, email }, TODAY).email).toBeDefined();
    },
  );

  it("arma el cuerpo con el nombre recortado y el correo en minúsculas", () => {
    expect(
      toEnrollMemberInput({ ...valid, fullName: "  Ana López ", email: " Ana@Correo.COM " }),
    ).toEqual({ ...valid, email: "ana@correo.com" });
  });

  it("todayIsoDate usa la fecha local en AAAA-MM-DD", () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("applyEnrollError", () => {
  it("409 queda bajo el correo, sin mensaje general", () => {
    expect(applyEnrollError({ status: 409, error: EMAIL_TAKEN_MESSAGE })).toEqual({
      fieldErrors: { email: EMAIL_TAKEN_MESSAGE },
      message: null,
    });
  });

  it("400 por fecha futura queda bajo la fecha", () => {
    expect(
      applyEnrollError({ status: 400, error: FUTURE_BIRTH_DATE_MESSAGE }).fieldErrors,
    ).toEqual({ birthDate: FUTURE_BIRTH_DATE_MESSAGE });
  });

  it.each([
    [403, ACCESS_DENIED_MESSAGE],
    [500, ENROLL_SERVER_ERROR],
  ])("%i queda como mensaje general", (status, error) => {
    expect(applyEnrollError({ status, error })).toEqual({ fieldErrors: {}, message: error });
  });
});

describe("EnrollMemberFormView", () => {
  const render = (props: Partial<EnrollMemberFormViewProps> = {}) =>
    renderToStaticMarkup(
      <EnrollMemberFormView
        values={EMPTY_ENROLLMENT}
        errors={{}}
        submitting={false}
        serverError={null}
        maxBirthDate={TODAY}
        onChange={noop}
        onSubmit={noop}
        onCancel={noop}
        {...props}
      />,
    );

  it("muestra los cuatro campos, el sexo con sus opciones y las acciones", () => {
    const html = render();
    for (const label of ["Nombre completo", "Sexo", "Fecha de nacimiento", "Correo"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Masculino");
    expect(html).toContain("Femenino");
    expect(html).toContain("Inscribir");
    expect(html).toContain("Cancelar");
    expect(html).toContain(`max="${TODAY}"`);
  });

  it("mientras envía deshabilita el botón con el texto Inscribiendo…", () => {
    const html = render({ submitting: true });
    expect(html).toContain("Inscribiendo…");
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });

  it("muestra cada error bajo su campo", () => {
    const html = render({
      errors: { email: EMAIL_TAKEN_MESSAGE, birthDate: FUTURE_BIRTH_DATE_MESSAGE },
    });
    expect(html).toContain(EMAIL_TAKEN_MESSAGE);
    expect(html).toContain(FUTURE_BIRTH_DATE_MESSAGE);
    expect(html).toContain('id="email-error"');
  });

  it("conserva los datos escritos al mostrar un error del servidor", () => {
    const html = render({ values: valid, serverError: ENROLL_SERVER_ERROR });
    expect(html).toContain(ENROLL_SERVER_ERROR);
    expect(html).toContain('value="ana@correo.com"');
    expect(html).toContain('value="Ana López"');
  });
});

describe("EnrollmentResultDialog", () => {
  const member: EnrolledMember = {
    id: "7b0c2c1e-7d1f-4a43-9a52-0f8f3f7f3a10",
    memberCode: "GYM-000004",
    fullName: "Ana López",
    enrolledAt: TODAY,
    temporaryPassword: "Ab3dE5gH7k",
  };

  it("muestra el código, la contraseña temporal y el botón Copiar", () => {
    const html = renderToStaticMarkup(
      <EnrollmentResultDialog member={member} copied={false} onCopy={noop} onClose={noop} />,
    );
    expect(html).toContain("GYM-000004");
    expect(html).toContain("Ab3dE5gH7k");
    expect(html).toContain("Copiar");
  });

  it("indica cuando ya se copió", () => {
    const html = renderToStaticMarkup(
      <EnrollmentResultDialog member={member} copied onCopy={noop} onClose={noop} />,
    );
    expect(html).toContain("Copiado");
  });

  it("copia el código y la contraseña temporal", () => {
    expect(credentialsText(member)).toBe(
      "Código de miembro: GYM-000004\nContraseña temporal: Ab3dE5gH7k",
    );
  });
});
