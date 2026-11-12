import { CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationRow, useNotifications } from '../components/NotificationBell';
import { PageTitle } from '../components/page-parts';
import { markAllRead } from '../services/notificationStore';

const SEGMENT = 'flex-none rounded-[4px] px-3 py-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[0px_1px_1px_rgba(0,0,0,0.05)]';

export function NotificationsPage() {
  const { list, unread } = useNotifications();
  const [filter, setFilter] = useState('all');
  const shown = filter === 'unread' ? list.filter((n) => !n.readAt) : list;

  return (
    <>
      <PageTitle
        title="Notifications"
        sub={unread ? `You have ${unread} unread` : "You're all caught up"}
        aside={<Button variant="outline" disabled={unread === 0} onClick={markAllRead} data-testid="mark-all-read"><CheckCheck className="size-4" />Mark all as read</Button>}
      />
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="h-auto gap-0 rounded-md bg-secondary p-1 group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsTrigger value="all" className={SEGMENT}>All</TabsTrigger>
          <TabsTrigger value="unread" className={SEGMENT}>Unread</TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <EmptyState variant="page" title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'} description="Reminders, rewards and leaderboard updates will land here." />
      ) : (
        <div className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-background" data-testid="notification-list">
          {shown.map((n) => <NotificationRow key={n.id} notification={n} />)}
        </div>
      )}
    </>
  );
}
