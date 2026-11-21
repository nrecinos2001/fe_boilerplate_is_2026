"use client";

import Link from "next/link";
import { hrefNotificaciones } from "./filter-tabs";
import type { Filtro, ModuloFiltro } from "@/lib/notificaciones";

// ✅ PROPS ACTUALIZADAS CON modulo
type Props = {
  filtro: Filtro;
  modulo: ModuloFiltro;
  page: number;
  size: number;
  total: number;
};

export function Pagination({ filtro, modulo, page, size, total }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / size));

  if (totalPaginas <= 1) return null;

  const anterior = page > 1 ? hrefNotificaciones(filtro, page - 1, modulo) : null;
  const siguiente = page < totalPaginas ? hrefNotificaciones(filtro, page + 1, modulo) : null;

  return (
      <div className="flex items-center justify-between border-t border-borde px-6 py-4 text-sm">
        <p className="text-habita-700/80">
          {(page - 1) * size + 1}–{Math.min(page * size, total)} de {total} notificaciones
        </p>
        <div className="flex gap-2">
          {anterior ? (
              <Link href={anterior} className="rounded-lg border border-borde px-3 py-1 hover:bg-arena">
                Anterior
              </Link>
          ) : (
              <span className="rounded-lg border border-borde px-3 py-1 opacity-40">Anterior</span>
          )}
          <span className="rounded-lg bg-arena px-3 py-1 font-medium">{page}</span>
          {siguiente ? (
              <Link href={siguiente} className="rounded-lg border border-borde px-3 py-1 hover:bg-arena">
                Siguiente
              </Link>
          ) : (
              <span className="rounded-lg border border-borde px-3 py-1 opacity-40">Siguiente</span>
          )}
        </div>
      </div>
  );
}