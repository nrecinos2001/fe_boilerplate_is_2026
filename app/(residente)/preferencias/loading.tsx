// Estado de carga de las preferencias (FE-25.1).
export default function CargandoPreferencias() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse" aria-busy="true" aria-label="Cargando preferencias">
      <div className="h-4 w-56 rounded bg-arena" />
      <div className="mt-8 h-3 w-40 rounded bg-arena" />
      <div className="mt-3 h-9 w-72 rounded bg-arena" />
      <div className="mt-8 overflow-hidden rounded-2xl border border-borde bg-white">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 border-t border-borde px-6 py-4 first:border-t-0">
            <div className="h-10 w-10 rounded-xl bg-arena" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-arena" />
              <div className="h-3 w-2/3 rounded bg-arena" />
            </div>
            <div className="h-6 w-11 rounded-full bg-arena" />
          </div>
        ))}
      </div>
    </div>
  );
}
