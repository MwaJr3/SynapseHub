import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Eye,
  Layers,
  RotateCcw,
  Shuffle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { post } from '../lib/api'
import type { StudyCard, Transcript } from '../lib/types'
import { message } from '../lib/utils'
import { EmptyState, Spinner } from './ui'
import { SourceRefs } from './SourceRefs'
import { useRefreshWorkspace } from './GuideEditors'

export function FlashcardStudy({
  cards,
  transcript,
  onSegment,
  onGenerate,
}: {
  cards: StudyCard[]
  transcript?: Transcript
  onSegment?: (id: string) => void
  onGenerate?: () => void
}) {
  const [deck, setDeck] = useState(cards)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const refresh = useRefreshWorkspace()
  const card = deck[index]
  const done = index >= deck.length
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body && !done) {
        e.preventDefault()
        setRevealed((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [done])
  if (!deck.length)
    return (
      <EmptyState
        icon={<Layers size={32} />}
        title="A few good questions are all it takes."
        description="Create a learning guide with flashcards, or generate a deck for this guide. Then come back for a little focused practice."
        action={
          onGenerate ? (
            <button className="button primary" onClick={onGenerate}>
              Generate flashcards <ArrowRight size={15} />
            </button>
          ) : (
            <Link className="button primary" to="/new">
              Create a learning guide <ArrowRight size={15} />
            </Link>
          )
        }
      />
    )
  const next = () => {
    setIndex((i) => i + 1)
    setRevealed(false)
  }
  const rate = async (rating: 'again' | 'hard' | 'easy') => {
    if (!card || !revealed) return
    setBusy(true)
    try {
      const result = await post<{ message: string; due_at: string; interval_days: number }>(
        `/analyses/${card.analysis_id}/flashcards/review`,
        { card_id: card.id, rating },
      )
      setReviewed((n) => n + 1)
      refresh()
      toast.success(
        `Review recorded. Next practice: ${rating === 'again' ? 'in 10 minutes' : `in ${result.interval_days} day${result.interval_days === 1 ? '' : 's'}`}.`,
      )
      next()
    } catch (e) {
      toast.error(message(e))
    } finally {
      setBusy(false)
    }
  }
  if (done)
    return (
      <div className="study-complete">
        <span className="complete-illustration">
          <Check size={35} />
        </span>
        <span className="eyebrow">SMALL STEPS, REAL PRACTICE</span>
        <h2>Make a little room for it to stick.</h2>
        <p>
          You reviewed {reviewed} of {deck.length} cards in this session.
          <br />
          Your ratings set the next practice dates. They aren’t a measure of mastery.
        </p>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() => {
              setIndex(0)
              setRevealed(false)
              setReviewed(0)
            }}
          >
            <RotateCcw size={15} />
            Study these again
          </button>
          <Link className="button secondary" to="/library">
            Back to library
          </Link>
        </div>
      </div>
    )
  return (
    <div className="flashcard-study">
      <div className="flashcard-toolbar">
        <span>
          <Layers size={15} />
          CARD {String(index + 1).padStart(2, '0')} <span className="muted">OF {deck.length}</span>
        </span>
        <button
          className="text-button muted"
          disabled={busy}
          onClick={() => {
            const next = [...deck]
            for (let i = next.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[next[i], next[j]] = [next[j], next[i]]
            }
            setDeck(next)
            setIndex(0)
            setRevealed(false)
          }}
        >
          <Shuffle size={14} />
          Shuffle
        </button>
      </div>
      <div
        className="study-progress"
        role="progressbar"
        aria-label="Flashcard position"
        aria-valuemin={0}
        aria-valuemax={deck.length}
        aria-valuenow={index}
        aria-valuetext={`Card ${index + 1} of ${deck.length}`}
      >
        <span style={{ width: `${(index / deck.length) * 100}%` }} />
      </div>
      <div className={`study-card ${revealed ? 'revealed' : ''}`}>
        <span className="study-card-label">{revealed ? 'CONNECT THE IDEA' : 'A MOMENT TO REMEMBER'}</span>
        <span className="study-card-icon">{revealed ? <Brain size={23} /> : <Layers size={23} />}</span>
        <div className="study-card-content" aria-live="polite">
          <h3>{revealed ? 'The source says…' : card.front}</h3>
          {revealed && <p>{card.back}</p>}
        </div>
        {!revealed ? (
          <button className="button secondary" onClick={() => setRevealed(true)}>
            <Eye size={15} />
            Reveal answer<span className="keyboard-key">space</span>
          </button>
        ) : (
          <button className="text-button muted" onClick={() => setRevealed(false)}>
            See question <RotateCcw size={12} />
          </button>
        )}
        <div className="study-card-bottom">
          <Link to={`/guide/${card.analysis_id}`}>
            {card.guide_title}
            <ChevronRight size={12} />
          </Link>
          {revealed && transcript && (
            <SourceRefs refs={card.refs} transcript={transcript} onSegment={onSegment} />
          )}
        </div>
      </div>
      {revealed ? (
        <div className="card-rating">
          <p>
            How did that feel? <span>Your rating schedules the next review.</span>
          </p>
          <div>
            <button disabled={busy} onClick={() => rate('again')}>
              <RotateCcw size={16} />
              <strong>Again</strong>
              <span>Needs more practice</span>
            </button>
            <button disabled={busy} onClick={() => rate('hard')}>
              <Brain size={16} />
              <strong>Hard</strong>
              <span>Took some effort</span>
            </button>
            <button disabled={busy} onClick={() => rate('easy')}>
              <Check size={16} />
              <strong>Easy</strong>
              <span>Came back clearly</span>
            </button>
          </div>
          {busy && <Spinner small label="Recording review…" />}
        </div>
      ) : (
        <p className="study-hint">
          Try to recall the answer before revealing it. That’s where the learning happens.
        </p>
      )}
      <div className="study-navigation">
        <button
          className="text-button muted"
          disabled={index === 0 || busy}
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1))
            setRevealed(false)
          }}
        >
          <ArrowLeft size={14} />
          Previous
        </button>
        <span>{reviewed} reviewed this session</span>
        <button className="text-button muted" disabled={busy} onClick={next}>
          Skip without rating <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
