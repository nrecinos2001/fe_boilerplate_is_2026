import { ESTADO_VISTA, type EstadoVista } from "@/lib/estado-cuenta";

// El estado se indica con texto además de color (FE-1.1).
export default function EstadoCuotaBadge({ estado }: { estado: EstadoVista }) {
  const { texto, clase } = ESTADO_VISTA[estado];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${clase}`}>
      {texto}
    </span>
  );
}
