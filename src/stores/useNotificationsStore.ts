import { create } from "zustand";
import { fetchUnreadCount } from "@/src/services/notifications/notifications-service";

// Contador de avisos sin leer (H25). Lo comparten la campana y la bandeja:
// cuando la bandeja marca avisos como leídos, la campana baja al instante.

type NotificationsState = {
  unread: number;
  setUnread: (unread: number) => void;
  /** Resta avisos leídos sin bajar de cero. */
  decrementUnread: (by?: number) => void;
  /** Consulta el contador al backend; si falla conserva el valor anterior. */
  refreshUnread: () => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  unread: 0,
  setUnread: (unread) => set({ unread: Math.max(0, unread) }),
  decrementUnread: (by = 1) => set((s) => ({ unread: Math.max(0, s.unread - by) })),
  refreshUnread: async () => {
    const res = await fetchUnreadCount();
    if (res.ok) set({ unread: Math.max(0, res.data) });
  },
}));

export const useUnreadCount = () => useNotificationsStore((s) => s.unread);
