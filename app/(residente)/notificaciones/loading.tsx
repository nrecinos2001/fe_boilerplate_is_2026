// Estado de carga (FE-24.1): se muestra mientras la página consulta al backend.
export default function CargandoNotificaciones() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse" aria-busy="true" aria-label="Cargando notificaciones">
      <div className="h-3 w-40 rounded bg-arena" />
      <div className="mt-3 h-9 w-72 rounded bg-arena" />
      <div className="mt-8 h-24 rounded-2xl bg-arena" />
      <div className="mt-6 overflow-hidden rounded-2xl border border-borde bg-white">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 border-t border-borde px-6 py-5 first:border-t-0">
            <div className="h-10 w-10 rounded-xl bg-arena" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-arena" />
              <div className="h-4 w-2/3 rounded bg-arena" />
              <div className="h-3 w-1/2 rounded bg-arena" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
