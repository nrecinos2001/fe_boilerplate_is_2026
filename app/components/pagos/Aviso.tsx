import { CircleAlert } from "lucide-react";
import { logout } from "@/app/actions/auth";

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg bg-sand/30 px-5 py-4 text-sm text-foreground">
      <CircleAlert size={20} aria-hidden="true" className="shrink-0 text-danger" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function SesionVencida() {
  return (
    <Aviso>
      <p>Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
      <form action={logout}>
        <button type="submit" className="font-semibold text-secondary underline underline-offset-4">
          Ir a iniciar sesión
        </button>
      </form>
    </Aviso>
  );
}
