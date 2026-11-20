import type { MemberSearchItem } from "@/src/types/membership-sales";
import { NO_MEMBERS_FOUND_MESSAGE, shouldSearch } from "./sale-logic";

export type MemberPickerProps = {
  term: string;
  results: MemberSearchItem[];
  searching: boolean;
  searchError: string | null;
  selected: MemberSearchItem | null;
  error?: string;
  disabled: boolean;
  onTermChange: (term: string) => void;
  onSelect: (member: MemberSearchItem) => void;
  onClear: () => void;
};

/** Buscador de miembros por código exacto o parte del nombre (FE-4.1). */
export function MemberPicker({
  term,
  results,
  searching,
  searchError,
  selected,
  error,
  disabled,
  onTermChange,
  onSelect,
  onClear,
}: MemberPickerProps) {
  if (selected) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Miembro</span>
        <div className="flex items-center justify-between rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700">
          <span>
            <span className="font-medium">{selected.fullName}</span>{" "}
            <span className="font-mono text-xs text-zinc-500">{selected.memberCode}</span>
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="text-sm text-indigo-700 disabled:opacity-60 dark:text-indigo-300"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  const showResults = shouldSearch(term) && !searching && !searchError;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="member-search" className="text-sm font-medium">
        Miembro
      </label>
      <input
        id="member-search"
        type="search"
        autoComplete="off"
        maxLength={100}
        placeholder="Código (GYM-000001) o nombre"
        value={term}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(event) => onTermChange(event.target.value)}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-500 dark:border-zinc-700 dark:focus:border-zinc-100"
      />
      {searching && <p className="text-sm text-zinc-500">Buscando...</p>}
      {searchError && <p className="text-sm text-red-600">{searchError}</p>}
      {showResults && results.length === 0 && (
        <p className="text-sm text-zinc-500">{NO_MEMBERS_FOUND_MESSAGE}</p>
      )}
      {showResults && results.length > 0 && (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {results.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => onSelect(member)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span className="font-medium">{member.fullName}</span>
                <span className="font-mono text-xs text-zinc-500">{member.memberCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
