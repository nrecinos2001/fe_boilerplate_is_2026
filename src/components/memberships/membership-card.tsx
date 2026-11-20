import { membershipView, type MembershipTone, type MyMembership } from "@/src/types/membership";

const TONE_STYLES: Record<MembershipTone, { card: string; badge: string }> = {
  success: {
    card: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
    badge: "bg-emerald-600 text-white",
  },
  warning: {
    card: "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40",
    badge: "bg-amber-500 text-zinc-950",
  },
  danger: {
    card: "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
    badge: "bg-red-600 text-white",
  },
  neutral: {
    card: "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
    badge: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  },
};

type MembershipCardProps = {
  membership: MyMembership;
};

/** H05 · Tarjeta "Mi membresía": plan, estado, vencimiento y días restantes. */
export function MembershipCard({ membership }: MembershipCardProps) {
  const view = membershipView(membership);
  const styles = TONE_STYLES[view.tone];

  return (
    <section
      aria-labelledby="tu-membresia-titulo"
      data-tone={view.tone}
      className={`w-full rounded-xl border-2 p-5 shadow-sm ${styles.card}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tu-membresia-titulo" className="text-lg font-semibold">
          Tu membresía
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${styles.badge} ${
            view.highlighted ? "ring-2 ring-offset-2 ring-current uppercase tracking-wide" : ""
          }`}
        >
          {view.statusLabel}
        </span>
      </div>

      {view.planLabel && (
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Plan</dt>
            <dd className="text-base font-medium">{view.planLabel}</dd>
          </div>
          {view.endDateLabel && (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Vence el</dt>
              <dd className="text-base font-medium">{view.endDateLabel}</dd>
            </div>
          )}
          {view.daysLeftLabel && (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Días restantes</dt>
              <dd className="text-base font-medium">{view.daysLeftLabel}</dd>
            </div>
          )}
          {view.includedClassLabel && (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Clase incluida</dt>
              <dd className="text-base font-medium">{view.includedClassLabel}</dd>
            </div>
          )}
        </dl>
      )}

      {view.message && (
        <p
          role={view.highlighted ? "alert" : undefined}
          className={`mt-4 text-sm ${view.highlighted ? "font-semibold" : "text-zinc-700 dark:text-zinc-300"}`}
        >
          {view.message}
        </p>
      )}
    </section>
  );
}
