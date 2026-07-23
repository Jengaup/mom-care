/** Skeleton mientras cargan las pantallas del grupo (app). */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-black/[0.06]" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl border border-line bg-black/[0.04]"
        />
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
