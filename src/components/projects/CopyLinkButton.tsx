import { useCopyLink } from '@/hooks/useCopyLink';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/cn';

interface CopyLinkButtonProps {
  /** Site-relative path to share. Defaults to the current location. */
  path?: string;
  label?: string;
  className?: string;
}

/**
 * Copy-link control with truthful feedback.
 *
 * When a production origin is configured, the canonical URL is copied;
 * otherwise the visitor's own address is copied, so the shared link is always
 * one that actually resolves.
 */
export function CopyLinkButton({
  path,
  label = 'Copy link',
  className,
}: CopyLinkButtonProps) {
  const { status, copy } = useCopyLink(path);

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <button
        type="button"
        className="btn btn-secondary px-3.5 py-2 text-sm"
        onClick={() => void copy()}
      >
        <span aria-hidden="true" className="font-mono text-xs">
          ⧉
        </span>
        <span>{status === 'copied' ? 'Link copied' : label}</span>
      </button>
      <span className="mono-meta" role="status" aria-live="polite">
        {status === 'copied' && 'Link copied to the clipboard.'}
        {status === 'failed' &&
          'Copy failed — select the address bar to copy the link.'}
        {status === 'idle' &&
          (siteConfig.url
            ? 'Copies the canonical URL.'
            : 'Copies this page\u2019s address.')}
      </span>
    </div>
  );
}
