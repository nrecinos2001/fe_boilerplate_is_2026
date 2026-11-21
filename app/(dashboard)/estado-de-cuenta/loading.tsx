// Estado de carga (FE-1.1): esqueleto con la forma de la pantalla mientras llega la API.
export default function Cargando() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando tu estado de cuenta…
      </p>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-40 animate-pulse rounded bg-sand/40" />
        <div className="h-10 w-72 animate-pulse rounded bg-sand/40" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-sand/30" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-36 animate-pulse rounded-xl bg-primary/80" />
        <div className="h-36 animate-pulse rounded-xl bg-sand/30" />
        <div className="h-36 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-6">
          <div className="h-5 w-44 animate-pulse rounded bg-sand/40" />
          <div className="mt-6 flex flex-col gap-4">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-10 animate-pulse rounded bg-sand/20" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
