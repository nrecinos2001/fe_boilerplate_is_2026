import type { Metadata } from "next";
import { logout } from "@/app/actions/auth";
import { RegistroUsuarioForm } from "@/app/components/usuarios/RegistroUsuarioForm";
import { ApiError } from "@/lib/api";
import { CONDOMINIO } from "@/lib/condominio";
import { listarUnidades } from "@/lib/usuarios-api";
import type { UnidadCondominio } from "@/lib/usuarios";

export const metadata: Metadata = {
  title: "Registrar usuario",
};

export default async function UsuariosPage() {
  let unidades: UnidadCondominio[] | null = null;
  let sesionVencida = false;
  try {
    unidades = (await listarUnidades()) ?? [];
  } catch (error) {
    // Cualquier otro error se relanza: entre ellos el que Next usa para marcar la página
    // como dinámica al leer la cookie. Atraparlo la dejaría prerenderizada sin unidades.
    if (!(error instanceof ApiError)) throw error;
    sesionVencida = error.status === 401;
    if (!sesionVencida) console.error("Error al listar unidades:", error);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">Administración</p>
        <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-[40px]">Registrar usuario</h1>
        <p className="mt-2 text-sm text-secondary">
          Da de alta a residentes y al personal de seguridad de {CONDOMINIO.nombre}. No hay registro público: las
          cuentas solo se crean desde aquí.
        </p>
      </div>

      {sesionVencida ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface px-6 py-8 text-sm">
          <p>Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
          <form action={logout}>
            <button type="submit" className="font-semibold text-secondary underline underline-offset-4">
              Ir a iniciar sesión
            </button>
          </form>
        </div>
      ) : (
        <RegistroUsuarioForm unidades={unidades} />
      )}
    </div>
  );
}
