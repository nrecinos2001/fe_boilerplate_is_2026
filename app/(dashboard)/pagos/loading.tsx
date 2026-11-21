export default function Cargando() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando tus cuotas pendientes…
      </p>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-32 animate-pulse rounded bg-sand/40" />
        <div className="h-10 w-64 animate-pulse rounded bg-sand/40" />
      </div>
      <div className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
        <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
    </div>
  );
}
