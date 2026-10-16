export type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | Record<string, boolean | null | undefined>;

/**
 * Minimal class-name joiner — avoids a dependency for a three-line utility.
 * Only strings contribute to the output, so conditional values stay readable
 * at call sites (`cn('btn', isActive && 'btn-active')`).
 */
export function cn(...values: ClassValue[]): string {
  return values
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    .join(' ');
}
