
export default function Cargando() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6" aria-busy="true">
        <p role="status" className="sr-only">
          Calculando la vista previa…
        </p>
        <div className="flex flex-col gap-3">
          <div className="h-3 w-40 animate-pulse rounded bg-sand/40" />
          <div className="h-10 w-72 animate-pulse rounded bg-sand/40" />
        </div>
        <div className="h-36 animate-pulse rounded-xl border border-border bg-surface" />
        <div className="h-20 animate-pulse rounded-xl bg-sage/20" />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
          <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
          <div className="h-96 animate-pulse rounded-xl bg-forest/80" />
        </div>
      </div>
    </>
  );
}
