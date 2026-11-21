const PATHS: Record<string, string[]> = {
  pagos: ["M3 7h18v12H3z", "M3 7l3-3h12l3 3", "M16 13h2"],
  reservas: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4", "M16 3v4"],
  incidencias: ["M7 4h10v17H7z", "M10 4v-1h4v1", "M10 10h4", "M10 14h4"],
  visitas: ["M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6", "M16 5.5a3 3 0 0 1 0 5.5", "M18 14.5c1.9.8 3 2.7 3 5.5"],
  paqueteria: ["M12 3l8 4.5v9L12 21l-8-4.5v-9z", "M4 7.5l8 4.5 8-4.5", "M12 12v9"],
  votaciones: ["M5 5h14v10H5z", "M2 19h20", "M9 10l2 2 4-4"],
  anuncios: ["M4 5h13v14H4z", "M17 9h3v8a2 2 0 0 1-2 2", "M7 9h7", "M7 13h7"],
};

const GENERICO = ["M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9Z", "M10 20a2 2 0 0 0 4 0"];

export function ModuleIcon({ modulo }: { modulo: string }) {
  const paths = PATHS[modulo] ?? GENERICO;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arena text-habita-800">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
