/** Skeleton shaped like the content that is coming, instead of a spinner. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="card h-32 animate-pulse motion-reduce:animate-none" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card h-40 animate-pulse motion-reduce:animate-none" />
        <div className="card h-40 animate-pulse motion-reduce:animate-none" />
      </div>
    </div>
  );
}
