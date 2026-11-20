import Link from "next/link";
import type { MemberSearchItem, SoldDropIn, SoldMembership } from "@/src/types/membership-sales";
import { chargeScreenHref, formatDate, formatTime, saleSuccessMessage } from "./sale-logic";

export type SaleSummaryProps = {
  sale: SoldMembership;
  member: MemberSearchItem;
  onNewSale: () => void;
};

/** Resumen de la membresía registrada, con su cobro pendiente (FE-4.1). */
export function SaleSummary({ sale, member, onNewSale }: SaleSummaryProps) {
  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <p
        role="status"
        className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {saleSuccessMessage(sale.endDate)}
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-500">Miembro</dt>
        <dd className="font-medium">
          {member.fullName} <span className="font-mono text-xs text-zinc-500">{member.memberCode}</span>
        </dd>
        <dt className="text-zinc-500">Plan</dt>
        <dd>
          {sale.plan}
          {sale.isRenewal && <span className="ml-2 text-xs text-zinc-500">(renovación)</span>}
        </dd>
        <dt className="text-zinc-500">Inicia</dt>
        <dd>{formatDate(sale.startDate)}</dd>
        <dt className="text-zinc-500">Vence</dt>
        <dd className="font-semibold">{formatDate(sale.endDate)}</dd>
        <dt className="text-zinc-500">Estado</dt>
        <dd>Pendiente de pago</dd>
        <dt className="text-zinc-500">Cobro</dt>
        <dd className="tabular-nums">${sale.amount.toFixed(2)}</dd>
      </dl>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onNewSale}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Registrar otra
        </button>
        <Link
          href={chargeScreenHref(member.id)}
          className="rounded-md bg-foreground px-4 py-2 text-center text-sm font-medium text-background"
        >
          Ir a cobrar
        </Link>
      </div>
    </section>
  );
}

export type DropInSummaryProps = {
  sale: SoldDropIn;
  member: MemberSearchItem;
  onNewSale: () => void;
};

/** Resumen de la clase suelta vendida: ya está pagada y trae su comprobante (FE-4.1). */
export function DropInSummary({ sale, member, onNewSale }: DropInSummaryProps) {
  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <p
        role="status"
        className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {saleSuccessMessage(sale.endDate)}
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-500">Miembro</dt>
        <dd className="font-medium">
          {member.fullName} <span className="font-mono text-xs text-zinc-500">{member.memberCode}</span>
        </dd>
        <dt className="text-zinc-500">Plan</dt>
        <dd>Clase suelta</dd>
        <dt className="text-zinc-500">Clase</dt>
        <dd>
          {sale.className} · {formatTime(sale.classStartsAt)}
        </dd>
        <dt className="text-zinc-500">Estado</dt>
        <dd>Activa</dd>
        <dt className="text-zinc-500">Pagado</dt>
        <dd className="tabular-nums">${sale.amount.toFixed(2)}</dd>
        <dt className="text-zinc-500">Comprobante</dt>
        <dd className="font-mono font-semibold">{sale.receiptNumber}</dd>
      </dl>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNewSale}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Registrar otra
        </button>
      </div>
    </section>
  );
}
