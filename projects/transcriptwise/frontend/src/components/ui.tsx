import * as Dialog from '@radix-ui/react-dialog'
import { AlertCircle, ArrowRight, BookOpen, Check, ChevronRight, Loader2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/utils'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="TranscriptWise home">
      <span className="brand-mark">
        <BookOpen size={21} strokeWidth={2.2} />
        <span className="brand-spark" />
      </span>
      {!compact && (
        <span>
          Transcript<span className="brand-light">Wise</span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  )
}
export function Spinner({ label = 'Loading…', small = false }: { label?: string; small?: boolean }) {
  return (
    <div className={cx('spinner-wrap', small && 'small')} role="status">
      <Loader2 className="spin" size={small ? 16 : 23} />
      <span>{label}</span>
    </div>
  )
}
export function Notice({
  children,
  variant = 'info',
  title,
  action,
}: {
  children: ReactNode
  variant?: 'info' | 'error' | 'success'
  title?: string
  action?: ReactNode
}) {
  return (
    <div className={cx('notice', variant)} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="notice-icon">
        {variant === 'success' ? <Check size={17} /> : <AlertCircle size={17} />}
      </span>
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
        {action && <div className="notice-actions">{action}</div>}
      </div>
    </div>
  )
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={cx('dialog', wide && 'wide')}>
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description className={description ? 'muted' : 'sr-only'}>
                {description || title}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={19} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function Steps({ current }: { current: number }) {
  return (
    <ol className="workflow-steps" aria-label="Analysis steps">
      {['Add a source', 'Review & personalize', 'Make it yours'].map((step, i) => (
        <li
          key={step}
          className={cx(i === current && 'current', i < current && 'done')}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="step-number">{i < current ? <Check size={12} /> : `0${i + 1}`}</span>
          <span>{step}</span>
          {i < 2 && <ChevronRight size={14} />}
        </li>
      ))}
    </ol>
  )
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}
export function NewGuideLink({ small = false }: { small?: boolean }) {
  return (
    <Link className={cx('button primary', small && 'small')} to="/new">
      New learning guide <ArrowRight size={16} />
    </Link>
  )
}
