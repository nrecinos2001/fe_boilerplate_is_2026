import type { Metadata } from "next";
import Link from "next/link";
import AssemblyForm from "@/app/components/asambleas/AssemblyForm";
import AccessDenied from "@/app/components/paquetes/AccessDenied";
import { getCurrentUser } from "@/lib/current-user";
import { apiFetch, ApiError } from "@/lib/api";
import type { Assembly } from "@/lib/asambleas";

export const metadata: Metadata = {
  title: "Editar borrador",
};

export default async function EditarAsambleaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMINISTRADOR") {
    return <AccessDenied message="Solo la administración puede editar convocatorias." />;
  }

  const { id } = await params;
  let assembly: Assembly | null = null;
  let problem = "No se pudo cargar la convocatoria.";
  try {
    assembly = await apiFetch<Assembly>(`/asambleas/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      problem = "La asamblea no existe.";
    }
  }

  if (!assembly || assembly.publishedAt) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h1 className="text-2xl font-serif text-gray-900 mb-2">
          {assembly ? "La convocatoria ya fue publicada" : problem}
        </h1>
        <p className="text-gray-600 mb-6">
          {assembly
            ? "Ya no se edita como borrador; puedes modificar cada propuesta mientras su votación no abra."
            : "Vuelve al listado de asambleas."}
        </p>
        <Link
          href={assembly ? `/admin/asambleas/${assembly.id}` : "/admin/asambleas"}
          className="inline-block px-4 py-2 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33]"
        >
          {assembly ? "Ver convocatoria" : "Volver a asambleas"}
        </Link>
      </div>
    );
  }

  return <AssemblyForm assembly={assembly} />;
}
