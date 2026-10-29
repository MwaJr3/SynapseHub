import { useEffect, useState } from 'react'
export function cx(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ')
}
export function formatTime(value: number) {
  const s = Math.floor(value)
  const h = Math.floor(s / 3600)
  return `${h ? h + ':' : ''}${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export function dateLabel(value: string) {
  return new Date(value.endsWith('Z') ? value : value + 'Z').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
export function useDebounce<T>(value: T, delay = 280) {
  const [current, setCurrent] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setCurrent(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return current
}
export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
export const OBJECTIVES = [
  ['general', 'General understanding'],
  ['academic', 'Academic study'],
  ['programming', 'Programming & technical learning'],
  ['science', 'Science & engineering'],
  ['research', 'Research & investigation'],
  ['implementation', 'Practical implementation'],
  ['professional', 'Professional development'],
  ['exam', 'Exam preparation'],
  ['content', 'Content research'],
]
export const SECTION_NAMES: Record<string, string> = {
  overview: 'Overview',
  takeaways: 'Key takeaways',
  notes: 'Detailed notes',
  concepts: 'Concept explorer',
  procedures: 'Processes & procedures',
  evidence: 'Facts & evidence',
  actions: 'Actionable advice',
  applications: 'Practical applications',
  quotes: 'Source quotes',
  limitations: 'Critical thinking',
  plan: 'Learning plan',
  prerequisites: 'Prerequisites',
  research: 'Further research',
  quiz: 'Practice quiz',
  flashcards: 'Flashcards',
  personal: 'Personal notes',
  transcript: 'Original transcript',
}
export const EXAMPLE_TITLE = 'Learning how to learn · example transcript'
export const EXAMPLE_TEXT = `00:00 Active recall is the practice of retrieving information from memory instead of simply rereading it. When you close a book and explain an idea in your own words, you are practicing active recall. Rereading can feel familiar without showing whether you can actually remember the idea.

00:28 Spaced repetition means revisiting information over increasing intervals. Rather than reviewing a topic five times in one evening, spread your practice across several days. The right interval depends on how easily you recall the material; there is no single schedule that works for everyone.

01:02 First, study a short passage and identify its central idea. Next, close your notes and answer a question about that idea. Finally, compare your answer with the original source. Correct missing details and notice any qualifications you forgot.

01:35 Feedback is information that helps you compare your current performance with a desired result. You should check your explanation against the source rather than trusting how confident you feel. Confidence and accuracy are not the same thing.

02:05 Interleaving means mixing related kinds of practice rather than completing one type before starting another. For example, a mathematics student can mix several problem types and practice deciding which method fits each problem. This is different from switching randomly between unrelated tasks.

02:40 Start with a small habit: choose one idea, write a question, and try to answer it tomorrow without looking. If the answer is difficult, revisit the source and practice again. These methods support learning, but a completed study session is not proof of mastery.`
