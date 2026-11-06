import { PanelLeft, Settings2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCoins, useStudent } from '../services/studentService';
import { AvatarImage } from './AvatarImage';
import { CoinBalance } from './CoinBalance';
import { NotificationBell } from './NotificationBell';

const SECTIONS: [string, string][] = [
  ['/preparation', 'Preparation'],
  ['/flashcards', 'Flashcards'],
  ['/remediation', 'Remediation'],
  ['/timetable', 'Timetable'],
  ['/leaderboard', 'Leaderboard'],
  ['/avatars', 'Avatar store'],
  ['/profile', 'My profile'],
  ['/notifications', 'Notifications'],
  ['/settings', 'Demo settings'],
];

export function AppHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { pathname } = useLocation();
  const student = useStudent();
  const coins = useCoins();
  const crumb = SECTIONS.find(([path]) => pathname.startsWith(path))?.[1] ?? 'Dashboard';

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-5 text-foreground" />
        </button>
        <div className="h-4 w-px bg-border" />
      </div>
      <div className="min-w-0 flex-1 truncate text-[18px] leading-7 font-normal tracking-[-0.108px] text-foreground">{crumb}</div>
      <CoinBalance coins={coins} />
      <NotificationBell />
      <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
        <Link to="/settings"><Settings2 className="size-4" />Demo settings</Link>
      </Button>
      <Link to="/profile" aria-label={`Profile of ${student.name}`} className="shrink-0 rounded-full">
        <AvatarImage config={student.avatar} className="size-8" />
      </Link>
    </header>
  );
}
