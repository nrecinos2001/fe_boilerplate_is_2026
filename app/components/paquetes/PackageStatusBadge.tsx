import { STATUS_LABEL, type PackageStatus } from "@/lib/paquetes";

const STYLES: Record<PackageStatus, string> = {
  PENDIENTE_RETIRO: "bg-[#f5f0e6] text-[#0a2f1f]",
  ENTREGADO: "bg-[#e6f0eb] text-[#0a2f1f]",
};

export default function PackageStatusBadge({
  status,
}: {
  status: PackageStatus;
}) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
