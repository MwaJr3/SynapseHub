import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  FileText,
  FileUp,
  Link2,
  LockKeyhole,
  Settings2,
  Sparkles,
  Upload,
  X,
  Youtube,
} from 'lucide-react'
import { z } from 'zod'
import { post, request } from '../lib/api'
import { useSession } from '../lib/session'
import { cx, EXAMPLE_TEXT, EXAMPLE_TITLE, message, wordCount } from '../lib/utils'
import type { Task, Transcript } from '../lib/types'
import { Notice, Spinner } from './ui'
import { Link } from 'react-router-dom'

type Method = 'youtube' | 'paste' | 'upload'
const urlSchema = z.url('Enter a complete YouTube URL, including https://.').refine((value) => {
  try {
    const url = new URL(value)
    return [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'www.youtu.be',
      'youtube-nocookie.com',
      'www.youtube-nocookie.com',
    ].includes(url.hostname)
  } catch {
    return false
  }
}, 'Use a supported YouTube URL. Other websites are not supported.')
export function InputComposer({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session } = useSession()
  const [method, setMethod] = useState<Method>(
    params.get('method') === 'paste' || params.get('sample')
      ? 'paste'
      : params.get('method') === 'upload'
        ? 'upload'
        : 'youtube',
  )
  const [url, setUrl] = useState('')
  const [text, setText] = useState(params.get('sample') ? EXAMPLE_TEXT : '')
  const [title, setTitle] = useState(params.get('sample') ? EXAMPLE_TITLE : '')
  const [language, setLanguage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const {
    data: task,
    isError: taskStatusFailed,
    error: taskStatusError,
    refetch: checkTask,
  } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => request<Task>(`/tasks/${taskId}`),
    enabled: !!taskId,
    refetchInterval: (query) =>
      ['queued', 'processing'].includes(query.state.data?.status || 'queued') ? 800 : false,
  })
  const isRetrieving =
    !!taskId && !taskStatusFailed && (!task || ['queued', 'processing'].includes(task.status))
  useEffect(() => {
    if (task?.status === 'complete' && task.result?.transcript_id)
      navigate(`/review/${task.result.transcript_id}`)
  }, [task, navigate])
  const changeMethod = (value: Method) => {
    if (value !== method) setTaskId(null)
    setMethod(value)
    setError('')
  }
  const chooseFile = (selected: File | null) => {
    setError('')
    if (selected && !/\.(txt|srt|vtt)$/i.test(selected.name)) {
      setError('Please choose a .txt, .srt, or .vtt transcript.')
      return
    }
    if (selected && selected.size > session.capabilities.max_upload_bytes) {
      setError(
        `This file is too large. The limit is ${session.capabilities.max_upload_bytes / 1_000_000} MB.`,
      )
      return
    }
    setFile(selected)
  }
  const start = async () => {
    setError('')
    setPending(true)
    try {
      if (method === 'youtube') {
        const result = urlSchema.safeParse(url.trim())
        if (!result.success) {
          setError(result.error.issues[0].message)
          return
        }
        const task = await post<Task>('/youtube/retrieve', {
          url: url.trim(),
          language: language.trim() || null,
        })
        setTaskId(task.id)
      } else if (method === 'paste') {
        if (text.trim().length < 80) {
          setError('Add at least 80 characters of transcript text to create a useful guide.')
          return
        }
        if (text.length > session.capabilities.max_transcript_chars) {
          setError(
            `The transcript limit is ${session.capabilities.max_transcript_chars.toLocaleString()} characters.`,
          )
          return
        }
        const source = await post<Transcript>('/transcripts/text', {
          text,
          title:
            title.trim() ||
            text
              .replace(/^\[?[\d:]+\]?\s*/, '')
              .trim()
              .split(/\s+/)
              .slice(0, 8)
              .join(' '),
        })
        navigate(`/review/${source.id}`)
      } else {
        if (!file) {
          setError('Choose a transcript file first.')
          return
        }
        const form = new FormData()
        form.append('file', file)
        const source = await request<Transcript>('/transcripts/upload', { method: 'POST', body: form })
        navigate(`/review/${source.id}`)
      }
    } catch (e) {
      setError(message(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <section className={cx('input-composer', compact && 'compact')} aria-labelledby="input-heading">
      <div className="composer-top">
        <div>
          <span className="eyebrow small-eyebrow">START SOMETHING WORTH KNOWING</span>
          <h2 id="input-heading">What will you learn today?</h2>
        </div>
        <button
          className="example-button"
          onClick={() => {
            changeMethod('paste')
            setTaskId(null)
            setText(EXAMPLE_TEXT)
            setTitle(EXAMPLE_TITLE)
            setError('')
          }}
        >
          <Sparkles size={14} />
          <span>Try an example</span>
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="input-tabs" role="tablist" aria-label="Transcript input method">
        {(
          [
            ['youtube', Youtube, 'YouTube link'],
            ['paste', FileText, 'Paste transcript'],
            ['upload', FileUp, 'Upload file'],
          ] as const
        ).map(([value, Icon, label], i) => (
          <button
            key={value}
            role="tab"
            aria-selected={method === value}
            aria-controls={`panel-${value}`}
            id={`tab-${value}`}
            tabIndex={method === value ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const values: Method[] = ['youtube', 'paste', 'upload']
                const next = values[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]
                changeMethod(next)
                document.getElementById(`tab-${next}`)?.focus()
              }
            }}
            onClick={() => changeMethod(value)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <div className="composer-body" role="tabpanel" id={`panel-${method}`} aria-labelledby={`tab-${method}`}>
        {method === 'youtube' && (
          <>
            <label className="sr-only" htmlFor="youtube-url">
              YouTube video URL
            </label>
            <div className="url-entry">
              <Link2 size={19} />
              <input
                id="youtube-url"
                type="url"
                placeholder="Paste a YouTube video link here…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRetrieving && !pending) start()
                }}
                disabled={isRetrieving}
              />
              <button className="button primary" onClick={start} disabled={pending || isRetrieving}>
                {pending || isRetrieving ? (
                  <Spinner label="Retrieving…" small />
                ) : (
                  <>
                    Get transcript
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
            <div className="input-context">
              <span>Watch links, Shorts, and youtu.be URLs supported.</span>
              <details className="language-option">
                <summary>
                  <Settings2 size={13} /> Language
                </summary>
                <label>
                  Caption language code
                  <input
                    placeholder="Auto-select (e.g. en)"
                    aria-label="Caption language code"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    maxLength={40}
                  />
                </label>
              </details>
            </div>
            <p className="retrieval-disclosure">
              Transcript retrieval depends on availability and access permissions. You can always paste or
              upload your own.
            </p>
          </>
        )}
        {method === 'paste' && (
          <div className="paste-input">
            <label className="sr-only" htmlFor="source-title">
              Guide title (optional)
            </label>
            <input
              id="source-title"
              className="transcript-title-input"
              placeholder="Give your guide a title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={240}
            />
            <label className="sr-only" htmlFor="transcript-text">
              Transcript text
            </label>
            <textarea
              id="transcript-text"
              placeholder="Paste your transcript here. Timestamps are welcome, but not required."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={compact ? 5 : 9}
              maxLength={session.capabilities.max_transcript_chars + 1}
            />
            <div className="paste-footer">
              <span>
                {wordCount(text).toLocaleString()} words <span className="dot-separator">·</span>{' '}
                {text.length.toLocaleString()} characters
              </span>
              <div>
                <button
                  className="text-button muted"
                  onClick={() => {
                    setText('')
                    setTitle('')
                    setError('')
                  }}
                >
                  Clear
                </button>
                {/* Kept enabled with no text so pressing it can say what is missing:
                    `start` already explains the minimum length and focuses the box. */}
                <button className="button primary small" onClick={start} disabled={pending}>
                  {pending ? (
                    <Spinner label="Preparing…" small />
                  ) : (
                    <>
                      Review transcript <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
            {title === EXAMPLE_TITLE && (
              <p className="sample-disclosure">
                <Sparkles size={13} /> Example content written for this application — not retrieved from a
                video.
              </p>
            )}
          </div>
        )}
        {method === 'upload' && (
          <div className="file-input-panel">
            <div
              className={cx('dropzone', dragging && 'dragging', file && 'has-file')}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                chooseFile(e.dataTransfer.files[0] || null)
              }}
            >
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.srt,.vtt,text/plain,text/vtt,application/x-subrip"
                className="sr-only"
                aria-label="Choose transcript file"
                onChange={(e) => chooseFile(e.target.files?.[0] || null)}
              />
              <div className="upload-symbol">{file ? <Check size={22} /> : <Upload size={23} />}</div>
              <div>
                <strong>{file ? file.name : 'Drop your transcript here'}</strong>
                <p>
                  {file ? (
                    `${(file.size / 1024).toFixed(1)} KB · ready for review`
                  ) : (
                    <>
                      or{' '}
                      <button className="text-button" onClick={() => fileInput.current?.click()}>
                        browse files
                      </button>{' '}
                      on your device
                    </>
                  )}
                </p>
              </div>
              {file && (
                <button
                  className="icon-button"
                  aria-label="Remove selected file"
                  onClick={() => {
                    setFile(null)
                    if (fileInput.current) fileInput.current.value = ''
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="upload-bottom">
              <span>
                TXT, SRT, VTT <span className="dot-separator">·</span> UTF-8{' '}
                <span className="dot-separator">·</span> Up to{' '}
                {session.capabilities.max_upload_bytes / 1_000_000} MB
              </span>
              <button className="button primary small" onClick={start} disabled={pending || !file}>
                {pending ? (
                  <Spinner label="Reading file…" small />
                ) : (
                  <>
                    Review transcript <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {error && <Notice variant="error">{error}</Notice>}
        {isRetrieving && (
          <div className="retrieval-progress" role="status">
            <Spinner small label={task?.message || 'Waiting for the retrieval worker…'} />
            <span>Only real metadata and authorized captions will be used.</span>
          </div>
        )}
        {taskStatusFailed && (
          <Notice
            variant="error"
            title="The retrieval status could not be checked"
            action={
              <>
                <button className="button secondary small" onClick={() => checkTask()}>
                  Check status again
                </button>
                <button className="text-button" onClick={() => changeMethod('paste')}>
                  Paste transcript instead
                </button>
              </>
            }
          >
            {message(taskStatusError)} The server task may still be running; switching input methods stops
            watching it here.
          </Notice>
        )}
        {task?.status === 'failed' && (
          <Notice
            variant="error"
            title={task.result?.metadata?.title || 'We couldn’t retrieve this transcript'}
            action={
              <>
                <button
                  className="button secondary small"
                  onClick={() => {
                    setTaskId(null)
                    changeMethod('paste')
                  }}
                >
                  Paste transcript instead
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setTaskId(null)
                    changeMethod('upload')
                  }}
                >
                  Upload a file <ArrowRight size={13} />
                </button>
                <button
                  className="text-button muted"
                  onClick={async () => {
                    try {
                      const next = await post<Task>(`/tasks/${task.id}/retry`)
                      setTaskId(next.id)
                    } catch (e) {
                      setError(message(e))
                    }
                  }}
                >
                  Retry retrieval
                </button>
              </>
            }
          >
            {task.message}
            {!!task.result?.available_languages?.length && (
              <p>
                Available caption languages: {task.result.available_languages.join(', ')}. Set a supported
                language and retry with a new request.
              </p>
            )}
          </Notice>
        )}
      </div>
      <div className="composer-footer">
        <span>
          <LockKeyhole size={13} /> Review first. Analyze when you’re ready.
        </span>
        <Link to="/settings">
          <span className="provider-dot" />
          {session.capabilities.ai_provider === 'local' ? 'Local extractive mode' : 'AI analysis enabled'}
          <ChevronTiny />
        </Link>
      </div>
    </section>
  )
}
function ChevronTiny() {
  return <ArrowRight size={12} />
}
