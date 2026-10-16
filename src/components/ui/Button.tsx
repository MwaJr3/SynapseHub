import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface BaseProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  className?: string;
  icon?: ReactNode;
}

interface LinkProps extends BaseProps {
  to: string;
  href?: never;
  onClick?: () => void;
  type?: never;
}

interface AnchorProps extends BaseProps {
  href: string;
  /** Opens in a new tab with `rel="noopener noreferrer"`. */
  external?: boolean;
  to?: never;
  onClick?: () => void;
  type?: never;
}

interface ActionProps extends BaseProps {
  onClick: () => void;
  type?: 'button' | 'submit';
  to?: never;
  href?: never;
}

type ButtonProps = LinkProps | AnchorProps | ActionProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

/**
 * One button component for internal links, external links and actions.
 * External destinations always open in a new tab with `rel="noopener noreferrer"`.
 */
export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'secondary',
    size = 'md',
    className,
    icon,
  } = props;
  const classes = cn(
    'btn',
    variantClasses[variant],
    size === 'sm' && 'px-3 py-2 text-xs',
    className,
  );

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={classes} onClick={props.onClick}>
        {icon}
        <span>{children}</span>
      </Link>
    );
  }

  if ('href' in props && props.href) {
    const isExternal = props.external !== false;
    return (
      <a
        href={props.href}
        className={classes}
        onClick={props.onClick}
        {...(isExternal
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {icon}
        <span>{children}</span>
        {isExternal && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  }

  const { onClick, type = 'button' } = props as ActionProps;

  return (
    <button type={type} className={classes} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
