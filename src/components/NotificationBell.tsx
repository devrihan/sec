import { Bell, CalendarClock, CheckCheck, GraduationCap, Layers, Sparkles, Sun, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { markAllRead, markRead, sortedNotifications } from '../services/notificationStore';
import { useAppState } from '../services/store';
import type { AppNotification, NotificationType } from '../types';

const ICON: Record<NotificationType, typeof Bell> = {
  timetable: CalendarClock,
  leaderboard: Trophy,
  learning: Layers,
  achievement: Sparkles,
  exam: GraduationCap,
  holiday: Sun,
};

export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function useNotifications() {
  const all = useAppState((s) => s.notifications);
  const list = useMemo(() => sortedNotifications(all), [all]);
  return { list, unread: list.filter((n) => !n.readAt).length };
}

export function NotificationRow({ notification: n, onOpen }: { notification: AppNotification; onOpen?: () => void }) {
  const navigate = useNavigate();
  const Icon = ICON[n.type];
  return (
    <div className={cn('flex items-start gap-1', !n.readAt && 'bg-secondary/60')} data-testid="notification" data-type={n.type} data-read={Boolean(n.readAt)}>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left hover:bg-muted/40"
        onClick={() => {
          markRead(n.id);
          onOpen?.();
          if (n.href) navigate(n.href);
        }}
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">{n.title}</span>
          <span className="block text-[14px] leading-5 text-muted-foreground">{n.body}</span>
          <span className="mt-0.5 block text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
        </span>
      </button>
      {!n.readAt && (
        <button
          type="button"
          aria-label={`Mark "${n.title}" as read`}
          data-testid="mark-read"
          className="mt-3 mr-3 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          onClick={() => markRead(n.id)}
        >
          <span className="size-2 rounded-full bg-[#3b82f6]" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { list, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          data-testid="bell"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-background shadow-xs hover:bg-accent"
        >
          <Bell className="size-4 text-foreground" />
          {unread > 0 && (
            <span data-testid="unread-count" className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e60000] px-1 text-[10px] leading-none font-medium text-white tabular-nums">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-2rem)] gap-0 p-0" data-testid="notification-panel">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">Notifications</p>
          <Button variant="ghost" size="xs" disabled={unread === 0} onClick={markAllRead}><CheckCheck className="size-3.5" />Mark all as read</Button>
        </div>
        <div className="max-h-[400px] divide-y divide-sidebar-border overflow-y-auto">
          {list.length === 0 && <p className="px-4 py-6 text-center text-[14px] leading-5 text-muted-foreground">Nothing yet. Reminders and rewards will land here.</p>}
          {list.slice(0, 6).map((n) => <NotificationRow key={n.id} notification={n} onOpen={() => setOpen(false)} />)}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
