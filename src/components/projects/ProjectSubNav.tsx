import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export interface SubNavItem {
  id: string;
  label: string;
}

interface ProjectSubNavProps {
  items: SubNavItem[];
  ariaLabel: string;
}

/**
 * On-this-page navigation for a case study.
 *
 * The active item is tracked with an IntersectionObserver and marked with
 * `aria-current` plus a visible rail indicator, so it is not communicated by
 * colour alone.
 */
export function ProjectSubNav({ items, ariaLabel }: ProjectSubNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0]?.target as HTMLElement | undefined;
        if (first) setActiveId(first.id);
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: [0, 0.25, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={ariaLabel} className="lg:sticky lg:top-24">
      <p className="eyebrow">On this page</p>
      <ul className="mt-3 grid gap-1 border-l border-line pl-0">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="relative">
              <a
                href={`#${item.id}`}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'block border-l-2 py-1.5 pl-4 text-sm transition-colors duration-200',
                  active
                    ? 'border-accent font-medium text-ink'
                    : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
