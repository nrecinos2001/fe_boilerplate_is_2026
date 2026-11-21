"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  /** Parámetro de la URL que controla el selector (p. ej. "unidad" o "anio"). */
  parametro: string;
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  /** Parámetros que se reinician al cambiar el valor (p. ej. la página). */
  reiniciar?: string[];
  /** Muestra la etiqueta solo a lectores de pantalla. */
  etiquetaOculta?: boolean;
  className?: string;
};

// Selector que guarda su valor en la URL, para que la vista se pueda recargar y compartir.
export default function SelectorUrl({
  parametro,
  etiqueta,
  valor,
  opciones,
  reiniciar = [],
  etiquetaOculta,
  className = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendiente, startTransition] = useTransition();
  const id = `selector-${parametro}`;

  function cambiar(nuevo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nuevo) params.set(parametro, nuevo);
    else params.delete(parametro);
    for (const p of reiniciar) params.delete(p);
    const qs = params.toString();
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  return (
    <div className={className}>
      <label htmlFor={id} className={etiquetaOculta ? "sr-only" : "mb-2 block text-xs font-medium"}>
        {etiqueta}
      </label>
      <div className="relative">
        <select
          id={id}
          value={valor}
          onChange={(e) => cambiar(e.target.value)}
          disabled={pendiente}
          className="w-full appearance-none rounded-lg border border-sage bg-surface py-2 pr-9 pl-3 text-sm text-foreground outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:opacity-60"
        >
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-secondary"
        />
      </div>
    </div>
  );
}
