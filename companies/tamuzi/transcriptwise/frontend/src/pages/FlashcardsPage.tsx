import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Brain, Check, ChevronDown, Layers } from 'lucide-react'
import { request } from '../lib/api'
import type { LibraryResponse, StudyCard } from '../lib/types'
import { FlashcardStudy } from '../components/FlashcardStudy'
import { Notice, PageHeader, Spinner } from '../components/ui'

export function FlashcardsPage() {
  const [analysisId, setAnalysisId] = useState('')
  const [dueOnly, setDueOnly] = useState(false)
  const [page, setPage] = useState(0)
  const { data: library } = useQuery({
    queryKey: ['library', 'decks'],
    queryFn: () => request<LibraryResponse>('/analyses?limit=100'),
  })
  const params = new URLSearchParams({ due_only: String(dueOnly), offset: String(page * 100), limit: '100' })
  if (analysisId) params.set('analysis_id', analysisId)
  const query = useQuery({
    queryKey: ['flashcards', analysisId, dueOnly, page],
    queryFn: () => request<{ items: StudyCard[]; total: number; due_count: number }>(`/flashcards?${params}`),
  })
  return (
    <div className="workspace-page flashcards-page">
      <PageHeader
        eyebrow="A LITTLE PRACTICE. A LASTING CONNECTION."
        title="Give good ideas a second thought."
        description="Active recall, one thoughtful question at a time."
      />
      <div className="flashcard-page-grid">
        <aside className="study-sidebar">
          <span className="section-icon">
            <Layers size={20} />
          </span>
          <h2>Your practice space</h2>
          <p>Not another stack to get through. A chance to find out what’s actually sticking.</p>
          <label>
            Choose a guide
            <select
              value={analysisId}
              onChange={(e) => {
                setAnalysisId(e.target.value)
                setPage(0)
              }}
            >
              <option value="">All your guides</option>
              {library?.items
                .filter((i) => i.card_count > 0)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={dueOnly}
              onChange={(e) => {
                setDueOnly(e.target.checked)
                setPage(0)
              }}
            />
            Only cards due for practice
          </label>
          {query.data && (
            <div className="study-numbers">
              <div>
                <strong>{query.data.total}</strong>
                <span>{dueOnly ? 'due cards' : 'cards in this collection'}</span>
              </div>
              <div>
                <strong>{query.data.due_count}</strong>
                <span>ready to review</span>
              </div>
            </div>
          )}
          <div className="study-tip">
            <Brain size={19} />
            <strong>Recall before you reveal.</strong>
            <p>
              Take a breath. Try to explain the answer first. Then check the source and rate the effort, not
              your confidence.
            </p>
          </div>
          <details className="schedule-details">
            <summary>
              How review scheduling works <ChevronDown size={13} />
            </summary>
            <p>
              Again: in 10 minutes.
              <br />
              Hard: at least 1 day, then 1.2× the previous interval.
              <br />
              Easy: at least 3 days, then 2× the previous interval (up to 60 days).
            </p>
            <p>This is a simple practice schedule, not a validated measure of mastery.</p>
          </details>
        </aside>
        <section className="study-main" aria-label="Flashcard review">
          {query.isPending ? (
            <Spinner label="Preparing your flashcards…" />
          ) : query.isError ? (
            <Notice
              variant="error"
              action={
                <button className="button secondary small" onClick={() => query.refetch()}>
                  Try again
                </button>
              }
            >
              {query.error.message}
            </Notice>
          ) : (
            <FlashcardStudy key={`${analysisId}-${dueOnly}-${page}`} cards={query.data.items} />
          )}
          {query.data && query.data.total > 100 && (
            <div className="pagination">
              <button
                className="button secondary small"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous deck batch
              </button>
              <span>
                {page + 1} / {Math.ceil(query.data.total / 100)}
              </span>
              <button
                className="button secondary small"
                disabled={(page + 1) * 100 >= query.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next deck batch
              </button>
            </div>
          )}
          <div className="study-page-footnote">
            <Check size={12} />
            Your review history is stored with your workspace. Learning takes more than a checkmark.
          </div>
        </section>
      </div>
    </div>
  )
}
