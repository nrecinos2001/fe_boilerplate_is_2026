// components/preferencias/preferencias-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "./switch";
import { actualizarPreferencias } from "@/app/actions/preferencias";
import { MODULOS_PREFERENCIAS, type PreferenciaModulo } from "@/lib/preferencias";

type Props = {
  preferenciasIniciales: PreferenciaModulo[];
};

export function PreferenciasForm({ preferenciasIniciales }: Props) {
  const router = useRouter();
  const [preferencias, setPreferencias] = useState<PreferenciaModulo[]>(preferenciasIniciales);
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  function handleChange(modulo: string, activo: boolean) {
    setPreferencias((prev) =>
        prev.map((p) => (p.modulo === modulo ? { ...p, activo } : p))
    );
    setMensaje(null);
  }

  function handleSubmit() {
    setMensaje(null);
    iniciar(async () => {
      const resultado = await actualizarPreferencias(preferencias);
      if (resultado.ok) {
        setMensaje({ tipo: "exito", texto: "Tus preferencias se actualizaron correctamente." });
        router.refresh();
      } else {
        setMensaje({ tipo: "error", texto: resultado.mensaje });
      }
    });
  }

  return (
      <div className="space-y-6">
        <div className="space-y-3">
          {MODULOS_PREFERENCIAS.map((mod) => {
            const pref = preferencias.find((p) => p.modulo === mod.modulo);
            const activo = pref?.activo ?? true; // Si no existe, asumimos activo

            return (
                <Switch
                    key={mod.modulo}
                    label={mod.etiqueta}
                    descripcion={mod.descripcion}
                    activo={activo}
                    onChange={(nuevoValor) => handleChange(mod.modulo, nuevoValor)}
                    disabled={pendiente}
                />
            );
          })}
        </div>

        {mensaje && (
            <div
                role="alert"
                className={`rounded-lg px-4 py-3 text-sm ${
                    mensaje.tipo === "exito"
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                }`}
            >
              {mensaje.texto}
            </div>
        )}

        <div className="flex items-center justify-between border-t border-borde pt-6">
          <p className="text-xs text-habita-700/80">
            La administración puede enviar comunicados urgentes aunque desactives un módulo.
          </p>
          <button
              type="button"
              onClick={handleSubmit}
              disabled={pendiente}
              className="rounded-lg bg-habita-900 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pendiente ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
  );
}