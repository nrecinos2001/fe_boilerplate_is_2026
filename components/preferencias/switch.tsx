// components/preferencias/switch.tsx
"use client";

import { useId } from "react";

type Props = {
  label: string;
  descripcion: string;
  activo: boolean;
  onChange: (activo: boolean) => void;
  disabled?: boolean;
};

export function Switch({ label, descripcion, activo, onChange, disabled }: Props) {
  const id = useId();

  return (
      <div className="flex items-start justify-between gap-4 rounded-xl border border-borde bg-white p-5 transition-colors hover:bg-arena/30">
        <div className="flex-1">
          <label htmlFor={id} className="cursor-pointer">
            <p className="font-semibold text-habita-900">{label}</p>
            <p className="mt-1 text-sm text-habita-700">{descripcion}</p>
          </label>
        </div>

        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={activo}
            disabled={disabled}
            onClick={() => onChange(!activo)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-habita-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                activo ? "bg-habita-900" : "bg-gray-300"
            }`}
        >
        <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                activo ? "translate-x-5" : "translate-x-0"
            }`}
        />
        </button>
      </div>
  );
}