import Link from "next/link";
import { ShieldAlert } from "lucide-react";

const DEFAULT_MESSAGE =
  "El registro y la entrega de paquetes solo están disponibles para el personal de seguridad.";

export default function AccessDenied({
  message = DEFAULT_MESSAGE,
}: {
  message?: string;
}) {
  return (
    <div className="max-w-xl mx-auto mt-16 bg-white border border-gray-200 rounded-xl p-8 text-center">
      <ShieldAlert className="mx-auto text-[#0a2f1f] mb-4" size={36} />
      <h1 className="text-2xl font-serif text-gray-900 mb-2">
        No tienes acceso a esta sección
      </h1>
      <p className="text-gray-600 mb-6">{message}</p>
      <Link
        href="/"
        className="inline-block px-4 py-2 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
