"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Home, X } from "lucide-react";
import { readError, type Unit } from "@/lib/paquetes";

type Props = {
  value: string;
  onChange: (unit: Unit | null) => void;
  error?: string;
};

const MAX_RESULTS = 6;

export default function UnitPicker({ value, onChange, error }: Props) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/unidades")
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return res.json() as Promise<Unit[]>;
      })
      .then((data) => {
        if (!cancelled) setUnits(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "No se pudieron cargar las unidades.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = units.find((u) => u.id === value) ?? null;

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return units
      .filter(
        (u) =>
          u.code.toLowerCase().includes(t) ||
          u.description.toLowerCase().includes(t),
      )
      .slice(0, MAX_RESULTS);
  }, [term, units]);

  if (selected) {
    return (
      <div className="bg-[#e6f0eb] rounded-xl p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Home className="text-[#0a2f1f] mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-gray-900">Unidad seleccionada</p>
            <p className="text-sm text-gray-700">
              {selected.code} · {selected.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTerm("");
          }}
          className="flex items-center gap-1 text-sm font-medium text-[#0a2f1f] underline"
        >
          <X size={14} /> Cambiar
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="buscar-unidad"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Unidad destinataria *
      </label>
      <div className="relative">
        <input
          id="buscar-unidad"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Busca por unidad, por ejemplo A-202"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          className={`w-full pl-4 pr-10 py-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={18}
        />
      </div>

      {matches.length > 0 && (
        <ul className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-200 bg-white overflow-hidden">
          {matches.map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                onClick={() => onChange(unit)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                <span className="font-semibold text-gray-900">{unit.code}</span>
                <span className="text-gray-600"> · {unit.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {term.trim() && matches.length === 0 && units.length > 0 && (
        <p className="mt-2 text-sm text-red-700">
          No existe una unidad que coincida con “{term.trim()}” en el
          condominio.
        </p>
      )}

      {loadError && <p className="mt-2 text-sm text-red-700">{loadError}</p>}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">
        Verifica que coincida con la etiqueta del paquete.
      </p>
    </div>
  );
}
