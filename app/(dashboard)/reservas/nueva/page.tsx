import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { logout } from "@/app/actions/auth";
import NuevaReservaForm, { type FranjaEstado } from "@/app/components/reservas/NuevaReservaForm";
import { ApiError } from "@/lib/api";
import type { Area } from "@/lib/areas";
import { consultarDisponibilidad, listAreas } from "@/lib/areas-api";
import { horaEnCondominio, hoyEnCondominio } from "@/lib/condominio";
import { getCurrentUser } from "@/lib/current-user";
import {
  duracionMin,
  esFechaValida,
  franjaId,
  franjasDeArea,
  hrefDisponibilidad,
  type Franja,
} from "@/lib/disponibilidad";

export const metadata: Metadata = {
  title: "Nueva reserva",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Estado de cada franja del área en la fecha: una consulta de disponibilidad por franja.
async function estadoFranjas(area: Area, fecha: string, hoy: string): Promise<FranjaEstado[]> {
  const horaActual = fecha === hoy ? horaEnCondominio() : null;
  return Promise.all(
    franjasDeArea(area, fecha).map(async (franja: Franja): Promise<FranjaEstado> => {
      if (horaActual && franja.inicio <= horaActual) return { ...franja, estado: "pasada" };
      try {
        const { areas } = await consultarDisponibilidad({
          fecha,
          hora: franja.inicio,
          duracionMin: duracionMin(franja),
          areaId: area.id,
        });
        const d = areas.find((a) => a.areaId === area.id);
        if (!d) return { ...franja, estado: "error" };
        if (d.disponible) return { ...franja, estado: "disponible" };
        return {
          ...franja,
          estado:
            d.motivo === "RESERVADA" ? "reservada" : d.motivo === "BLOQUEADA" ? "bloqueada" : "cerrada",
        };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) throw error;
        console.error(`Error al consultar la franja ${franjaId(franja)}:`, error);
        return { ...franja, estado: "error" };
      }
    }),
  );
}

export default async function NuevaReservaPage(props: PageProps<"/reservas/nueva">) {
  const searchParams = await props.searchParams;
  const hoy = hoyEnCondominio();
  const fechaParam = first(searchParams.fecha);
  const fecha = fechaParam && esFechaValida(fechaParam) && fechaParam >= hoy ? fechaParam : hoy;

  let areas: Area[] = [];
  let errorCarga: "sesion" | "general" | null = null;
  try {
    areas = (await listAreas()) ?? [];
  } catch (error) {
    errorCarga = error instanceof ApiError && error.status === 401 ? "sesion" : "general";
    if (errorCarga === "general") console.error("Error al listar áreas:", error);
  }
  areas = areas
    .filter((a) => a.estado !== "ELIMINADA")
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const area = areas.find((a) => String(a.id) === first(searchParams.area)) ?? areas[0];

  let franjas: FranjaEstado[] = [];
  if (area && !errorCarga) {
    try {
      franjas = await estadoFranjas(area, fecha, hoy);
    } catch {
      errorCarga = "sesion";
    }
  }

  const usuario = await getCurrentUser();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 text-foreground">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
            Áreas y reservas
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-[40px]">Nueva reserva</h1>
          <p className="mt-2 text-sm text-secondary">
            Elige tu área, fecha y horario. Revisa los detalles antes de confirmar.
          </p>
        </div>
        <Link
          href={hrefDisponibilidad({ fecha, area: area?.id })}
          className="inline-flex items-center gap-3 rounded-lg border border-sage bg-surface px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/20"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Ver disponibilidad
        </Link>
      </div>

      {errorCarga === "sesion" ? (
        <Aviso>
          <p>Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
          <form action={logout}>
            <button type="submit" className="font-semibold text-secondary underline underline-offset-4">
              Ir a iniciar sesión
            </button>
          </form>
        </Aviso>
      ) : errorCarga ? (
        <Aviso>No se pudieron cargar las áreas comunes. Intenta recargar la página.</Aviso>
      ) : !area ? (
        <Aviso>Aún no hay áreas comunes disponibles para reservar.</Aviso>
      ) : (
        <NuevaReservaForm
          // Al cambiar de área o fecha se reinicia la selección.
          key={`${area.id}|${fecha}`}
          areas={areas.map(({ id, nombre }) => ({ id, nombre }))}
          area={area}
          fecha={fecha}
          hoy={hoy}
          franjas={franjas}
          franjaInicial={first(searchParams.franja)}
          unidad={usuario?.unit?.code ?? null}
          correo={usuario?.email ?? null}
        />
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg bg-sand/30 px-5 py-3 text-sm text-foreground"
    >
      <CircleAlert size={20} aria-hidden="true" className="shrink-0 text-danger" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
