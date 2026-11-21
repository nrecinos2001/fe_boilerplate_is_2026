"use server";

import { ApiError } from "@/lib/api";
import { expireSession } from "@/lib/session";
import { crearUsuario } from "@/lib/usuarios-api";
import {
  errorEmail,
  errorPassword,
  esRolCreable,
  type NuevoUsuario,
  type RolCreable,
} from "@/lib/usuarios";

export type UsuarioFormValues = {
  email: string;
  role: RolCreable;
  unitId: string;
};

export type UsuarioCreadoResumen = {
  email: string;
  role: RolCreable;
  unidad: string | null;
};

export type UsuarioFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "role" | "unitId", string>>;
  /** La contraseña nunca se devuelve: tras un error hay que escribirla de nuevo. */
  values?: UsuarioFormValues;
  creado?: UsuarioCreadoResumen;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mensajeApi(error: ApiError): string {
  switch (error.status) {
    case 409:
      return "Ya existe una cuenta con ese correo.";
    case 404:
      return "La unidad elegida ya no existe. Recarga la página y elige otra.";
    case 403:
      return "Solo un administrador puede registrar usuarios.";
    case 400:
      return error.message || "Revisa los datos del formulario.";
    case 0:
      return "No se pudo conectar con el servidor. Intenta más tarde.";
    default:
      return "No se pudo registrar el usuario. Intenta más tarde.";
  }
}

export async function registrarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const rolEnviado = String(formData.get("role") ?? "");
  const values: UsuarioFormValues = {
    // El backend también normaliza: sin espacios y en minúsculas.
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: esRolCreable(rolEnviado) ? rolEnviado : "RESIDENTE",
    unitId: String(formData.get("unitId") ?? "").trim(),
  };
  const password = String(formData.get("password") ?? "");

  const fieldErrors: UsuarioFormState["fieldErrors"] = {};
  const emailError = errorEmail(values.email);
  if (emailError) fieldErrors.email = emailError;
  const passwordError = errorPassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (!esRolCreable(rolEnviado)) fieldErrors.role = "Elige el tipo de usuario.";
  if (values.role === "RESIDENTE" && !UUID.test(values.unitId)) {
    fieldErrors.unitId = "Elige la unidad del residente.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Revisa los campos marcados.", fieldErrors, values };
  }

  const input: NuevoUsuario = {
    email: values.email,
    password,
    role: values.role,
    // Un guardia no pertenece a una unidad: el backend responde 400 si se envía.
    ...(values.role === "RESIDENTE" ? { unitId: values.unitId } : {}),
  };

  try {
    const usuario = await crearUsuario(input);
    return {
      creado: {
        email: usuario.email,
        role: usuario.role,
        unidad: usuario.unit ? `${usuario.unit.code} · ${usuario.unit.tower}` : null,
      },
      // Formulario limpio para registrar a otra persona, con el mismo tipo elegido.
      values: { email: "", role: values.role, unitId: "" },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) await expireSession();
      const mensaje = mensajeApi(error);
      if (error.status === 409) {
        return { error: mensaje, fieldErrors: { email: mensaje }, values };
      }
      if (error.status === 404) {
        return { error: mensaje, fieldErrors: { unitId: mensaje }, values };
      }
      return { error: mensaje, values };
    }
    console.error("Error al registrar el usuario:", error);
    return { error: "No se pudo registrar el usuario. Intenta más tarde.", values };
  }
}
