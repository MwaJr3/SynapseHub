import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { isUsableLink } from '@/lib/links';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-tight ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ' +
  'disabled:pointer-events-none disabled:opacity-55 select-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-accent-hover active:translate-y-px',
  secondary:
    'bg-surface-raised text-fg border border-line hover:border-line-strong hover:bg-surface-sunken active:translate-y-px',
  outline:
    'border border-line-strong text-fg hover:bg-surface-sunken hover:border-accent-line active:translate-y-px',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-sunken',
  danger: 'bg-danger text-white hover:opacity-90 active:translate-y-px',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[0.82rem]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[0.95rem]',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName | undefined;
  iconPosition?: 'start' | 'end' | undefined;
  className?: string;
  children?: ReactNode;
  /** Rendered for screen readers and tooltips when the button is icon-only. */
  ariaLabel?: string;
}

function content({ icon, iconPosition = 'start', children }: CommonProps) {
  return (
    <>
      {icon && iconPosition === 'start' ? <Icon name={icon} size={16} aria-hidden /> : null}
      {children}
      {icon && iconPosition === 'end' ? <Icon name={icon} size={16} aria-hidden /> : null}
    </>
  );
}

export interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  href?: undefined;
  to?: undefined;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ariaLabel,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {content(rest)}
    </button>
  );
}

export interface LinkButtonProps extends CommonProps {
  /** Internal route. */
  to?: string;
  /** External URL — only rendered when it passes `isUsableLink`. */
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
}

/**
 * One call site for "button that goes somewhere". Internal routes use
 * react-router; external URLs open in a new tab with safe rel attributes and
 * are omitted entirely when the URL is not configured.
 */
export function LinkButton({
  to,
  href,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'start',
  className,
  children,
  ariaLabel,
}: LinkButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const body = content({ icon, iconPosition, children });

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel}>
        {body}
      </Link>
    );
  }

  if (href && isUsableLink(href)) {
    const external = href.startsWith('http');
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {body}
      </a>
    );
  }

  // No configured destination: render a disabled control with an honest reason
  // rather than a link to nowhere.
  return (
    <span
      className={cn(classes, 'pointer-events-none opacity-55')}
      aria-disabled="true"
      title="Link not configured yet"
    >
      {body}
    </span>
  );
}
