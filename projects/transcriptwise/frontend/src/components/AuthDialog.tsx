import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, BookOpen, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { Modal, Spinner } from './ui'
import { post } from '../lib/api'
import { useSession } from '../lib/session'
import type { SessionInfo } from '../lib/types'
import { message } from '../lib/utils'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(128),
  display_name: z.string().max(80).optional(),
})
type Fields = z.infer<typeof schema>
export function AuthDialog({
  open,
  mode: initialMode,
  onClose,
  onSuccess,
}: {
  open: boolean
  mode: 'login' | 'register'
  onClose: () => void
  onSuccess: () => void
}) {
  const [mode, setMode] = useState(initialMode)
  const [error, setError] = useState('')
  const { acceptSession, session } = useSession()
  const form = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', display_name: '' },
  })
  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      form.reset()
    }
  }, [open, initialMode, form])
  const submit = form.handleSubmit(async (data) => {
    setError('')
    try {
      const payload =
        mode === 'register'
          ? { ...data, display_name: data.display_name?.trim() || 'Curious learner' }
          : { email: data.email, password: data.password }
      const result = await post<SessionInfo>(`/auth/${mode}`, payload)
      acceptSession(result)
      toast.success(
        mode === 'register'
          ? 'Your account is ready. Guest guides came with you.'
          : 'Welcome back. Your workspace is ready.',
      )
      onSuccess()
    } catch (e) {
      setError(message(e))
    }
  })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'register' ? 'A home for your knowledge.' : 'Welcome back.'}
      description={
        mode === 'register'
          ? 'Save your guides and pick up where curiosity left off.'
          : 'Sign in to your personal learning workspace.'
      }
    >
      <div className="auth-emblem">
        <BookOpen size={25} />
      </div>
      <form onSubmit={submit} className="stack form-stack">
        {mode === 'register' && (
          <label>
            Your name
            <input
              aria-label="Your name"
              autoComplete="name"
              placeholder="What should we call you?"
              {...form.register('display_name')}
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            aria-label="Email address"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'auth-email-error' : undefined}
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <span id="auth-email-error" className="field-error">
              {form.formState.errors.email.message}
            </span>
          )}
        </label>
        <label>
          Password
          <input
            type="password"
            aria-label="Password"
            aria-invalid={!!form.formState.errors.password}
            aria-describedby={form.formState.errors.password ? 'auth-password-error' : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="At least 10 characters"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <span id="auth-password-error" className="field-error">
              {form.formState.errors.password.message}
            </span>
          )}
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Spinner label="One moment…" small />
          ) : (
            <>
              {mode === 'register' ? 'Create your account' : 'Sign in'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        {mode === 'register' ? 'Already have an account?' : 'New to TranscriptWise?'}{' '}
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === 'register' ? 'login' : 'register')
            setError('')
            form.clearErrors()
          }}
        >
          {mode === 'register' ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      <div className="auth-footnote">
        <LockKeyhole size={14} />
        <span>
          {session.capabilities.guest_retention_days}-day guest guides are carried into your account. No email
          verification or password-recovery service is configured in this self-hosted version.
        </span>
      </div>
    </Modal>
  )
}
