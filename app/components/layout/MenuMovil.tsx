"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import ResidentNav from "@/app/components/layout/ResidentNav";
import SecurityNav from "@/app/components/layout/SecurityNav";
import type { Role } from "@/lib/current-user";

// En pantallas angostas el menú lateral se oculta; este botón muestra la misma navegación.
export default function MenuMovil({ role }: { role?: Role }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        className="grid size-9 place-items-center rounded-lg text-gray-700 hover:bg-black/5"
      >
        <Menu size={20} />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            id="menu-movil"
            // Al elegir un enlace se cierra el menú.
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setAbierto(false);
            }}
            className="relative flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-[#0a2f1f] p-4 text-white"
          >
            <div className="flex items-center justify-between px-2">
              <span className="text-xl font-semibold">habita</span>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="grid size-9 place-items-center rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            {role === "SEGURIDAD" ? <SecurityNav /> : <ResidentNav role={role} />}
          </div>
        </div>
      )}
    </div>
  );
}
