import Link from "next/link";
import { ArrowRight } from "lucide-react";
import EstadoCuotaBadge from "@/app/components/pagos/EstadoCuotaBadge";
import Paginacion from "@/app/components/pagos/Paginacion";
import {
  MONEDA,
  RUTA_PAGOS,
  estadoVista,
  fechaCorta,
  formatMonto,
  tituloCuota,
  type Cuota,
} from "@/lib/estado-cuenta";

export type VistaCuotas = "por-pagar" | "todas";

type Props = {
  cuotas: Cuota[];
  /** Total de cuotas de la vista (todas las páginas). */
  total: number;
  vista: VistaCuotas;
  hoy: string;
  /** Solo el residente de la unidad puede pagar. */
  puedePagar: boolean;
  hayPorPagar: boolean;
  pagina: number;
  totalPaginas: number;
  tamano: number;
  hrefVista: (vista: VistaCuotas) => string;
  hrefPagina: (pagina: number) => string;
};

const columnas = "md:grid-cols-[minmax(0,1fr)_120px_120px_120px_140px]";

export default function TablaCuotas({
  cuotas,
  total,
  vista,
  hoy,
  puedePagar,
  hayPorPagar,
  pagina,
  totalPaginas,
  tamano,
  hrefVista,
  hrefPagina,
}: Props) {
  return (
    <section aria-labelledby="titulo-cuotas" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 pt-6 pb-5 sm:px-6">
        <div>
          <h2 id="titulo-cuotas" className="text-lg font-semibold">
            {vista === "por-pagar" ? "Cuotas por pagar" : "Todas las cuotas"}
          </h2>
          <nav aria-label="Filtrar cuotas" className="mt-3 flex flex-wrap gap-2 text-xs">
            {(
              [
                ["por-pagar", "Pendientes y vencidas"],
                ["todas", "Todas, incluidas las pagadas"],
              ] as const
            ).map(([valor, texto]) => (
              <Link
                key={valor}
                href={hrefVista(valor)}
                scroll={false}
                aria-current={vista === valor ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
                  vista === valor ? "bg-sand/60" : "bg-sand/20 text-secondary hover:bg-sand/40"
                }`}
              >
                {texto}
              </Link>
            ))}
          </nav>
        </div>
        {puedePagar && hayPorPagar && (
          <Link
            href={RUTA_PAGOS}
            className="inline-flex items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss"
          >
            <ArrowRight size={18} aria-hidden="true" />
            Realizar pago
          </Link>
        )}
      </div>

      {cuotas.length === 0 ? (
        <p className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
          {vista === "por-pagar"
            ? "Estás al día: no tienes cuotas pendientes ni vencidas."
            : "Aún no hay cuotas registradas para esta unidad."}
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`hidden bg-sand/30 px-6 py-3 text-[11px] font-semibold tracking-wide uppercase md:grid ${columnas} md:gap-4`}
          >
            <span>Concepto / cuota</span>
            <span>Vencimiento {vista === "por-pagar" ? "↑" : "↓"}</span>
            <span className="text-right">Importe ({MONEDA})</span>
            <span className="text-right">Saldo ({MONEDA})</span>
            <span>Estado</span>
          </div>
          <ul>
            {cuotas.map((cuota) => (
              <li
                key={cuota.id}
                className={`grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border px-4 py-4 text-sm sm:px-6 md:items-center ${columnas}`}
              >
                <div className="col-span-2 md:col-span-1">
                  <p className="font-medium">{tituloCuota(cuota)}</p>
                  <p className="mt-1 text-xs text-muted">Cuota #{cuota.id}</p>
                </div>
                <p>
                  <span className="block text-[11px] text-muted md:hidden">Vencimiento</span>
                  {fechaCorta(cuota.fechaVencimiento)}
                </p>
                <p className="md:text-right">
                  <span className="block text-[11px] text-muted md:hidden">Importe</span>
                  {formatMonto(cuota.monto)}
                </p>
                <p className="font-semibold md:text-right">
                  <span className="block text-[11px] font-normal text-muted md:hidden">Saldo</span>
                  {formatMonto(cuota.saldo)}
                </p>
                <p className="self-end md:self-auto">
                  <EstadoCuotaBadge estado={estadoVista(cuota, hoy)} />
                </p>
              </li>
            ))}
          </ul>
          <Paginacion
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            tamano={tamano}
            unidad={total === 1 ? "cuota" : "cuotas"}
            href={hrefPagina}
          />
        </>
      )}
    </section>
  );
}
