import type { ChangePasswordErrors, ChangePasswordValues } from "./change-password-logic";

type Field = keyof ChangePasswordValues;

const FIELDS: { name: Field; label: string; autoComplete: string }[] = [
  { name: "currentPassword", label: "Contraseña actual", autoComplete: "current-password" },
  { name: "newPassword", label: "Nueva contraseña", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirmar contraseña", autoComplete: "new-password" },
];

export type ChangePasswordFormViewProps = {
  values: ChangePasswordValues;
  errors: ChangePasswordErrors;
  submitting: boolean;
  serverError: string | null;
  success: string | null;
  onChange: (field: Field, value: string) => void;
  onSubmit: () => void;
};

/** Formulario de cambio de contraseña sin estado propio (FE-1.2). */
export function ChangePasswordFormView({
  values,
  errors,
  submitting,
  serverError,
  success,
  onChange,
  onSubmit,
}: ChangePasswordFormViewProps) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {FIELDS.map(({ name, label, autoComplete }) => (
        <div key={name} className="flex flex-col gap-1">
          <label htmlFor={name} className="text-sm font-medium">
            {label}
          </label>
          <input
            id={name}
            name={name}
            type="password"
            autoComplete={autoComplete}
            value={values[name]}
            disabled={submitting || Boolean(success)}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            onChange={(event) => onChange(name, event.target.value)}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-500 dark:border-zinc-700 dark:focus:border-zinc-100"
          />
          {errors[name] && (
            <p id={`${name}-error`} className="text-sm text-red-600">
              {errors[name]}
            </p>
          )}
        </div>
      ))}

      <p className="text-xs text-zinc-500">
        De 8 a 72 caracteres, con al menos una minúscula, una mayúscula y un número.
      </p>

      <div aria-live="polite" className="min-h-5 text-sm">
        {serverError && <p className="text-red-600">{serverError}</p>}
        {success && <p className="text-emerald-600">{success}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting || Boolean(success)}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:opacity-60"
      >
        {submitting ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
