import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Folder, RefreshCw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { patch, post, request } from '../lib/api'
import type { Analysis, GuideSection, Level, LibraryItem, SectionKey, Task } from '../lib/types'
import { message } from '../lib/utils'
import { Modal, Notice, Spinner } from './ui'
import { useSession } from '../lib/session'

export function useRefreshWorkspace() {
  const client = useQueryClient()
  return () => {
    for (const key of ['analysis', 'library', 'stats', 'flashcards', 'quiz-attempts'])
      client.invalidateQueries({ queryKey: [key] })
  }
}
export function ManageGuideDialog({
  guide,
  open,
  onClose,
}: {
  guide: Analysis | LibraryItem
  open: boolean
  onClose: () => void
}) {
  const [title, setTitle] = useState(guide.title)
  const [folder, setFolder] = useState(guide.folder)
  const [tags, setTags] = useState(guide.tags.join(', '))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useRefreshWorkspace()
  useEffect(() => {
    if (open) {
      setTitle(guide.title)
      setFolder(guide.folder)
      setTags(guide.tags.join(', '))
      setError('')
    }
  }, [open, guide.title, guide.folder, guide.tags])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await patch(`/analyses/${guide.id}`, {
        revision: guide.revision,
        title: title.trim(),
        folder: folder.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      refresh()
      toast.success('Guide details saved.')
      onClose()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="A little organization goes a long way."
      description="Rename this guide, give it a folder, or add a few tags."
    >
      <form onSubmit={save} className="stack form-stack">
        <label>
          Guide title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={1}
            maxLength={240}
            required
          />
        </label>
        <label>
          <span className="label-with-icon">
            <Folder size={14} /> Folder
          </span>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            maxLength={80}
            placeholder="e.g. Computer science (optional)"
          />
        </label>
        <label>
          Tags
          <input
            aria-label="Tags"
            aria-describedby="guide-tags-help"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            maxLength={800}
            placeholder="e.g. memory, learning, study skills"
          />
          <small id="guide-tags-help" className="muted">
            Separate tags with commas. Up to 20 tags.
          </small>
        </label>
        {error && <Notice variant="error">{error}</Notice>}
        <div className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <Spinner label="Saving…" small />
            ) : (
              <>
                <Save size={15} />
                Save details
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
export function DeleteGuideDialog({
  guide,
  open,
  onClose,
  onDeleted,
}: {
  guide: Analysis | LibraryItem
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useRefreshWorkspace()
  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await request(`/analyses/${guide.id}`, { method: 'DELETE' })
      refresh()
      toast.success('Guide and its learning activity deleted.')
      onClose()
      onDeleted?.()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete this learning guide?"
      description="This action cannot be undone."
    >
      <div className="delete-preview">
        <Trash2 size={20} />
        <strong>{guide.title}</strong>
      </div>
      <p className="muted">
        The guide, personal notes, quiz attempts, and flashcard reviews will be deleted. Its source transcript
        is also deleted if no other guide uses it.
      </p>
      {error && <Notice variant="error">{error}</Notice>}
      <div className="dialog-footer">
        <button className="button secondary" onClick={onClose}>
          Keep guide
        </button>
        <button className="button danger" disabled={busy} onClick={remove}>
          {busy ? <Spinner label="Deleting…" small /> : 'Delete guide'}
        </button>
      </div>
    </Modal>
  )
}
export function SectionEditor({
  guide,
  section,
  open,
  onClose,
}: {
  guide: Analysis
  section: GuideSection
  open: boolean
  onClose: () => void
}) {
  const [draft, setDraft] = useState(section)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useRefreshWorkspace()
  useEffect(() => {
    if (open) {
      setDraft(structuredClone(section))
      setError('')
    }
  }, [open, section])
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const updated: GuideSection = {
        ...draft,
        items: draft.items.map((entry, i) =>
          JSON.stringify(entry) !== JSON.stringify(section.items[i])
            ? { ...entry, provenance: 'user_note' }
            : entry,
        ),
      }
      await patch(`/analyses/${guide.id}`, { revision: guide.revision, section: updated })
      refresh()
      toast.success('Section saved. Your edits are labeled as user notes.')
      onClose()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${section.title.toLowerCase()}`}
      description="Only this section changes. Source links are preserved; changed items are labeled as user-edited notes."
      wide
    >
      <div className="section-edit-fields">
        {draft.items.map((item, i) => (
          <div className="edit-item" key={item.id}>
            <label>
              Heading
              <input
                value={item.heading}
                maxLength={240}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    items: draft.items.map((v, n) => (n === i ? { ...v, heading: e.target.value } : v)),
                  })
                }
              />
            </label>
            <label>
              Content
              <textarea
                rows={Math.min(10, Math.max(4, Math.ceil(item.body.length / 100)))}
                value={item.body}
                maxLength={24000}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    items: draft.items.map((v, n) => (n === i ? { ...v, body: e.target.value } : v)),
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>
      {error && <Notice variant="error">{error}</Notice>}
      <div className="dialog-footer">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={busy || draft.items.some((i) => !i.body.trim())}
          onClick={save}
        >
          {busy ? (
            <Spinner label="Saving…" small />
          ) : (
            <>
              <Save size={15} />
              Save section
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}
export function RegenerateDialog({
  guide,
  section,
  open,
  onClose,
}: {
  guide: Analysis
  section: SectionKey | 'quiz' | 'flashcards'
  open: boolean
  onClose: () => void
}) {
  const [level, setLevel] = useState<Level>(guide.config.level)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useRefreshWorkspace()
  const { session } = useSession()
  const regenerate = async () => {
    setBusy(true)
    setError('')
    try {
      await post<Task>(`/analyses/${guide.id}/regenerate`, { revision: guide.revision, section, level })
      refresh()
      toast.info(
        'Regeneration started. The previous section stays available until the replacement is validated.',
      )
      onClose()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="A fresh perspective on this section."
      description="The rest of your learning guide will stay exactly as it is."
    >
      <div className="stack">
        <label>
          Explanation level
          <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="beginner">Beginner — clear foundations</option>
            <option value="intermediate">Intermediate — connections & detail</option>
            <option value="advanced">Advanced — depth & nuance</option>
          </select>
        </label>
        <Notice>
          {session.capabilities.ai_provider === 'local'
            ? 'Local extractive mode reselects and organizes source excerpts. It cannot add deeper AI explanations; configure a language-model provider for that.'
            : 'The source transcript will be processed again by the configured AI provider. This counts toward your processing limit.'}
        </Notice>
        <p className="muted small-text">
          Any manual edits in this section will be replaced only when generation succeeds. If you edit the
          guide while this runs, your edits will win and the replacement will not be applied.
        </p>
        {error && <Notice variant="error">{error}</Notice>}
      </div>
      <div className="dialog-footer">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={busy} onClick={regenerate}>
          {busy ? (
            <Spinner label="Starting…" small />
          ) : (
            <>
              <RefreshCw size={15} />
              Regenerate section
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}
