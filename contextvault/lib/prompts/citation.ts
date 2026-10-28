export const INSUFFICIENT = "I couldn't find sufficient evidence in the selected documents to answer that confidently.";
/** Fail closed on missing or out-of-range numeric references. Valid labels do not prove entailment. */
export function validateCitations(answer: string, count: number): { answer: string; used: number[] } {
  const used = new Set<number>(); let invalid = false;
  const cleaned = answer.replace(/\[(\d+)\]/g, (_match,n) => {
    const num = Number(n);
    if (num < 1 || num > count) { invalid = true; return ''; }
    used.add(num); return `[${num}]`;
  });
  if (invalid || !used.size) return { answer: INSUFFICIENT, used: [] };
  return { answer:cleaned, used:[...used] };
}
