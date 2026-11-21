import Link from "next/link";

type Props = {
  pagina: number;
  totalPaginas: number;
  total: number;
  tamano: number;
  /** "cuotas", "pagos"… */
  unidad: string;
  href: (pagina: number) => string;
};

export default function Paginacion({ pagina, totalPaginas, total, tamano, unidad, href }: Props) {
  const desde = (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 text-xs text-secondary sm:px-6">
      <span>
        {desde}–{hasta} de {total} {unidad}
      </span>
      <nav aria-label={`Paginación de ${unidad}`} className="flex items-center gap-3">
        {pagina > 1 ? (
          <Link href={href(pagina - 1)} scroll={false} className="hover:text-foreground">
            Anterior
          </Link>
        ) : (
          <span className="text-muted/60">Anterior</span>
        )}
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            href={href(n)}
            scroll={false}
            aria-current={n === pagina ? "page" : undefined}
            className={`grid size-6 place-items-center rounded ${
              n === pagina ? "bg-sage/30 text-foreground" : "hover:bg-sage/20"
            }`}
          >
            {n}
          </Link>
        ))}
        {pagina < totalPaginas ? (
          <Link href={href(pagina + 1)} scroll={false} className="hover:text-foreground">
            Siguiente
          </Link>
        ) : (
          <span className="text-muted/60">Siguiente</span>
        )}
      </nav>
    </div>
  );
}
