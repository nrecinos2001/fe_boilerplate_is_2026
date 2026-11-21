import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { formatFranja, franjaId, type Franja } from "@/lib/disponibilidad";
import { hrefNuevaReserva } from "@/lib/reservas";

/** Estado de un área en una franja, ya resuelto para mostrarse. */
export type Celda =
  | "disponible"
  | "reservada"
  | "bloqueada"
  | "cerrada"
  /** La franja ya empezó o terminó (solo aplica a hoy). */
  | "pasada"
  /** La franja no coincide con los bloques de esta área (áreas con bloques distintos). */
  | "sin-franja"
  /** No se pudo consultar la disponibilidad de esta franja. */
  | "error";

export type FilaArea = {
  id: number;
  nombre: string;
  ubicacion: string;
  capacidad: number;
  /** Una celda por columna, en el mismo orden que `franjas`. */
  celdas: Celda[];
};

const CELDAS: Record<Celda, { titulo: string; detalle: string; clase: string }> = {
  disponible: {
    titulo: "Disponible",
    detalle: "Reservar",
    clase: "border border-sage bg-sage/25 text-foreground",
  },
  reservada: {
    titulo: "Ocupado",
    detalle: "No disponible",
    clase: "bg-sand/30 text-foreground",
  },
  bloqueada: {
    titulo: "Bloqueado",
    detalle: "Cerrado temporalmente",
    clase: "bg-sand/30 text-foreground",
  },
  cerrada: {
    titulo: "Cerrado",
    detalle: "Fuera de horario",
    clase: "bg-sand/15 text-muted",
  },
  pasada: {
    titulo: "Finalizado",
    detalle: "Horario pasado",
    clase: "bg-sand/15 text-muted",
  },
  "sin-franja": {
    titulo: "—",
    detalle: "Sin bloque en esta franja",
    clase: "border border-dashed border-border text-muted",
  },
  error: {
    titulo: "Sin datos",
    detalle: "Intenta de nuevo",
    clase: "bg-sand/15 text-danger",
  },
};

function CeldaFranja({ celda, reservarHref }: { celda: Celda; reservarHref: string }) {
  const { titulo, detalle, clase } = CELDAS[celda];
  const contenido = (
    <>
      <span className="text-xs font-semibold">{titulo}</span>
      {celda === "sin-franja" ? (
        <span className="sr-only">{detalle}</span>
      ) : (
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-secondary">
          {celda === "disponible" && <Plus size={12} aria-hidden="true" />}
          {detalle}
        </span>
      )}
    </>
  );
  const base = `flex min-h-[70px] flex-col items-center justify-center rounded-lg px-2 py-3 text-center ${clase}`;

  // Las franjas disponibles llevan a la nueva reserva con el área, la fecha y la franja elegidas.
  if (celda === "disponible") {
    return (
      <Link href={reservarHref} className={`${base} transition-colors hover:bg-sage/40`}>
        {contenido}
      </Link>
    );
  }
  return <div className={base}>{contenido}</div>;
}

export default function TablaDisponibilidad({
  franjas,
  filas,
  fecha,
  descripcion,
}: {
  franjas: Franja[];
  /** Fecha consultada ("YYYY-MM-DD"), para enlazar a la nueva reserva. */
  fecha: string;
  filas: FilaArea[];
  /** Texto para lectores de pantalla, p. ej. "Disponibilidad del sábado 07 …". */
  descripcion: string;
}) {
  return (
    <div className="overflow-x-auto">
      {/* table-fixed: todas las franjas miden lo mismo, sin importar el texto de cada celda. */}
      <table
        className="w-full table-fixed text-left text-sm"
        style={{ minWidth: `${240 + franjas.length * 110}px` }}
      >
        <caption className="sr-only">{descripcion}</caption>
        <thead className="bg-sand/30 text-[11px] font-semibold tracking-wide text-foreground uppercase">
          <tr>
            <th scope="col" className="w-60 px-6 py-4">
              Área común · Nombre A–Z
            </th>
            {franjas.map((franja) => (
              <th
                key={franjaId(franja)}
                scope="col"
                className="px-1.5 py-4 text-center text-xs normal-case"
              >
                {formatFranja(franja)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id} className="border-b border-border">
              <th scope="row" className="px-6 py-5 align-middle font-normal">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sand/30 text-secondary">
                    <LayoutGrid size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold">{fila.nombre}</p>
                    {fila.ubicacion && <p className="mt-1 text-xs text-muted">{fila.ubicacion}</p>}
                    <p className="mt-1 text-xs text-muted">Hasta {fila.capacidad} personas</p>
                  </div>
                </div>
              </th>
              {fila.celdas.map((celda, i) => (
                <td key={franjaId(franjas[i])} className="px-1.5 py-5">
                  <CeldaFranja
                    celda={celda}
                    reservarHref={hrefNuevaReserva({ area: fila.id, fecha, franja: franjaId(franjas[i]) })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
