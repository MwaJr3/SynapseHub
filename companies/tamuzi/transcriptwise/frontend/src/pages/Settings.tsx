import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Globe2,
  LockKeyhole,
  LogOut,
  Monitor,
  Moon,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Youtube,
} from 'lucide-react'
import { toast } from 'sonner'
import { getSession, patch, post, request } from '../lib/api'
import { useSession } from '../lib/session'
import { useAuthDialog } from '../lib/ui'
import { useTheme } from '../lib/theme'
import type { Preferences, Theme } from '../lib/types'
import { cx, message } from '../lib/utils'
import { Modal, Notice, PageHeader, Spinner } from '../components/ui'

export function Settings() {
  const { session, acceptSession } = useSession()
  const { theme, setTheme } = useTheme()
  const openAuth = useAuthDialog()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState<Preferences>({
    level: 'beginner',
    depth: 'standard',
    output_language: 'English',
    ...session.user.preferences,
    theme,
  })
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const savePrefs = async () => {
    setBusy(true)
    try {
      await patch('/preferences', { ...prefs, theme })
      const data = await getSession()
      acceptSession(data)
      toast.success('Your learning defaults are saved.')
    } catch (e) {
      toast.error(message(e))
    } finally {
      setBusy(false)
    }
  }
  const chooseTheme = async (value: Theme) => {
    setTheme(value)
    setPrefs({ ...prefs, theme: value })
    try {
      await patch('/preferences', { theme: value })
      acceptSession(await getSession())
    } catch {
      toast.info('Theme saved in this browser. Save your preferences to sync it with the server.')
    }
  }
  const logout = async () => {
    try {
      await post('/auth/logout')
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      acceptSession(await getSession())
      navigate('/')
      toast.success('You’re signed out. Your saved guides are still in your account.')
    } catch (e) {
      toast.error(message(e))
    }
  }
  const deleteWorkspace = async () => {
    setBusy(true)
    setDeleteError('')
    try {
      await request('/account', { method: 'DELETE', body: JSON.stringify({ password }) })
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      acceptSession(await getSession())
      setDeleting(false)
      navigate('/')
      toast.success('Your previous workspace and its content were deleted.')
    } catch (e) {
      setDeleteError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="workspace-page settings-page">
      <PageHeader
        eyebrow="YOUR WORKSPACE, YOUR WAY"
        title="Make yourself at home."
        description="A few good defaults. More room to focus on the learning."
      />
      <div className="settings-grid">
        <nav className="settings-nav" aria-label="Settings sections">
          <a href="#appearance">
            <Sun size={16} />
            Appearance
          </a>
          <a href="#learning-defaults">
            <Settings2 size={16} />
            Learning defaults
          </a>
          <a href="#processing">
            <Sparkles size={16} />
            Processing & access
          </a>
          <a href="#account">
            <UserRound size={16} />
            Account & data
          </a>
        </nav>
        <div className="settings-content">
          <section id="appearance" className="settings-section panel">
            <div className="settings-section-heading">
              <Sun size={20} />
              <div>
                <h2>A comfortable place to think.</h2>
                <p>Choose the look that helps you focus.</p>
              </div>
            </div>
            <div className="theme-options">
              {(
                [
                  ['light', Sun, 'Light', 'A little light, a little clarity.'],
                  ['dark', Moon, 'Dark', 'For your deeper focus.'],
                  ['system', Monitor, 'System', 'Follow your device.'],
                ] as const
              ).map(([value, Icon, label, help]) => (
                <button
                  key={value}
                  className={cx('theme-option', `theme-preview-${value}`, theme === value && 'selected')}
                  aria-pressed={theme === value}
                  onClick={() => chooseTheme(value)}
                >
                  <div className="theme-miniature">
                    <span />
                    <div>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div>
                    <Icon size={15} />
                    <strong>{label}</strong>
                    {theme === value && <Check size={14} />}
                  </div>
                  <p>{help}</p>
                </button>
              ))}
            </div>
          </section>
          <section id="learning-defaults" className="settings-section panel">
            <div className="settings-section-heading">
              <Settings2 size={20} />
              <div>
                <h2>Start a step closer.</h2>
                <p>These preferences prefill every new guide. You can always change them.</p>
              </div>
            </div>
            <div className="settings-form-grid">
              <label>
                Default explanation level
                <select
                  value={prefs.level}
                  onChange={(e) => setPrefs({ ...prefs, level: e.target.value as Preferences['level'] })}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label>
                Default output depth
                <select
                  value={prefs.depth}
                  onChange={(e) => setPrefs({ ...prefs, depth: e.target.value as Preferences['depth'] })}
                >
                  <option value="quick">Quick summary</option>
                  <option value="standard">Standard learning guide</option>
                  <option value="comprehensive">Comprehensive guide</option>
                </select>
              </label>
              <label>
                Preferred output language
                <input
                  value={prefs.output_language}
                  onChange={(e) => setPrefs({ ...prefs, output_language: e.target.value })}
                  maxLength={60}
                />
              </label>
            </div>
            <div className="settings-save">
              <span className="muted small-text">
                {session.capabilities.ai_provider === 'local'
                  ? 'Local extractive mode does not translate. Choose English for analysis.'
                  : 'Availability and quality depend on your configured AI provider.'}
              </span>
              <button className="button primary small" disabled={busy} onClick={savePrefs}>
                {busy ? (
                  <Spinner small label="Saving…" />
                ) : (
                  <>
                    <Save size={14} />
                    Save preferences
                  </>
                )}
              </button>
            </div>
          </section>
          <section id="processing" className="settings-section panel">
            <div className="settings-section-heading">
              <ShieldCheck size={20} />
              <div>
                <h2>Know what’s behind your guide.</h2>
                <p>No hidden providers. No pretend retrieval.</p>
              </div>
            </div>
            <div className="integration-row">
              <span className="integration-icon">
                <Sparkles size={21} />
              </span>
              <div>
                <strong>
                  {session.capabilities.ai_provider === 'local'
                    ? 'Local extractive engine'
                    : 'OpenAI-compatible AI provider'}
                </strong>
                <p>
                  {session.capabilities.ai_provider === 'local'
                    ? 'Organizes source excerpts and makes study prompts on this server. It is not a language model and cannot add AI explanations.'
                    : `Configured model: ${session.capabilities.ai_model}. Transcript content is sent to this external provider for processing.`}
                </p>
              </div>
              <span className="badge success">
                <span className="tiny-dot" />
                Configured
              </span>
            </div>
            <div className="integration-row">
              <span className="integration-icon youtube">
                <Youtube size={22} />
              </span>
              <div>
                <strong>Authorized YouTube captions</strong>
                <p>
                  {session.capabilities.youtube_authorized
                    ? 'A server-side Google credential is configured. Only administrator-allowlisted videos can be shared. Actual access still depends on caption permissions, availability, language, and API quota.'
                    : 'Not enabled for shared use. Public metadata is attempted; caption download requires official API credentials and an explicit administrator video allowlist. Paste and upload remain available.'}
                </p>
              </div>
              <span className={cx('badge', session.capabilities.youtube_authorized ? 'success' : 'neutral')}>
                {session.capabilities.youtube_authorized ? 'Credentials set' : 'Manual fallback'}
              </span>
            </div>
            <div className="integration-row">
              <span className="integration-icon">
                <Globe2 size={21} />
              </span>
              <div>
                <strong>External fact-checking</strong>
                <p>
                  Not implemented. Claims from a transcript are never labeled independently verified.
                  Further-research questions are suggestions, not citations.
                </p>
              </div>
              <span className="badge neutral">Not enabled</span>
            </div>
            <div className="configuration-note">
              <LockKeyhole size={15} />
              <p>
                Provider keys stay on the server. To enable AI or authorized retrieval, configure the
                environment variables documented in the project README. Secrets cannot be entered or read
                through this interface.
              </p>
            </div>
          </section>
          <section id="account" className="settings-section panel">
            <div className="settings-section-heading">
              <UserRound size={20} />
              <div>
                <h2>A home for your knowledge.</h2>
                <p>
                  {session.user.is_guest
                    ? 'Try the core workflow without an account.'
                    : `Signed in as ${session.user.email}`}
                </p>
              </div>
            </div>
            {session.user.is_guest ? (
              <div className="account-settings-callout">
                <div>
                  <strong>You’re exploring as a guest.</strong>
                  <p>
                    Create an account to save your guides across sessions. Your current guest content comes
                    with you.
                  </p>
                </div>
                <button className="button primary small" onClick={() => openAuth('register')}>
                  Create account <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="signed-in-row">
                <span className="avatar large">{session.user.display_name[0]}</span>
                <div>
                  <strong>{session.user.display_name}</strong>
                  <p>{session.user.email}</p>
                </div>
                <button className="button secondary small" onClick={logout}>
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
            <div className="privacy-details">
              <h3>Your data, plainly explained.</h3>
              <ul>
                <li>
                  Transcripts, source segments, guides, notes, and study activity are stored in this server’s
                  database and protected by workspace ownership checks.
                </li>
                <li>
                  Guest workspaces expire after {session.capabilities.guest_retention_days} days. Unsaved
                  account guides expire after {session.capabilities.unsaved_retention_days} days without an
                  edit. Saved guides remain until you delete them.
                </li>
                <li>
                  {session.capabilities.ai_provider === 'local'
                    ? 'Local extractive processing does not send transcript text to an external AI provider.'
                    : 'AI processing sends transcript text to the configured provider. That provider’s retention and privacy terms also apply.'}{' '}
                  YouTube URL retrieval makes requests to Google/YouTube.
                </li>
                <li>
                  Expired data is purged at worker startup and hourly while the worker is running. This app
                  does not configure hosting backups; operators must document their own backup-retention
                  policy.
                </li>
                <li>
                  Transcript content and provider credentials are not intentionally included in application
                  logs. Export individual guides as JSON for a portable copy.
                </li>
              </ul>
              <p className="small-text muted">
                This self-hosted version has no email verification, password recovery, or multi-factor
                authentication. Use a unique password and deploy behind HTTPS. Production security still
                requires operator review.
              </p>
            </div>
            <div className="data-actions">
              <Link className="text-button" to="/library">
                Export or manage your guides <ArrowRight size={14} />
              </Link>
              <button
                className="text-button danger-text"
                onClick={() => {
                  setDeleting(true)
                  setPassword('')
                  setConfirmDelete(false)
                  setDeleteError('')
                }}
              >
                <Trash2 size={14} />
                {session.user.is_guest ? 'Delete guest workspace' : 'Delete account & all data'}
              </button>
            </div>
          </section>
        </div>
      </div>
      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title={
          session.user.is_guest ? 'Clear this workspace for good?' : 'Delete your account and all its data?'
        }
        description="This permanently deletes your workspace records. It cannot be undone."
      >
        <div className="stack">
          <Notice variant="error">
            All transcripts, learning guides, notes, quiz attempts, flashcards, and review history in this
            workspace will be deleted. Export anything you want to keep first.
          </Notice>
          {!session.user.is_guest && (
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
            />
            I understand this cannot be undone.
          </label>
          {deleteError && <Notice variant="error">{deleteError}</Notice>}
        </div>
        <div className="dialog-footer">
          <button className="button secondary" onClick={() => setDeleting(false)}>
            Keep my workspace
          </button>
          <button
            className="button danger"
            disabled={busy || !confirmDelete || (!session.user.is_guest && !password)}
            onClick={deleteWorkspace}
          >
            {busy ? <Spinner label="Deleting…" small /> : 'Permanently delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
