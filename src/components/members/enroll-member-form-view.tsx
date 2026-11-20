import { SEX_LABELS, type Sex } from "@/src/types/members";
import type { EnrollMemberErrors, EnrollMemberValues } from "./enroll-member-logic";

type Field = keyof EnrollMemberValues;

const INPUT_CLASS =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-500 disabled:opacity-60 dark:border-zinc-700 dark:focus:border-zinc-100";

export type EnrollMemberFormViewProps = {
  values: EnrollMemberValues;
  errors: EnrollMemberErrors;
  submitting: boolean;
  serverError: string | null;
  /** Fecha máxima del selector de nacimiento (hoy). */
  maxBirthDate: string;
  onChange: (field: Field, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/** Formulario de inscripción sin estado propio (FE-1.1). */
export function EnrollMemberFormView({
  values,
  errors,
  submitting,
  serverError,
  maxBirthDate,
  onChange,
  onSubmit,
  onCancel,
}: EnrollMemberFormViewProps) {
  const fieldProps = (name: Field) => ({
    id: name,
    name,
    disabled: submitting,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: INPUT_CLASS,
  });

  const fieldError = (name: Field) =>
    errors[name] ? (
      <p id={`${name}-error`} className="text-sm text-red-600">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="fullName" className="text-sm font-medium">
          Nombre completo
        </label>
        <input
          {...fieldProps("fullName")}
          type="text"
          autoComplete="off"
          maxLength={100}
          value={values.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
        />
        {fieldError("fullName")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sex" className="text-sm font-medium">
          Sexo
        </label>
        <select
          {...fieldProps("sex")}
          value={values.sex}
          onChange={(event) => onChange("sex", event.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {(Object.keys(SEX_LABELS) as Sex[]).map((sex) => (
            <option key={sex} value={sex}>
              {SEX_LABELS[sex]}
            </option>
          ))}
        </select>
        {fieldError("sex")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="birthDate" className="text-sm font-medium">
          Fecha de nacimiento
        </label>
        <input
          {...fieldProps("birthDate")}
          type="date"
          max={maxBirthDate}
          value={values.birthDate}
          onChange={(event) => onChange("birthDate", event.target.value)}
        />
        {fieldError("birthDate")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Correo
        </label>
        <input
          {...fieldProps("email")}
          type="email"
          autoComplete="off"
          maxLength={120}
          placeholder="miembro@correo.com"
          value={values.email}
          onChange={(event) => onChange("email", event.target.value)}
        />
        {fieldError("email")}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {serverError}
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
        >
          {submitting ? "Inscribiendo…" : "Inscribir"}
        </button>
      </div>
    </form>
  );
}
