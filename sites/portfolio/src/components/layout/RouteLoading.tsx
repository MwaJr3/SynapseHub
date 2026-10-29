import { Container } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/StateBlock';

/** Shown while a lazily loaded route chunk is fetched. */
export function RouteLoading() {
  return (
    <Container className="py-16">
      <div className="max-w-3xl" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading page…</span>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-10 w-3/4" />
        <Skeleton className="mt-3 h-10 w-1/2" />
        <Skeleton className="mt-8 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-11/12" />
        <Skeleton className="mt-3 h-4 w-9/12" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </Container>
  );
}
