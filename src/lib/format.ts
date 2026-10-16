export function pluralise(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function countLabel(count: number): string {
  return pluralise(count, 'project');
}

/** Renders an ISO date (yyyy-mm-dd) without inventing precision or locale data. */
export function formatIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;

  const [, year, month, day] = match;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthName = months[Number(month) - 1];
  if (!monthName) return undefined;

  return `${Number(day)} ${monthName} ${year}`;
}

export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
