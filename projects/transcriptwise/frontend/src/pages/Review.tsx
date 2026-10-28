import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { patch, post, request } from '../lib/api'
import type { Analysis, AnalysisConfig, Depth, Level, Segment, Task, Transcript } from '../lib/types'
import { useSession } from '../lib/session'
import { cx, formatTime, message, OBJECTIVES, wordCount } from '../lib/utils'
import { Notice, Spinner, Steps } from '../components/ui'

export function Review() {
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['transcript', id],
    queryFn: () => request<Transcript>(`/transcripts/${id}`),
  })
  if (query.isPending)
    return (
      <div className="workspace-page">
        <Spinner label="Opening your transcript…" />
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
        <Link className="text-button" to="/new">
          Start with a new transcript <ArrowRight size={14} />
        </Link>
      </div>
    )
  return <TranscriptReview transcript={query.data} />
}
function TranscriptReview({ transcript }: { transcript: Transcript }) {
  const { session } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [segments, setSegments] = useState<Segment[]>(transcript.segments)
  const [title, setTitle] = useState(transcript.title)
  const [language, setLanguage] = useState(transcript.language || '')
  const [version, setVersion] = useState(transcript.version)
  const [showOriginal, setShowOriginal] = useState(false)
  const [pending, setPending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState<AnalysisConfig>({
    objective: 'general',
    level: session.user.preferences.level || 'beginner',
    depth: session.user.preferences.depth || 'standard',
    output_language: session.user.preferences.output_language || 'English',
    include_quiz: true,
    include_flashcards: true,
    include_exercises: true,
    include_limitations: true,
    instructions: '',
  })
  const text = segments.map((s) => s.text).join('\n\n')
  const dirty =
    JSON.stringify(segments) !== JSON.stringify(transcript.segments) ||
    title !== transcript.title ||
    language !== (transcript.language || '')
  const timestamped = segments.some((s) => s.start !== null)
  const perPage = 20
  const pageCount = Math.ceil(segments.length / perPage)
  // The page lives in the URL, so refreshing or sharing keeps the reader where
  // they were. `page` stays 0-based in this component; the query string is 1-based.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = Number(searchParams.get('page') ?? '1')
  const page = Math.min(Math.max((Number.isFinite(requested) ? requested : 1) - 1, 0), Math.max(pageCount - 1, 0))
  const setPage = (next: number | ((current: number) => number)) => {
    const target = typeof next === 'function' ? next(page) : next
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      params.set('page', String(Math.max(target, 0) + 1))
      return params
    }, { replace: true })
  }
  const updateSegment = (id: string, text: string) =>
    setSegments((current) => current.map((s) => (s.id === id ? { ...s, text } : s)))
  const saveSource = async (): Promise<Transcript> => {
    if (!title.trim()) throw new Error('Give your guide a title before continuing.')
    if (text.trim().length < 80) throw new Error('Your transcript needs at least 80 characters.')
    if (segments.some((s) => !s.text.trim()))
      throw new Error('Empty segments cannot be saved. Add text or remove the empty segment.')
    if (text.length > session.capabilities.max_transcript_chars)
      throw new Error('This transcript exceeds the configured length limit.')
    if (!dirty) return transcript
    const result = await patch<Transcript>(`/transcripts/${transcript.id}`, {
      version,
      title: title.trim(),
      language: language.trim() || null,
      segments,
    })
    setVersion(result.version)
    setTitle(result.title)
    queryClient.setQueryData(['transcript', transcript.id], result)
    return result
  }
  const save = async () => {
    setError('')
    setSaving(true)
    try {
      await saveSource()
      toast.success('Transcript review saved. The original is preserved.')
    } catch (e) {
      setError(message(e))
    } finally {
      setSaving(false)
    }
  }
  const analyze = async () => {
    setError('')
    setPending(true)
    try {
      const source = await saveSource()
      const result = await post<{ analysis: Analysis; task: Task }>('/analyses', {
        transcript_id: source.id,
        config,
      })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      navigate(`/guide/${result.analysis.id}`)
    } catch (e) {
      setError(message(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="workspace-page review-page">
      <Steps current={1} />
      <div className="review-heading">
        <Link to="/new" className="text-button muted">
          <ArrowLeft size={14} /> Change source
        </Link>
        <h1>A good guide starts with a good source.</h1>
        <p>Give your transcript a once-over. Then make the learning experience yours.</p>
      </div>
      <div className="review-grid">
        <section className="source-review panel">
          <div className="panel-heading">
            <span className="section-icon">
              <FileText size={18} />
            </span>
            <div>
              <h2>Review your transcript</h2>
              <p>The original is always kept separately.</p>
            </div>
            <span className="badge success">
              <Check size={11} />
              Ready for review
            </span>
          </div>
          <div className="source-metadata">
            <label>
              Guide title
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={240} />
            </label>
            <div className="source-facts">
              <span>
                <FileText size={13} />
                {wordCount(text).toLocaleString()} words
              </span>
              <span>
                <Clock3 size={13} />
                {timestamped ? 'Timestamps preserved' : 'No timestamps supplied'}
              </span>
              <span>
                <Globe2 size={13} />
                {language || 'Language not specified'}
              </span>
            </div>
            {transcript.source_url && (
              <a className="subtle-link" target="_blank" rel="noreferrer" href={transcript.source_url}>
                Open original video <ExternalLink size={12} />
              </a>
            )}
            <label className="language-label">
              Transcript language (optional)
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English or en"
                maxLength={40}
              />
            </label>
          </div>
          <div className="editor-toolbar">
            <div className="small-tabs" role="tablist" aria-label="Transcript version">
              <button role="tab" aria-selected={!showOriginal} onClick={() => setShowOriginal(false)}>
                Working copy {dirty && <span className="unsaved-dot" />}
              </button>
              <button role="tab" aria-selected={showOriginal} onClick={() => setShowOriginal(true)}>
                Original
              </button>
            </div>
            <div className="editor-actions">
              <button
                className="text-button muted"
                disabled={showOriginal}
                onClick={() => {
                  setSegments((current) =>
                    current.map((s) => ({ ...s, text: s.text.replace(/[ \t]+/g, ' ').trim() })),
                  )
                  toast.info('Whitespace normalized. No wording or repeated passages were removed.')
                }}
              >
                <WandSparkles size={13} />
                <span>Clean up</span>
              </button>
              <button
                className="icon-button"
                aria-label="Restore original transcript in working copy"
                title="Restore original in working copy"
                disabled={showOriginal}
                onClick={() => {
                  setSegments(transcript.original_segments)
                  setPage(0)
                  toast.info('Original restored in your working copy. Save to apply.')
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
          {showOriginal ? (
            <pre className="original-preview">{transcript.original_text}</pre>
          ) : (
            <div className="segment-editor">
              {segments.slice(page * perPage, (page + 1) * perPage).map((s, i) => (
                <div className="edit-segment" key={s.id}>
                  <div className="segment-gutter">
                    <span>
                      {s.start !== null
                        ? formatTime(s.start)
                        : String(page * perPage + i + 1).padStart(2, '0')}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Remove segment ${page * perPage + i + 1}`}
                      disabled={segments.length === 1}
                      onClick={() => {
                        setSegments((current) => current.filter((segment) => segment.id !== s.id))
                        setPage((p) =>
                          Math.min(p, Math.max(0, Math.ceil((segments.length - 1) / perPage) - 1)),
                        )
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <label className="sr-only" htmlFor={`segment-${s.id}`}>
                    Transcript segment {page * perPage + i + 1}
                    {s.start !== null ? ` at ${formatTime(s.start)}` : ''}
                  </label>
                  <textarea
                    id={`segment-${s.id}`}
                    rows={Math.max(3, Math.min(8, Math.ceil(s.text.length / 95)))}
                    value={s.text}
                    onChange={(e) => updateSegment(s.id, e.target.value)}
                    maxLength={1800}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="editor-footer">
            <span>
              {text.length.toLocaleString()} characters · {segments.length} segments
            </span>
            {!showOriginal && (
              <button
                className="text-button"
                onClick={() => {
                  setSegments((current) => [
                    ...current,
                    { id: `s-${crypto.randomUUID()}`, text: '', start: null, end: null },
                  ])
                  setPage(Math.floor(segments.length / perPage))
                }}
              >
                <Plus size={13} />
                Add segment
              </button>
            )}
          </div>
          {pageCount > 1 && !showOriginal && (
            <div className="pagination">
              <button
                className="button secondary small"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <button
                className="button secondary small"
                disabled={page >= pageCount - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
          <div className="source-save-bar">
            <span>{dirty ? 'You have unsaved source edits' : 'Source changes are saved'}</span>
            <button className="button secondary small" onClick={save} disabled={saving || pending || !dirty}>
              {saving ? (
                <Spinner label="Saving…" small />
              ) : (
                <>
                  <Save size={14} />
                  Save review
                </>
              )}
            </button>
          </div>
        </section>
        <aside className="analysis-options">
          <div className="panel options-panel">
            <div className="options-heading">
              <span className="little-spark">
                <Sparkles size={18} />
              </span>
              <h2>Make it work for you.</h2>
              <p>A few preferences. A more useful guide.</p>
            </div>
            <label>
              What’s your learning goal?
              <select
                value={config.objective}
                onChange={(e) => setConfig({ ...config, objective: e.target.value })}
              >
                {OBJECTIVES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Explanation level</legend>
              <div className="level-options">
                {(['beginner', 'intermediate', 'advanced'] as Level[]).map((level) => (
                  <label className={cx(config.level === level && 'selected')} key={level}>
                    <input
                      type="radio"
                      className="sr-only"
                      name="level"
                      value={level}
                      checked={config.level === level}
                      onChange={() => setConfig({ ...config, level })}
                    />
                    {level[0].toUpperCase() + level.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="depth-field">
              <legend>How deep do you want to go?</legend>
              {(
                [
                  ['quick', 'Quick summary', 'The essentials, without the extra.'],
                  ['standard', 'Learning guide', 'Clear ideas, context, and next steps.'],
                  ['comprehensive', 'Deep dive', 'A detailed, source-linked breakdown.'],
                ] as [Depth, string, string][]
              ).map(([depth, label, help]) => (
                <label className={cx('depth-option', config.depth === depth && 'selected')} key={depth}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="depth"
                    value={depth}
                    checked={config.depth === depth}
                    onChange={() => setConfig({ ...config, depth })}
                  />
                  <span className="radio-circle">{config.depth === depth && <span />}</span>
                  <span>
                    <strong>
                      {label}
                      {depth === 'standard' && <small>RECOMMENDED</small>}
                    </strong>
                    <span>{help}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <details className="more-options">
              <summary>
                Fine-tune your guide <ChevronDown size={15} />
              </summary>
              <div>
                <label>
                  Output language
                  <input
                    value={config.output_language}
                    maxLength={60}
                    onChange={(e) => setConfig({ ...config, output_language: e.target.value })}
                  />
                </label>
                {session.capabilities.ai_provider === 'local' && (
                  <small className="muted">
                    Local extractive mode cannot translate; English output only. Source text is retained as
                    supplied.
                  </small>
                )}
                {(
                  [
                    ['include_quiz', 'Revision questions'],
                    ['include_flashcards', 'Study flashcards'],
                    ['include_exercises', 'Practical exercises'],
                    ['include_limitations', 'Assumptions & limitations'],
                  ] as const
                ).map(([key, label]) => (
                  <label className="checkbox-label" key={key}>
                    <input
                      type="checkbox"
                      checked={config[key]}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
                <label>
                  Additional learning instructions
                  {session.capabilities.ai_provider === 'local' && (
                    <small className="muted">Free-form instructions require a configured AI provider.</small>
                  )}
                  <textarea
                    disabled={session.capabilities.ai_provider === 'local'}
                    rows={3}
                    placeholder="e.g. Focus on practical examples"
                    value={config.instructions}
                    maxLength={2000}
                    onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                  />
                </label>
                <small className="muted">
                  External research is not enabled. Source claims will not be presented as independently
                  verified.
                </small>
              </div>
            </details>
            {session.capabilities.ai_provider === 'local' && (
              <div className="mode-notice">
                <span className="provider-dot" />
                <div>
                  <strong>Local extractive mode</strong>
                  <p>
                    Real source excerpts and study prompts. For AI explanations and a rewritten guide,
                    configure a provider in the server environment.
                  </p>
                </div>
              </div>
            )}
            {error && <Notice variant="error">{error}</Notice>}
            <button
              className="button primary full generate-button"
              onClick={analyze}
              disabled={pending || saving}
            >
              {pending ? (
                <Spinner label="Saving source & starting…" small />
              ) : (
                <>
                  <Sparkles size={17} />
                  Create learning guide
                  <ArrowRight size={17} />
                </>
              )}
            </button>
            <p className="options-footnote">
              {session.capabilities.ai_provider === 'local'
                ? 'Processed on this server. No external AI request.'
                : 'Your transcript will be sent to the configured AI provider.'}
            </p>
          </div>
          <p className="below-panel-note">
            <Check size={13} />
            Your transcript is source material, not an instruction to the analysis engine.
          </p>
        </aside>
      </div>
    </div>
  )
}
