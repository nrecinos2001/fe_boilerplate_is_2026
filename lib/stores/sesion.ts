"use client";

import { create } from "zustand";

export type RolUsuario =
  | "GERENTE"
  | "MESERO"
  | "COCINA"
  | "CLIENTE";

export type UsuarioSesion = {
  id: string;
  email: string;
  role: RolUsuario;
};

export type SucursalSesion = {
  id: string;
  name: string;
};

type EstadoSesion = {
  usuario: UsuarioSesion | null;
  sucursal: SucursalSesion | null;
  cargando: boolean;
  cargarUsuario: () => Promise<UsuarioSesion | null>;
  guardarSucursal: (sucursal: SucursalSesion) => void;
  noLeidas: number;
  cargarNoLeidas: () => Promise<void>;
};

export const useSesion = create<EstadoSesion>((set) => ({
  usuario: null,
  sucursal: null,
  cargando: false,

  cargarUsuario: async () => {
    set({ cargando: true });

    try {
      const respuesta = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!respuesta.ok) {
        set({ usuario: null, sucursal: null });
        return null;
      }

      const usuario: UsuarioSesion = await respuesta.json();

      set({ usuario });
      return usuario;
    } catch {
      set({ usuario: null, sucursal: null });
      return null;
    } finally {
      set({ cargando: false });
    }
  },

  guardarSucursal: (sucursal) => set({ sucursal }),

  noLeidas: 0,

  cargarNoLeidas: async () => {
    try {
      const respuesta = await fetch(
        "/api/notificaciones/notifications/unread-count",
        { cache: "no-store" }
      );

      if (!respuesta.ok) return;

      const datos: { count: number } = await respuesta.json();
      set({ noLeidas: datos.count });
    } catch {
      // El contador se vuelve a intentar en la siguiente consulta.
    }
  },
}));
