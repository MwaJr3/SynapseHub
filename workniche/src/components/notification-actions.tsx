'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/actions/career';

export function MarkReadButton({
  notificationId,
}: {
  notificationId: string;
}): JSX.Element {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        await markNotificationReadAction(notificationId);
        router.refresh();
      }}
    >
      Mark as read
    </button>
  );
}

export function MarkAllReadButton(): JSX.Element {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        await markAllNotificationsReadAction();
        router.refresh();
      }}
    >
      Mark all as read
    </button>
  );
}
