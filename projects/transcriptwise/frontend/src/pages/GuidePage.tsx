import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Bookmark,
  Brain,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Copy,
  Download,
  FileDown,
  FileJson,
  FileText,
  Folder,
  Layers,
  Lightbulb,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Play,
  Printer,
  Quote,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { API, copyGuide, copyText, downloadExport, patch, post, request } from '../lib/api'
import type { Analysis, GuideSection, Provenance, SectionKey, Segment, Transcript } from '../lib/types'
import { useSession } from '../lib/session'
import { useAuthDialog } from '../lib/ui'
import { cx, dateLabel, formatTime, message, SECTION_NAMES, useDebounce, wordCount } from '../lib/utils'
import { EmptyState, Notice, Spinner, Steps } from '../components/ui'
import { RichText } from '../components/RichText'
import { SourceRefs } from '../components/SourceRefs'
import {
  DeleteGuideDialog,
  ManageGuideDialog,
  RegenerateDialog,
  SectionEditor,
  useRefreshWorkspace,
} from '../components/GuideEditors'
import { Quiz } from '../components/Quiz'
import { FlashcardStudy } from '../components/FlashcardStudy'

const ICONS: Record<string, LucideIcon> = {
  overview: BookOpen,
  takeaways: Lightbulb,
  notes: FileText,
  concepts: Brain,
  procedures: Waypoints,
  evidence: ShieldCheck,
  actions: ListChecks,
  applications: Target,
  quotes: Quote,
  limitations: CircleHelp,
  plan: ClipboardList,
  prerequisites: BookMarked,
  research: Waypoints,
  quiz: ListChecks,
  flashcards: Layers,
  personal: Pencil,
  transcript: FileText,
}
const LABELS: Record<Provenance, string> = {
  source_claim: 'From the source · unverified',
  source_paraphrase: 'Source paraphrase',
  direct_quote: 'Verbatim source quote',
  ai_explanation: 'AI-added explanation',
  illustrative_example: 'Illustrative example',
  recommendation: 'Additional recommendation',
  inferred_prerequisite: 'Inferred prerequisite',
  user_note: 'User-edited note',
}

export function GuidePage() {
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => request<Analysis>(`/analyses/${id}`),
    refetchInterval: (q) => {
      const a = q.state.data
      return a &&
        (['queued', 'processing'].includes(a.status) ||
          ['queued', 'processing'].includes(a.task?.status || ''))
        ? 900
        : false
    },
  })
  const { data: transcript } = useQuery({
    queryKey: ['transcript', query.data?.transcript_id],
    queryFn: () => request<Transcript>(`/transcripts/${query.data!.transcript_id}`),
    enabled: !!query.data?.transcript_id,
  })
  if (query.isPending)
    return (
      <div className="workspace-page">
        <Spinner label="Opening your learning guide…" />
      </div>
    )
  if (query.isError)
    return (
      <div className="workspace-page">
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
        <Link className="text-button" to="/library">
          Back to library <ArrowRight size={14} />
        </Link>
      </div>
    )
  if (
    ['queued', 'processing'].includes(query.data.status) ||
    (!query.data.guide && query.data.status === 'failed')
  )
    return <ProcessingView analysis={query.data} />
  if (!query.data.guide)
    return (
      <div className="workspace-page">
        <Notice variant="error">
          This guide has no validated material yet. Return to your library and retry the task.
        </Notice>
      </div>
    )
  return <LearningWorkspace analysis={query.data} transcript={transcript} />
}
function ProcessingView({ analysis }: { analysis: Analysis }) {
  const [busy, setBusy] = useState(false)
  const refresh = useRefreshWorkspace()
  const task = analysis.task
  const retry = async () => {
    if (!task) return
    setBusy(true)
    try {
      await post(`/tasks/${task.id}/retry`)
      refresh()
    } catch (e) {
      toast.error(message(e))
    } finally {
      setBusy(false)
    }
  }
  const failed = analysis.status === 'failed'
  return (
    <div className="workspace-page processing-page">
      <Steps current={2} />
      <div className="processing-view">
        <div className={`processing-art ${failed ? 'failed' : ''}`}>
          <span />
          <span />
          <span />
          <div>{failed ? <RefreshCw size={28} /> : <Sparkles size={29} />}</div>
        </div>
        <div className="eyebrow">
          {failed ? 'LET’S GET YOU BACK ON TRACK' : 'A LITTLE PROCESSING. A LOT OF POSSIBILITY.'}
        </div>
        <h1>{failed ? 'That didn’t go as planned.' : 'Making room for understanding.'}</h1>
        <p className="processing-title">{analysis.title}</p>
        {failed ? (
          <Notice variant="error">
            {analysis.error ||
              task?.message ||
              'Processing did not complete. No fabricated guide has been substituted.'}
          </Notice>
        ) : (
          <div className="processing-status" role="status">
            <Spinner label={task?.message || 'Waiting for the analysis worker…'} small />
            {task && task.total_units > 0 && (
              <>
                <div className="task-progress-track">
                  <span style={{ width: `${(task.completed_units / task.total_units) * 100}%` }} />
                </div>
                <p>
                  {task.completed_units} of {task.total_units} source sections processed
                </p>
              </>
            )}
          </div>
        )}
        <p className="muted small-text">
          The task is stored on this server. You can come back to it from your library.
          <br />
          Progress reflects completed work, not an estimated timer.
        </p>
        <div className="button-row">
          {failed && (
            <button className="button primary" disabled={busy} onClick={retry}>
              {busy ? (
                <Spinner label="Starting retry…" small />
              ) : (
                <>
                  <RefreshCw size={15} />
                  Retry analysis
                </>
              )}
            </button>
          )}
          <Link className="button secondary" to="/library">
            <ArrowLeft size={15} />
            Back to library
          </Link>
          {failed && <NewFromSource transcriptId={analysis.transcript_id} />}
        </div>
      </div>
    </div>
  )
}
function LearningWorkspace({ analysis, transcript }: { analysis: Analysis; transcript?: Transcript }) {
  const guide = analysis.guide!
  const { session } = useSession()
  const openAuth = useAuthDialog()
  const refresh = useRefreshWorkspace()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const active = params.get('section') || 'overview'
  const sourceId = params.get('segment')
  const [editOpen, setEditOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regenerateSection, setRegenerateSection] = useState<SectionKey | 'quiz' | 'flashcards' | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [ignoredTask, setIgnoredTask] = useState('')
  const section = guide.sections.find((s) => s.key === active)
  const nav = [...guide.sections.map((s) => s.key), 'quiz', 'flashcards', 'personal', 'transcript']
  const changeSection = (key: string) => {
    setParams({ section: key }, { replace: true })
    document.getElementById('workspace-reading-top')?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }
  const viewSegment = (id: string) => setParams({ section: 'transcript', segment: id }, { replace: true })
  const updateSaved = async () => {
    setSaving(true)
    try {
      await patch(`/analyses/${analysis.id}`, { revision: analysis.revision, is_saved: !analysis.is_saved })
      refresh()
      toast.success(
        analysis.is_saved
          ? 'Removed from saved guides. Unsaved retention now applies.'
          : 'Saved to your personal library.',
      )
    } catch (e) {
      toast.error(message(e))
    } finally {
      setSaving(false)
    }
  }
  const save = () => {
    if (session.user.is_guest) {
      openAuth('register', updateSaved)
      return
    }
    updateSaved()
  }
  const download = async (format: 'markdown' | 'docx' | 'json') => {
    setExporting(true)
    try {
      await downloadExport(analysis.id, format, analysis.title)
      toast.success('Your export is ready.')
    } catch (e) {
      toast.error(message(e))
    } finally {
      setExporting(false)
    }
  }
  const copy = async () => {
    try {
      await copyGuide(analysis.id)
      toast.success('Complete learning guide copied as Markdown.')
    } catch (e) {
      toast.error(message(e))
    }
  }
  const retry = async () => {
    if (!analysis.task) return
    try {
      await post(`/tasks/${analysis.task.id}/retry`)
      refresh()
    } catch (e) {
      toast.error(message(e))
    }
  }
  const activeTask = analysis.task && ['queued', 'processing'].includes(analysis.task.status)
  return (
    <div className="workspace-page guide-page">
      <div className="guide-topline">
        <Link to="/library" className="text-button muted">
          <ArrowLeft size={14} />
          My library
        </Link>
        <div className="guide-top-actions">
          <button
            className={cx('button secondary small', analysis.is_saved && 'saved')}
            disabled={saving}
            onClick={save}
          >
            {saving ? (
              <Spinner label="Saving…" small />
            ) : (
              <>
                {analysis.is_saved ? <Check size={14} /> : <Bookmark size={14} />}
                {analysis.is_saved ? 'Saved to library' : 'Save guide'}
              </>
            )}
          </button>
          <details className="dropdown export-dropdown">
            <summary className="button primary small">
              {exporting ? (
                <Spinner small label="Preparing…" />
              ) : (
                <>
                  <Download size={14} />
                  Export
                  <ChevronDown size={12} />
                </>
              )}
            </summary>
            <div className="dropdown-menu">
              <span className="dropdown-label">TAKE YOUR KNOWLEDGE WITH YOU</span>
              {(
                [
                  ['markdown', FileDown, 'Markdown (.md)'],
                  ['docx', FileText, 'Word document (.docx)'],
                  ['json', FileJson, 'Structured data (.json)'],
                ] as const
              ).map(([format, Icon, label]) => (
                <button
                  key={format}
                  disabled={exporting}
                  onClick={(e) => {
                    e.currentTarget.closest('details')!.open = false
                    download(format)
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
              <div className="menu-divider" />
              <button onClick={copy}>
                <Copy size={15} />
                Copy complete guide
              </button>
              <a target="_blank" rel="noreferrer" href={`${API}/analyses/${analysis.id}/export?format=html`}>
                <Printer size={15} />
                Print view / save as PDF
                <ArrowUpRight size={12} />
              </a>
            </div>
          </details>
          <details className="dropdown">
            <summary className="icon-button" aria-label="Guide options">
              <MoreHorizontal size={20} />
            </summary>
            <div className="dropdown-menu">
              <NewFromSource transcriptId={analysis.transcript_id} menu />
              <button
                onClick={(e) => {
                  e.currentTarget.closest('details')!.open = false
                  setManageOpen(true)
                }}
              >
                <Folder size={15} />
                Rename & organize
              </button>
              <button
                className="danger-text"
                onClick={(e) => {
                  e.currentTarget.closest('details')!.open = false
                  setDeleteOpen(true)
                }}
              >
                <Trash2 size={15} />
                Delete guide
              </button>
            </div>
          </details>
        </div>
      </div>
      <header className="guide-header">
        <div className="guide-eyebrow">
          <span className="badge accent">
            <Sparkles size={11} />
            {guide._meta.engine.startsWith('local')
              ? 'SOURCE-BASED LEARNING GUIDE'
              : 'AI-ASSISTED LEARNING GUIDE'}
          </span>
          <span>Created {dateLabel(analysis.created_at)}</span>
        </div>
        <h1>{analysis.title}</h1>
        <div className="guide-source-line">
          <span>
            <FileText size={13} />
            {transcript?.source_type === 'youtube'
              ? transcript.metadata.channel || 'YouTube transcript'
              : transcript?.source_type === 'upload'
                ? 'Uploaded transcript'
                : 'Pasted transcript'}
          </span>
          {transcript && <span>{wordCount(transcript.text).toLocaleString()} words</span>}
          <span className="capitalize">{analysis.config.level} level</span>
          <span>
            {analysis.config.depth === 'quick'
              ? 'Quick summary'
              : analysis.config.depth === 'comprehensive'
                ? 'Deep dive'
                : 'Standard guide'}
          </span>
          {analysis.tags.map((tag) => (
            <span className="mini-tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
      </header>
      {analysis.status === 'partial' && (
        <Notice
          variant="error"
          title="This guide is incomplete"
          action={
            <button className="button secondary small" onClick={retry}>
              <RefreshCw size={13} />
              Continue from saved sections
            </button>
          }
        >
          {guide._meta.processed_chunks} of {guide._meta.chunks} chunks processed (
          {guide._meta.processed_segments} of {guide._meta.source_segments} source segments). {analysis.error}{' '}
          The output is not comprehensive, regardless of selected depth. Generated-section edits are enabled
          after completion so a retry cannot replace your work. Personal notes are preserved.
        </Notice>
      )}
      <div className="guide-mode-banner">
        <span className="provider-dot" />
        <p>
          {guide._meta.engine.startsWith('local') ? (
            <>
              <strong>Local extractive mode.</strong> Real source excerpts and study prompts, not AI-generated
              explanations.
            </>
          ) : (
            <>
              <strong>AI-assisted, source-linked.</strong> Check important claims against the transcript.
              External verification is not enabled.
            </>
          )}
        </p>
        <details>
          <summary>
            About this guide <ChevronDown size={12} />
          </summary>
          <div>
            {guide.notices.map((notice, i) => (
              <p key={i}>{notice}</p>
            ))}
            <p>
              Engine: {guide._meta.engine} · Prompt {guide._meta.prompt_version} ·{' '}
              {guide._meta.processed_chunks}/{guide._meta.chunks} chunks processed.
            </p>
          </div>
        </details>
      </div>
      {guide.notices.some((notice) => notice.startsWith('Workspace selection:')) && (
        <Notice title="A bounded selection of learning material">
          {guide.notices.filter((notice) => notice.startsWith('Workspace selection:')).join(' ')}
        </Notice>
      )}
      {activeTask && (
        <div className="regeneration-status" role="status">
          <Spinner small label={analysis.task!.message} />
          {analysis.task!.total_units > 0 && (
            <span>
              {analysis.task!.completed_units}/{analysis.task!.total_units} sections processed
            </span>
          )}
        </div>
      )}
      {analysis.task?.status === 'failed' &&
        analysis.task.kind === 'regenerate' &&
        ignoredTask !== analysis.task.id && (
          <Notice
            variant="error"
            title="Section regeneration did not complete"
            action={
              <>
                <button className="text-button" onClick={retry}>
                  Retry
                </button>
                <button className="text-button muted" onClick={() => setIgnoredTask(analysis.task!.id)}>
                  Dismiss
                </button>
              </>
            }
          >
            {analysis.task.message} The rest of your guide is unchanged.
          </Notice>
        )}
      <div className="workspace-grid">
        <aside className="guide-navigation">
          <div className="eyebrow small-eyebrow">IN THIS GUIDE</div>
          <nav aria-label="Learning guide sections">
            {nav.map((key, i) => {
              const Icon = ICONS[key] || FileText
              return (
                <button
                  key={key}
                  className={cx(
                    active === key && 'active',
                    ['quiz', 'personal'].includes(key) && 'nav-section-divider',
                  )}
                  onClick={() => changeSection(key)}
                  aria-current={active === key ? 'page' : undefined}
                >
                  <Icon size={15} />
                  <span>{SECTION_NAMES[key]}</span>
                  {key === 'quiz' && !!guide.quiz.length && <small>{guide.quiz.length}</small>}
                  {key === 'flashcards' && !!guide.flashcards.length && (
                    <small>{guide.flashcards.length}</small>
                  )}
                  {key === 'overview' && <span className="nav-number">{String(i + 1).padStart(2, '0')}</span>}
                </button>
              )
            })}
          </nav>
          <div className="guide-nav-foot">
            <BookOpen size={17} />
            <strong>Understanding takes practice.</strong>
            <p>
              A guide is a starting point.
              <br />
              Make the next step yours.
            </p>
          </div>
        </aside>
        <div className="mobile-guide-nav">
          <label htmlFor="guide-section">Explore this guide</label>
          <select id="guide-section" value={active} onChange={(e) => changeSection(e.target.value)}>
            {nav.map((key) => (
              <option value={key} key={key}>
                {SECTION_NAMES[key]}
              </option>
            ))}
          </select>
        </div>
        <article className="guide-reading" id="workspace-reading-top">
          <div className="reading-heading">
            <div>
              <div className="eyebrow small-eyebrow">
                {active === 'transcript'
                  ? 'RETURN TO THE SOURCE'
                  : active === 'quiz' || active === 'flashcards'
                    ? 'MAKE IT STICK'
                    : active === 'personal'
                      ? 'YOUR OWN CONNECTIONS'
                      : 'A LITTLE MORE CLARITY'}
              </div>
              <h2>{section?.title || SECTION_NAMES[active] || 'Guide section'}</h2>
            </div>
            <div className="section-controls">
              {section && (
                <>
                  <button
                    className="icon-button"
                    title="Copy this section"
                    aria-label="Copy this section"
                    onClick={async () => {
                      try {
                        const body = section.items
                          .map(
                            (item) =>
                              `${item.heading ? '### ' + item.heading + '\n\n' : ''}${LABELS[item.provenance]}\n\n${item.body}\n\n${item.details.map((d) => d.label + ': ' + d.text).join('\n')}\n${
                                item.refs.length
                                  ? 'Sources: ' +
                                    item.refs
                                      .map((ref) => {
                                        const s = transcript?.segments.find((v) => v.id === ref)
                                        return s?.start != null
                                          ? formatTime(s.start) +
                                              (transcript?.source_url
                                                ? ` (${transcript.source_url}&t=${Math.floor(s.start)}s)`
                                                : '')
                                          : ref
                                      })
                                      .join(', ')
                                  : ''
                              }`,
                          )
                          .join('\n\n')
                        await copyText(`## ${section.title}\n\n${body}`)
                        toast.success('Section copied.')
                      } catch (e) {
                        toast.error(message(e))
                      }
                    }}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className="icon-button"
                    title="Edit this section"
                    aria-label="Edit this section"
                    disabled={!!activeTask || analysis.status !== 'complete'}
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil size={15} />
                  </button>
                </>
              )}
              {(section || active === 'quiz' || active === 'flashcards') && (
                <button
                  className="icon-button"
                  title="Regenerate only this section"
                  aria-label="Regenerate only this section"
                  disabled={!!activeTask || analysis.status !== 'complete'}
                  onClick={() => setRegenerateSection(active as SectionKey | 'quiz' | 'flashcards')}
                >
                  <RefreshCw size={15} />
                </button>
              )}
            </div>
          </div>
          {section ? (
            <>
              <SectionContent section={section} transcript={transcript} onSegment={viewSegment} />
              {active === 'overview' && (
                <div className="continue-learning">
                  <div className="eyebrow small-eyebrow">DON’T STOP AT THE OVERVIEW</div>
                  <h3>Make your next connection.</h3>
                  <div>
                    {[
                      ['takeaways', Lightbulb, 'Find the big ideas'],
                      ['quiz', ListChecks, 'Test your understanding'],
                      ['flashcards', Layers, 'Practice a little recall'],
                    ]
                      .filter(([key]) => nav.includes(key as SectionKey))
                      .map(([key, Icon, label]) => {
                        const ItemIcon = Icon as LucideIcon
                        return (
                          <button key={key as string} onClick={() => changeSection(key as string)}>
                            <ItemIcon size={18} />
                            <span>{label as string}</span>
                            <ArrowRight size={14} />
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}
            </>
          ) : active === 'quiz' ? (
            <Quiz
              analysisId={analysis.id}
              questions={guide.quiz}
              transcript={transcript}
              onSegment={viewSegment}
              onGenerate={() => setRegenerateSection('quiz')}
            />
          ) : active === 'flashcards' ? (
            <FlashcardStudy
              key={guide.flashcards.map((c) => c.id).join('-')}
              cards={guide.flashcards.map((c) => ({
                ...c,
                analysis_id: analysis.id,
                guide_title: analysis.title,
              }))}
              transcript={transcript}
              onSegment={viewSegment}
              onGenerate={() => setRegenerateSection('flashcards')}
            />
          ) : active === 'personal' ? (
            <PersonalNotes analysis={analysis} />
          ) : active === 'transcript' ? (
            transcript ? (
              <TranscriptReader transcript={transcript} focusedId={sourceId} />
            ) : (
              <Spinner label="Loading source transcript…" />
            )
          ) : (
            <EmptyState
              icon={<BookOpen size={30} />}
              title="Choose a section to explore."
              description="Use the guide navigation to return to your learning material."
            />
          )}
          <div className="reading-footer">
            <span>
              <Check size={12} />
              {analysis.is_saved
                ? 'Saved in your library'
                : session.user.is_guest
                  ? `Guest guide · available for ${session.capabilities.guest_retention_days} days`
                  : `Unsaved guide · ${session.capabilities.unsaved_retention_days}-day retention`}
            </span>
            <span>Keep asking good questions.</span>
          </div>
        </article>
      </div>
      <ManageGuideDialog guide={analysis} open={manageOpen} onClose={() => setManageOpen(false)} />
      <DeleteGuideDialog
        guide={analysis}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate('/library')}
      />
      {section && (
        <SectionEditor
          guide={analysis}
          section={section}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
      {regenerateSection && (
        <RegenerateDialog
          guide={analysis}
          section={regenerateSection}
          open={!!regenerateSection}
          onClose={() => setRegenerateSection(null)}
        />
      )}
    </div>
  )
}
function SectionContent({
  section,
  transcript,
  onSegment,
}: {
  section: GuideSection
  transcript?: Transcript
  onSegment: (id: string) => void
}) {
  return (
    <div className={`section-content section-${section.key}`}>
      {section.items.map((item, i) => (
        <section className="learning-item" key={item.id}>
          {section.key === 'takeaways' && (
            <span className="takeaway-number">{String(i + 1).padStart(2, '0')}</span>
          )}
          <div>
            <div
              className={cx(
                'provenance-label',
                [
                  'ai_explanation',
                  'illustrative_example',
                  'recommendation',
                  'inferred_prerequisite',
                ].includes(item.provenance) && 'added',
                item.provenance === 'user_note' && 'user-edited',
              )}
            >
              <span />
              {LABELS[item.provenance]}
            </div>
            {item.heading && <h3>{item.heading}</h3>}
            <RichText>{item.body}</RichText>
            {!!item.details.length && (
              <dl className="item-details">
                {item.details.map((d, n) => (
                  <div key={n}>
                    <dt>{d.label}</dt>
                    <dd>
                      <RichText>{d.text}</RichText>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <SourceRefs refs={item.refs} transcript={transcript} onSegment={onSegment} />
          </div>
        </section>
      ))}
    </div>
  )
}
function PersonalNotes({ analysis }: { analysis: Analysis }) {
  const [notes, setNotes] = useState(analysis.notes)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useRefreshWorkspace()
  const dirty = notes !== analysis.notes
  const save = async () => {
    setError('')
    setBusy(true)
    try {
      await patch(`/analyses/${analysis.id}`, { revision: analysis.revision, notes })
      refresh()
      toast.success('Your personal notes are saved on this server.')
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="personal-notes">
      <p>
        Connect this material to what you already know. Capture questions, small discoveries, and the next
        thing you want to try.
      </p>
      <label className="sr-only" htmlFor="personal-notes">
        Your personal notes
      </label>
      <textarea
        id="personal-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What clicked? What do you want to explore next?"
        rows={18}
        maxLength={100000}
      />
      <div className="notes-save-bar">
        <span>
          {dirty ? 'Unsaved changes' : 'All notes saved'} · {wordCount(notes)} words
        </span>
        <button className="button primary small" disabled={busy || !dirty} onClick={save}>
          {busy ? (
            <Spinner small label="Saving…" />
          ) : (
            <>
              <Save size={14} />
              Save notes
            </>
          )}
        </button>
      </div>
      {error && <Notice variant="error">{error}</Notice>}
    </div>
  )
}
function TranscriptReader({ transcript, focusedId }: { transcript: Transcript; focusedId: string | null }) {
  const [search, setSearch] = useState('')
  const query = useDebounce(search)
  const [original, setOriginal] = useState(false)
  const [limit, setLimit] = useState(100)
  const filtered = transcript.segments.filter((s) => s.text.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => {
    if (focusedId) {
      const index = transcript.segments.findIndex((s) => s.id === focusedId)
      setOriginal(false)
      setSearch('')
      setLimit(Math.max(100, index + 20))
      const timeout = setTimeout(
        () =>
          document
            .getElementById(`source-${focusedId}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        100,
      )
      return () => clearTimeout(timeout)
    }
  }, [focusedId, transcript.segments])
  return (
    <div className="transcript-reader">
      <div className="source-reader-toolbar">
        <input
          aria-label="Search transcript"
          type="search"
          placeholder="Find a word or idea in the source…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setLimit(100)
          }}
        />
        <button className="button secondary small" onClick={() => setOriginal((v) => !v)}>
          {original ? 'Analyzed copy' : 'Raw original'}
        </button>
      </div>
      <p className="small-text muted">
        {original
          ? 'The unchanged input, before cleanup or edits.'
          : `${filtered.length} source segments. This is the exact source used for analysis, including any review edits.`}
      </p>
      {original ? (
        <pre className="original-preview">{transcript.original_text}</pre>
      ) : (
        <>
          <div className="source-passages">
            {filtered.slice(0, limit).map((s) => (
              <SourcePassage
                segment={s}
                key={s.id}
                focused={s.id === focusedId}
                videoId={transcript.video_id}
              />
            ))}
            {!filtered.length && (
              <p className="muted">No passages match your search. Try a different word.</p>
            )}
          </div>
          {filtered.length > limit && (
            <button className="button secondary" onClick={() => setLimit((n) => n + 100)}>
              Show next {Math.min(100, filtered.length - limit)} segments
            </button>
          )}
        </>
      )}
    </div>
  )
}
function SourcePassage({
  segment,
  focused,
  videoId,
}: {
  segment: Segment
  focused: boolean
  videoId: string | null
}) {
  const url =
    videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) && segment.start !== null
      ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(segment.start)}s`
      : null
  return (
    <div id={`source-${segment.id}`} className={cx('source-passage', focused && 'focused')}>
      <div className="passage-reference">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
            <Play size={10} />
            {formatTime(segment.start!)}
          </a>
        ) : (
          <span>{segment.start !== null ? formatTime(segment.start) : segment.id.replace(/^s0*/, '')}</span>
        )}
      </div>
      <p>{segment.text}</p>
    </div>
  )
}

function NewFromSource({ transcriptId, menu = false }: { transcriptId: string; menu?: boolean }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <button
      disabled={busy}
      className={menu ? undefined : 'button secondary'}
      onClick={async () => {
        setBusy(true)
        try {
          const source = await post<Transcript>(`/transcripts/${transcriptId}/duplicate`)
          navigate(`/review/${source.id}`)
        } catch (error) {
          toast.error(message(error))
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? (
        <Spinner label="Preparing source…" small />
      ) : (
        <>
          <Copy size={14} />
          New guide from this source
        </>
      )}
    </button>
  )
}
