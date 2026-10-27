import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * List pages belong in the URL, not in component state.
 *
 * A page held in `useState` is invisible to the address bar: it cannot be bookmarked,
 * shared with a colleague investigating the same incident, or restored by the back
 * button after opening a detail view. It also silently resets whenever the component
 * remounts. `?page=3` costs nothing and fixes all three.
 *
 * The value is validated on the way in — anything that is not a positive integer
 * means page one — so a hand-edited URL cannot request `?page=-4` or `?page=abc`.
 */
export function usePageParam(): readonly [number, (next: number) => void] {
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('page') ?? '1');
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;

  const setPage = useCallback(
    (next: number) => {
      const target = Number.isInteger(next) && next > 0 ? next : 1;
      if (target === page) return;
      setParams(
        (current) => {
          const copy = new URLSearchParams(current);
          // Page one is the default: keep the address bar clean rather than
          // writing a parameter that means "nothing was chosen".
          if (target === 1) copy.delete('page');
          else copy.set('page', String(target));
          return copy;
        },
        // Paging is a navigation the user may want to undo, so it pushes history
        // rather than replacing the entry they arrived on.
        { replace: false },
      );
    },
    [page, setParams],
  );

  return [page, setPage] as const;
}
