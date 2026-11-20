"use client";

import { useEffect, useRef, useState } from "react";
import { lookupMembers, registerCheckIn } from "@/src/services/check-ins/check-ins-service";
import type { CheckInMember } from "@/src/types/check-ins";
import { checkInSuccessMessage, LOOKUP_DEBOUNCE_MS, shouldLookup } from "./check-in-logic";
import { CheckInView } from "./check-in-view";

/** Check-in en recepción (H13 · FE-13.1). */
export function CheckInScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CheckInMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CheckInMember | null>(null);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Busca 400 ms después de dejar de escribir; con menos de 2 caracteres no busca.
  useEffect(() => {
    if (!shouldLookup(term) || selected) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      lookupMembers(term).then((res) => {
        if (cancelled) return;
        setSearching(false);
        if (res.ok) {
          setResults(res.data);
          setSearchError(null);
        } else {
          setResults([]);
          setSearchError(res.error);
        }
      });
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, selected]);

  function handleTermChange(next: string) {
    setTerm(next);
    setSelected(null);
    setResults([]);
    setSearching(false);
    setSearchError(null);
    setSuccess(null);
    setError(null);
  }

  function handleSelect(member: CheckInMember) {
    setSelected(member);
    setError(null);
    setSuccess(null);
  }

  async function handleRegister() {
    if (!selected) return;
    setRegistering(true);
    setError(null);
    const res = await registerCheckIn(selected.memberId);
    setRegistering(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Éxito: se limpia el buscador y el foco vuelve a él para el siguiente miembro.
    setSuccess(checkInSuccessMessage(res.data.checkedInAt));
    setTerm("");
    setResults([]);
    setSelected(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <CheckInView
      term={term}
      inputRef={inputRef}
      results={results}
      searching={searching}
      searchError={searchError}
      selected={selected}
      registering={registering}
      success={success}
      error={error}
      onTermChange={handleTermChange}
      onSelect={handleSelect}
      onRegister={handleRegister}
    />
  );
}
