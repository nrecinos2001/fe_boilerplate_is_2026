import Link from "next/link";

export const ACCESS_DENIED_MESSAGE = "No tienes permiso para ver esta página.";

/** Lo que ve un usuario cuyo rol no puede abrir la página. */
export function AccessDenied() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
        <p className="font-semibold text-red-800 dark:text-red-300">{ACCESS_DENIED_MESSAGE}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
