import type { Ref } from "react";
import type { CheckInMember } from "@/src/types/check-ins";
import {
  isMembershipCurrent,
  nextPaymentLabel,
  NO_MEMBERS_FOUND_MESSAGE,
  shouldLookup,
  statusLabel,
} from "./check-in-logic";

const BADGE: Record<CheckInMember["membershipStatus"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  NONE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export type CheckInViewProps = {
  term: string;
  inputRef?: Ref<HTMLInputElement>;
  results: CheckInMember[];
  searching: boolean;
  searchError: string | null;
  selected: CheckInMember | null;
  registering: boolean;
  success: string | null;
  error: string | null;
  onTermChange: (term: string) => void;
  onSelect: (member: CheckInMember) => void;
  onRegister: () => void;
};

/** Pantalla de check-in sin estado propio (FE-13.1). */
export function CheckInView({
  term,
  inputRef,
  results,
  searching,
  searchError,
  selected,
  registering,
  success,
  error,
  onTermChange,
  onSelect,
  onRegister,
}: CheckInViewProps) {
  const showResults = shouldLookup(term) && !searching && !searchError && !selected;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="check-in-search" className="text-sm font-medium">
          Buscar miembro
        </label>
        <input
          ref={inputRef}
          id="check-in-search"
          type="search"
          autoComplete="off"
          autoFocus
          maxLength={100}
          placeholder="Código (GYM-000001) o nombre"
          value={term}
          disabled={registering}
          onChange={(event) => onTermChange(event.target.value)}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-lg outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        {searching && <p className="text-sm text-zinc-500">Buscando...</p>}
        {searchError && <p className="text-sm text-red-600">{searchError}</p>}
      </div>

      <div aria-live="polite" className="min-h-5 text-sm">
        {success && (
          <p
            role="status"
            className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            {success}
          </p>
        )}
        {error && <p className="text-red-600">{error}</p>}
      </div>

      {showResults && results.length === 0 && (
        <p className="text-sm text-zinc-500">{NO_MEMBERS_FOUND_MESSAGE}</p>
      )}
      {showResults && results.length > 0 && (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {results.map((member) => (
            <li key={member.memberId}>
              <button
                type="button"
                onClick={() => onSelect(member)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span>
                  <span className="font-medium">{member.fullName}</span>{" "}
                  <span className="font-mono text-xs text-zinc-500">{member.memberCode}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[member.membershipStatus]}`}
                >
                  {statusLabel(member)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <section
          aria-label="Miembro seleccionado"
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{selected.fullName}</p>
              <p className="font-mono text-sm text-zinc-500">{selected.memberCode}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${BADGE[selected.membershipStatus]}`}
            >
              {statusLabel(selected)}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
            <dt className="text-zinc-500">Próxima fecha de pago</dt>
            <dd className="font-medium">{nextPaymentLabel(selected)}</dd>
          </dl>
          {!isMembershipCurrent(selected) && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              La membresía de este miembro no está vigente.
            </p>
          )}
          <button
            type="button"
            onClick={onRegister}
            disabled={registering}
            className="rounded-md bg-foreground px-4 py-3 text-base font-semibold text-background transition-opacity disabled:opacity-60"
          >
            {registering ? "Registrando..." : "Registrar ingreso"}
          </button>
        </section>
      )}
    </div>
  );
}
