import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { listNotifications } from '@/lib/notifications';
import { MarkAllReadButton, MarkReadButton } from '@/components/notification-actions';
import { Badge, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications' };

export default async function NotificationsPage(): Promise<JSX.Element> {
  const actor = await requireUser();
  const items = await listNotifications(actor.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <MarkAllReadButton />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          body="Application updates, alert matches and deadline reminders appear here."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`card ${item.readAt == null ? 'border-brand-200 bg-brand-50/40' : ''}`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.body ? <p className="mt-1 text-sm text-ink-muted">{item.body}</p> : null}
                  <div className="mt-2 flex items-center gap-2">
                    {item.link ? (
                      <Link href={item.link} className="text-sm font-medium text-brand-700">
                        View details
                      </Link>
                    ) : null}
                    {item.readAt == null ? (
                      <>
                        <Badge tone="info">Unread</Badge>
                        <MarkReadButton notificationId={item.id} />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
