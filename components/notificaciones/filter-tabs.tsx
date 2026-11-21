"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MODULOS, type Filtro, type ModuloFiltro } from "@/lib/notificaciones";

// ✅ AHORA ACEPTA 3 ARGUMENTOS
export function hrefNotificaciones(filtro: Filtro, page: number, modulo?: ModuloFiltro) {
  const params = new URLSearchParams();
  if (filtro !== "todas") params.set("filtro", filtro);
  if (page > 1) params.set("page", String(page));
  if (modulo && modulo !== "todos") params.set("modulo", modulo);
  return `/notificaciones${params.toString() ? `?${params.toString()}` : ""}`;
}

// ✅ PROPS ACTUALIZADAS CON moduloActivo
type Props = {
  activo: Filtro;
  noLeidas: number | null;
  moduloActivo: ModuloFiltro;
};

export function FilterTabs({ activo, noLeidas, moduloActivo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function cambiarFiltro(nuevoFiltro: Filtro) {
    router.push(hrefNotificaciones(nuevoFiltro, 1, moduloActivo));
  }

  function cambiarModulo(nuevoModulo: string) {
    router.push(hrefNotificaciones(activo, 1, nuevoModulo as ModuloFiltro));
  }

  const tabs: { valor: Filtro; etiqueta: string; contador?: number }[] = [
    { valor: "todas", etiqueta: "Todas" },
    { valor: "sin_leer", etiqueta: "Sin leer", contador: noLeidas ?? undefined },
    { valor: "leidas", etiqueta: "Leídas" },
  ];

  return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {tabs.map((t) => (
              <button
                  key={t.valor}
                  onClick={() => cambiarFiltro(t.valor)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      activo === t.valor
                          ? "bg-habita-900 text-white"
                          : "bg-arena text-habita-900 hover:bg-arena/70"
                  }`}
              >
                {t.etiqueta}
                {t.contador !== undefined && ` (${t.contador})`}
              </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-habita-700">Módulo:</span>
          <select
              value={moduloActivo}
              onChange={(e) => cambiarModulo(e.target.value)}
              className="rounded-lg border border-borde bg-white px-3 py-1.5 text-habita-900 focus:border-habita-900 focus:outline-none"
          >
            <option value="todos">Todos</option>
            {Object.entries(MODULOS).map(([key, val]) => (
                <option key={key} value={key}>{val.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>
  );
}