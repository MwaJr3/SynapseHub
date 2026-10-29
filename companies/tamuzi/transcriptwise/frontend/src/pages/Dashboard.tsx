import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  FileText,
  Lightbulb,
  Link2,
  ListChecks,
  Play,
  Sparkles,
} from 'lucide-react'
import { InputComposer } from '../components/InputComposer'
import { Steps } from '../components/ui'
import { request } from '../lib/api'
import type { LibraryResponse, Stats } from '../lib/types'
import { dateLabel } from '../lib/utils'
import { useSession } from '../lib/session'

function LearningIllustration() {
  return (
    <div className="learning-illustration" aria-hidden="true">
      <div className="illustration-orbit orbit-one" />
      <div className="illustration-orbit orbit-two" />
      <span className="art-plus plus-one">+</span>
      <span className="art-plus plus-two">+</span>
      <div className="source-tile">
        <span className="video-play">
          <Play size={23} fill="currentColor" strokeWidth={0} />
        </span>
        <span className="video-line long" />
        <span className="video-line" />
      </div>
      <svg className="art-connection" viewBox="0 0 240 120">
        <path
          d="M12 60C60 60 80 60 100 36S140 20 180 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
        <path d="M172 14l10 6-10 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="guide-sheet sheet-back" />
      <div className="guide-sheet">
        <div className="sheet-top">
          <span className="sheet-icon">
            <Sparkles size={16} />
          </span>
          <span className="sheet-overline">A LITTLE CLARITY.</span>
        </div>
        <span className="sheet-title">
          A whole new
          <br />
          understanding.
        </span>
        <span className="sheet-text-line" />
        <span className="sheet-text-line shorter" />
        <div className="sheet-check">
          <span>
            <Check size={10} />
          </span>{' '}
          Connect the important ideas
        </div>
        <div className="sheet-check">
          <span>
            <Check size={10} />
          </span>{' '}
          Put knowledge into practice
        </div>
      </div>
      <div className="idea-orb">
        <Lightbulb size={22} strokeWidth={1.7} />
      </div>
      <div className="art-caption">
        <span className="tiny-dot" /> Less watching. More understanding.
      </div>
    </div>
  )
}
export function Dashboard() {
  const { session } = useSession()
  const { data: library } = useQuery({
    queryKey: ['library', 'recent'],
    queryFn: () => request<LibraryResponse>('/analyses?limit=3'),
  })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => request<Stats>('/stats') })
  return (
    <div className="workspace-page dashboard-page">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> YOUR PERSONAL LEARNING SPACE
          </div>
          <h1>
            Turn what you watch
            <br />
            into what you <span>know.</span>
            <svg viewBox="0 0 130 8" aria-hidden="true">
              <path d="M2 6C34 0 93 0 128 4" />
            </svg>
          </h1>
          <p>
            From “that was interesting” to “I actually get it.”
            <br className="desktop-break" /> Transform videos and transcripts into knowledge you can use.
          </p>
          <div className="hero-pills">
            <span>
              <FileText size={12} />
              Capture
            </span>
            <ChevronRight size={11} />
            <span>
              <Brain size={13} />
              Understand
            </span>
            <ChevronRight size={11} />
            <span>
              <Lightbulb size={13} />
              Apply
            </span>
          </div>
        </div>
        <LearningIllustration />
      </section>
      <InputComposer compact />
      {library?.items.length ? (
        <section className="recent-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow small-eyebrow">KEEP YOUR CURIOSITY GOING</span>
              <h2>Pick up where you left off</h2>
            </div>
            <Link className="subtle-link" to="/library">
              View library <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="recent-grid">
            {library.items.map((a, i) => (
              <Link to={`/guide/${a.id}`} key={a.id} className="recent-card">
                <div className={`document-icon tint-${i % 3}`}>
                  <FileText size={22} />
                </div>
                <span className="recent-card-type">
                  {a.source_type === 'youtube'
                    ? 'YOUTUBE VIDEO'
                    : a.source_type === 'upload'
                      ? 'UPLOADED TRANSCRIPT'
                      : 'TRANSCRIPT'}
                </span>
                <h3>{a.title}</h3>
                <div className="recent-card-footer">
                  <span>
                    {a.status === 'complete'
                      ? `${a.section_count} guide sections`
                      : a.status.replace('_', ' ')}{' '}
                    · {dateLabel(a.created_at)}
                  </span>
                  <ArrowUpRight size={16} />
                </div>
              </Link>
            ))}
          </div>
          {stats && (
            <div className="activity-line">
              <span>
                <BookOpen size={14} />
                <strong>{stats.guides}</strong> guides created
              </span>
              <span>
                <ListChecks size={14} />
                <strong>{stats.quizzes_completed}</strong> quizzes completed
              </span>
              <span>
                <Brain size={14} />
                <strong>{stats.cards_reviewed}</strong> cards reviewed
              </span>
              <span className="activity-note">Small steps. Real practice.</span>
            </div>
          )}
        </section>
      ) : (
        <section className="how-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow small-eyebrow">A BETTER WAY TO TAKE IT IN</span>
              <h2>A small input. A smarter outcome.</h2>
            </div>
            <Link className="subtle-link" to="/about">
              How it works <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="how-grid">
            <div className="how-item">
              <span className="how-icon peach">
                <Link2 size={20} />
                <span>01</span>
              </span>
              <div>
                <h3>Bring your curiosity</h3>
                <p>
                  Add a video link, paste a transcript,
                  <br />
                  or upload the notes you already have.
                </p>
              </div>
            </div>
            <div className="how-item">
              <span className="how-icon lavender">
                <Sparkles size={20} />
                <span>02</span>
              </span>
              <div>
                <h3>Find the clarity</h3>
                <p>
                  Unpack the key ideas in a guide
                  <br />
                  shaped around your learning goals.
                </p>
              </div>
            </div>
            <div className="how-item">
              <span className="how-icon sage">
                <Brain size={20} />
                <span>03</span>
              </span>
              <div>
                <h3>Make it stick</h3>
                <p>
                  Go beyond reading with quizzes,
                  <br />
                  flashcards, and a practical next step.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
      {!library?.items.length && (
        <div className="library-invitation">
          <span className="invitation-icon">
            <BookOpen size={21} />
          </span>
          <div>
            <strong>Your next idea deserves a home.</strong>
            <p>
              {session.user.is_guest
                ? 'Create your first guide. Your learning library grows from there.'
                : 'Your learning library starts with your first guide.'}
            </p>
          </div>
          <Link to="/new?method=paste">
            Start a learning guide <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <footer className="workspace-footer">
        <span>Made for curious minds.</span>
        <span>
          <span className="tiny-dot" />A focused space to learn, one idea at a time.
        </span>
      </footer>
    </div>
  )
}
export function NewAnalysis() {
  return (
    <div className="workspace-page new-page">
      <Steps current={0} />
      <div className="new-page-heading">
        <div className="eyebrow">FOLLOW YOUR CURIOSITY</div>
        <h1>Something good starts here.</h1>
        <p>Bring a transcript. Leave with a clearer understanding.</p>
      </div>
      <InputComposer />
      <div className="new-help-grid">
        <div>
          <FileText size={19} />
          <strong>Start with what you have</strong>
          <p>Paste text or upload TXT, SRT, or VTT. Subtitle timestamps stay connected to your source.</p>
        </div>
        <div>
          <BookOpen size={19} />
          <strong>Your source, your say</strong>
          <p>Review and edit before analysis. Choose your goal, explanation level, and how deep to go.</p>
        </div>
        <div>
          <Link2 size={19} />
          <strong>Honest about access</strong>
          <p>
            Video captions need the right permissions. If retrieval isn’t possible, manual input is always
            here.
          </p>
        </div>
      </div>
    </div>
  )
}
