"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Eye, EyeOff, KeyRound, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { registrarUsuario, type UsuarioFormState } from "@/app/actions/usuarios";
import {
  EMAIL_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  ROL_CREABLE,
  ROLES_CREABLES,
  unidadesPorTorre,
  type RolCreable,
  type UnidadCondominio,
} from "@/lib/usuarios";

const inputClass =
  "w-full rounded-lg border border-sage bg-surface px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-secondary focus:ring-2 focus:ring-secondary/20 aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50";

const ICONO_ROL = { RESIDENTE: UserRound, SEGURIDAD: ShieldCheck } as const;

// Sin caracteres que se confunden al dictarlos o copiarlos (0/O, 1/l/I).
const MINUSCULAS = "abcdefghijkmnpqrstuvwxyz";
const MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITOS = "23456789";

function aleatorio(conjunto: string) {
  const n = crypto.getRandomValues(new Uint32Array(1))[0];
  return conjunto[n % conjunto.length];
}

/** 12 caracteres con al menos una minúscula, una mayúscula y un número (regla del backend). */
function generarPassword() {
  const todos = MINUSCULAS + MAYUSCULAS + DIGITOS;
  const chars = [aleatorio(MINUSCULAS), aleatorio(MAYUSCULAS), aleatorio(DIGITOS)];
  while (chars.length < 12) chars.push(aleatorio(todos));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function RegistroUsuarioForm({ unidades }: { unidades: UnidadCondominio[] | null }) {
  const [state, formAction, pending] = useActionState<UsuarioFormState, FormData>(registrarUsuario, {});
  const values = state.values ?? { email: "", role: "RESIDENTE" as RolCreable, unitId: "" };
  const errors = state.fieldErrors ?? {};

  const [rol, setRol] = useState<RolCreable>(values.role);
  const [verPassword, setVerPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const torres = unidades ? unidadesPorTorre(unidades) : [];
  const sinUnidades = rol === "RESIDENTE" && torres.length === 0;

  function generar() {
    if (!passwordRef.current) return;
    passwordRef.current.value = generarPassword();
    setVerPassword(true);
    passwordRef.current.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      {state.creado && (
        <div role="status" className="flex items-start gap-3 rounded-lg bg-sage/25 px-5 py-4 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {ROL_CREABLE[state.creado.role].registrado}: {state.creado.email}
              {state.creado.unidad && ` · ${state.creado.unidad}`}
            </p>
            <p className="mt-1 text-secondary">
              Ya puede iniciar sesión con ese correo y la contraseña que le asignaste. Compártela por un medio
              seguro: Habita no la vuelve a mostrar.
            </p>
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="flex items-center gap-3 rounded-lg bg-sand/30 px-5 py-3 text-sm text-foreground">
          <TriangleAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />
          {state.error}
        </p>
      )}

      <form
        action={formAction}
        noValidate
        aria-labelledby="titulo-registro"
        className="rounded-xl border border-border bg-surface p-6"
      >
        <h2 id="titulo-registro" className="text-lg font-semibold">
          Datos de la cuenta
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Los administradores no se crean aquí. Todos los campos son obligatorios.
        </p>

        {/* React reinicia el formulario tras cada envío y eso devolvería los radios a su valor
            inicial: el rol que se envía sale del estado, no de los radios. */}
        <input type="hidden" name="role" value={rol} />

        <fieldset className="mt-6" aria-describedby={errors.role ? "role-error" : undefined}>
          <legend className="text-xs text-foreground">Tipo de usuario</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {ROLES_CREABLES.map((valor) => {
              const Icono = ICONO_ROL[valor];
              const elegido = rol === valor;
              return (
                <label
                  key={valor}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-secondary/30 ${
                    elegido ? "border-secondary bg-sage/15" : "border-border hover:border-sage"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo-usuario"
                    value={valor}
                    checked={elegido}
                    onChange={() => setRol(valor)}
                    className="sr-only"
                  />
                  <Icono className={`mt-0.5 size-5 shrink-0 ${elegido ? "text-secondary" : "text-muted"}`} aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold">{ROL_CREABLE[valor].titulo}</span>
                    <span className="mt-1 block text-xs text-secondary">{ROL_CREABLE[valor].descripcion}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.role && (
            <p id="role-error" className="mt-2 text-xs text-danger">
              {errors.role}
            </p>
          )}
        </fieldset>

        <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Correo electrónico" name="email" error={errors.email} className="sm:col-span-2">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              inputMode="email"
              maxLength={EMAIL_MAX}
              defaultValue={values.email}
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : "email-ayuda"}
              placeholder="nombre@correo.com"
              className={inputClass}
            />
            {!errors.email && (
              <p id="email-ayuda" className="text-xs text-muted">
                Con este correo iniciará sesión. Debe ser único en el sistema.
              </p>
            )}
          </Field>

          {rol === "RESIDENTE" && (
            <Field label="Unidad" name="unitId" error={errors.unitId} className="sm:col-span-2">
              {sinUnidades ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-secondary">
                  {unidades === null
                    ? "No se pudieron cargar las unidades. Recarga la página para registrar residentes."
                    : "No hay unidades activas en el condominio."}
                </p>
              ) : (
                <div className="relative">
                  <select
                    id="unitId"
                    name="unitId"
                    defaultValue={values.unitId}
                    required
                    aria-invalid={Boolean(errors.unitId)}
                    aria-describedby={errors.unitId ? "unitId-error" : undefined}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="" disabled>
                      Elige la unidad
                    </option>
                    {torres.map(({ torre, unidades }) => (
                      <optgroup key={torre} label={torre}>
                        {unidades.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.code} · {u.description}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" aria-hidden="true" />
                </div>
              )}
            </Field>
          )}

          <Field label="Contraseña inicial" name="password" error={errors.password} className="sm:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={verPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  required
                  spellCheck={false}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : "password-ayuda"}
                  className={`${inputClass} pr-12 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={verPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-foreground"
                >
                  {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generar}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-sage px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-sage/20"
              >
                <KeyRound className="size-4" aria-hidden="true" />
                Generar
              </button>
            </div>
            {!errors.password && (
              <p id="password-ayuda" className="text-xs text-muted">
                Entre {PASSWORD_MIN} y {PASSWORD_MAX} caracteres, con al menos una minúscula, una mayúscula y un
                número. Anótala antes de registrar: no se vuelve a mostrar.
              </p>
            )}
          </Field>
        </div>

        <div className="mt-8 flex justify-end border-t border-border pt-6">
          <button
            type="submit"
            disabled={pending || sinUnidades}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Registrando…" : ROL_CREABLE[rol].boton}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  error,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={name} className="text-xs text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
