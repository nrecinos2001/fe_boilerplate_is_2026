import type { EnrolledMember } from "@/src/types/members";

export type EnrollmentResultDialogProps = {
  member: EnrolledMember;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
};

/** Texto que se copia para entregarle el acceso al miembro. */
export function credentialsText(member: EnrolledMember): string {
  return `Código de miembro: ${member.memberCode}\nContraseña temporal: ${member.temporaryPassword}`;
}

/**
 * Ventana que aparece tras inscribir (FE-1.1). La contraseña temporal solo se
 * muestra aquí: el backend no la vuelve a entregar.
 */
export function EnrollmentResultDialog({
  member,
  copied,
  onCopy,
  onClose,
}: EnrollmentResultDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-result-title"
        className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl"
      >
        <h2 id="enrollment-result-title" className="text-lg font-semibold">
          Miembro inscrito
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Entrega estos datos a {member.fullName}. La contraseña temporal no se volverá a mostrar y
          deberá cambiarla en su primer inicio de sesión.
        </p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <dt className="text-zinc-500">Código de miembro</dt>
          <dd className="font-mono font-semibold">{member.memberCode}</dd>
          <dt className="text-zinc-500">Contraseña temporal</dt>
          <dd className="font-mono font-semibold">{member.temporaryPassword}</dd>
        </dl>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
