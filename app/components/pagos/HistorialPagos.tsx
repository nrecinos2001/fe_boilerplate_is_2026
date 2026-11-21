import Paginacion from "@/app/components/pagos/Paginacion";
import SelectorUrl from "@/app/components/pagos/SelectorUrl";
import {
  MONEDA,
  fechaCorta,
  formatMonto,
  horaDeIso,
  tituloCuota,
  type Cuota,
  type PagoLinea,
} from "@/lib/estado-cuenta";

type Props = {
  pagos: PagoLinea[];
  /** Para mostrar el concepto de cada línea de pago. */
  cuotasPorId: Map<number, Cuota>;
  total: number;
  anio: string;
  anios: string[];
  pagina: number;
  totalPaginas: number;
  tamano: number;
  hrefPagina: (pagina: number) => string;
};

const columnas = "md:grid-cols-[130px_minmax(0,1fr)_130px_110px]";

export default function HistorialPagos({
  pagos,
  cuotasPorId,
  total,
  anio,
  anios,
  pagina,
  totalPaginas,
  tamano,
  hrefPagina,
}: Props) {
  return (
    <section aria-labelledby="titulo-pagos" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 pt-6 pb-5 sm:px-6">
        <div>
          <h2 id="titulo-pagos" className="text-lg font-semibold">
            Historial de pagos
          </h2>
          <p className="mt-1 text-xs text-secondary">Un pago puede cubrir varias cuotas: se muestra lo aplicado a cada una.</p>
        </div>
        {anios.length > 0 && (
          <SelectorUrl
            parametro="anio"
            etiqueta="Año de los pagos"
            etiquetaOculta
            valor={anio}
            reiniciar={["pp"]}
            opciones={[
              { valor: "", texto: "Todos los años" },
              ...anios.map((a) => ({ valor: a, texto: `Año ${a}` })),
            ]}
            className="w-40"
          />
        )}
      </div>

      {pagos.length === 0 ? (
        <p className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
          {anio ? `No hay pagos registrados en ${anio}.` : "Aún no hay pagos registrados para esta unidad."}
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`hidden bg-sand/30 px-6 py-3 text-[11px] font-semibold tracking-wide uppercase md:grid ${columnas} md:gap-4`}
          >
            <span>Fecha ↓</span>
            <span>Concepto</span>
            <span className="text-right">Importe ({MONEDA})</span>
            <span>Estado</span>
          </div>
          <ul>
            {pagos.map((linea) => {
              const cuota = cuotasPorId.get(linea.cuotaId);
              return (
                <li
                  key={linea.id}
                  className={`grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border px-4 py-4 text-sm sm:px-6 md:items-center ${columnas}`}
                >
                  <p className="col-span-2 md:col-span-1">
                    {fechaCorta(linea.fechaPago)}
                    <span className="ml-2 text-xs text-muted md:ml-0 md:block">{horaDeIso(linea.fechaPago)}</span>
                  </p>
                  <div className="col-span-2 md:col-span-1">
                    <p className="font-medium">{cuota ? tituloCuota(cuota) : `Cuota #${linea.cuotaId}`}</p>
                    <p className="mt-1 text-xs text-muted">
                      Pago #{linea.pagoId} · Cuota #{linea.cuotaId}
                    </p>
                  </div>
                  <p className="font-semibold md:text-right">{formatMonto(linea.monto)}</p>
                  <p className="text-right md:text-left">
                    <span className="inline-block rounded-full bg-moss/15 px-3 py-1 text-xs font-semibold">
                      Pagado
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
          <Paginacion
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            tamano={tamano}
            unidad={total === 1 ? "pago" : "pagos"}
            href={hrefPagina}
          />
        </>
      )}
    </section>
  );
}
