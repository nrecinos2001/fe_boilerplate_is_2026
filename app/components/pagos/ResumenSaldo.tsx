import { CalendarDays, Clock, Wallet } from "lucide-react";
import { MONEDA, fechaCorta, formatMonto, nombrePeriodo, type resumenCuenta } from "@/lib/estado-cuenta";

type Resumen = ReturnType<typeof resumenCuenta>;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function Monto({ valor, claseMoneda }: { valor: number; claseMoneda: string }) {
  return (
    <p className="mt-4 flex flex-wrap items-baseline gap-2">
      <span className="font-serif text-4xl break-all sm:text-[42px]">{formatMonto(valor)}</span>
      <span className={`text-[10px] font-semibold ${claseMoneda}`}>{MONEDA}</span>
    </p>
  );
}

// Tres tarjetas: saldo total (de la API), importe vencido y próximo vencimiento.
export default function ResumenSaldo({ resumen }: { resumen: Resumen }) {
  const { saldoTotal, cuotasPorCubrir, vencido, proxima } = resumen;

  return (
    <section aria-label="Resumen de saldo" className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl bg-primary p-6 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm">Saldo pendiente total</h2>
          <Wallet size={20} aria-hidden="true" className="text-sand" />
        </div>
        <Monto valor={saldoTotal} claseMoneda="text-primary-foreground/70" />
        <p className="mt-4 text-xs text-primary-foreground/75">
          {cuotasPorCubrir > 0
            ? plural(cuotasPorCubrir, "cuota por cubrir", "cuotas por cubrir")
            : "Estás al día"}
        </p>
      </div>

      <div className="rounded-xl bg-sand/30 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm text-secondary">Importe vencido</h2>
          <Clock size={20} aria-hidden="true" className="text-secondary" />
        </div>
        <Monto valor={vencido.importe} claseMoneda="text-secondary" />
        <p className="mt-4 text-xs text-secondary">
          {vencido.desde
            ? `${plural(vencido.cuotas, "cuota", "cuotas")} · Venció el ${fechaCorta(vencido.desde)}`
            : "Sin cuotas vencidas"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm text-secondary">Próximo vencimiento</h2>
          <CalendarDays size={20} aria-hidden="true" className="text-secondary" />
        </div>
        {proxima ? (
          <>
            <p className="mt-4 font-serif text-3xl sm:text-4xl">{fechaCorta(proxima.fechaVencimiento)}</p>
            <p className="mt-4 text-xs text-secondary">
              {proxima.concepto} · {nombrePeriodo(proxima.periodo)} · {formatMonto(proxima.saldo)} {MONEDA}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 font-serif text-3xl sm:text-4xl">—</p>
            <p className="mt-4 text-xs text-secondary">No tienes cuotas por vencer</p>
          </>
        )}
      </div>
    </section>
  );
}
