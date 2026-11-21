import { CONDOMINIO } from "@/lib/condominio";

export type PackageStatus = "PENDIENTE_RETIRO" | "ENTREGADO";

export type Package = {
  id: string;
  folio: string;
  status: PackageStatus;
  unit: { id: string; code: string; description: string };
  recipientName: string;
  carrier: string;
  trackingReference: string;
  description: string;
  notes: string | null;
  receivedAt: string;
  receivedBy: { id: string; email: string };
  deliveredTo: string | null;
  deliveredAt: string | null;
  deliveredBy: { id: string; email: string } | null;
  pickupCode?: string;
};

export type MyPackagePage = {
  items: Package[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  counts: { TODOS: number; PENDIENTE_RETIRO: number; ENTREGADO: number };
};

export type PackagePage = {
  items: Package[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  pendingRecipientCount: number;
  carriers: string[];
};

export type Unit = {
  id: string;
  code: string;
  tower: string;
  description: string;
};

export const PICKUP_LOCATION = "Caseta principal";
export const CONDOMINIUM = CONDOMINIO.nombre;

export const CARRIERS = [
  "DHL",
  "FedEx",
  "UPS",
  "Estafeta",
  "Amazon",
  "Cargo Expreso",
  "Correos de El Salvador",
];

export const STATUS_LABEL: Record<PackageStatus, string> = {
  PENDIENTE_RETIRO: "Pendiente de retiro",
  ENTREGADO: "Entregado",
};

const TIME_ZONE = "America/El_Salvador";

export function formatDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  })
    .format(new Date(iso))
    .replace(".", "");
}

export function formatTime(iso: string | Date): string {
  return (
    new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TIME_ZONE,
    }).format(new Date(iso)) + " h"
  );
}

export function displayName(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return typeof body.message === "string"
    ? body.message
    : `Error ${res.status}`;
}
