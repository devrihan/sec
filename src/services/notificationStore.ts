import { getState, newId, updateState } from './store';
import type { AppNotification, NotificationType } from '../types';

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  /** One notification per key, ever. Time-based checks run repeatedly and rely on this. */
  dedupeKey: string;
  /** Pop a toast as well as adding to the list. */
  announce?: boolean;
}

let listener: ((n: AppNotification) => void) | null = null;

export function setNotificationListener(next: ((n: AppNotification) => void) | null): void {
  listener = next;
}

export function pushNotification(input: NotificationInput, now: Date = new Date()): AppNotification | null {
  const s = getState();
  if (s.notifications.some((n) => n.dedupeKey === input.dedupeKey)) return null;
  const notification: AppNotification = {
    id: newId('NTF'),
    studentId: s.demoStudentId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    dedupeKey: input.dedupeKey,
    createdAt: now.toISOString(),
    readAt: null,
  };
  updateState((st) => ({ ...st, notifications: [...st.notifications, notification] }));
  if (input.announce) listener?.(notification);
  return notification;
}

export function markRead(id: string): void {
  const readAt = new Date().toISOString();
  updateState((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (n.id === id && !n.readAt ? { ...n, readAt } : n)),
  }));
}

export function markAllRead(): void {
  const readAt = new Date().toISOString();
  updateState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.readAt ? n : { ...n, readAt })) }));
}

/** Newest first. Items created in the same moment keep their reverse insertion order. */
export function sortedNotifications(list: AppNotification[]): AppNotification[] {
  return list
    .map((n, i) => ({ n, i }))
    .sort((a, b) => b.n.createdAt.localeCompare(a.n.createdAt) || b.i - a.i)
    .map(({ n }) => n);
}
