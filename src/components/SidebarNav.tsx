import { BookOpen, CalendarDays, ChevronsUpDown, Layers, Route, Settings2, ShoppingBag, SquareTerminal, Trophy, UserRound } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { remediationTotals } from '../services/remediationService';
import { useAppState } from '../services/store';
import { useStudent } from '../services/studentService';
import { AvatarImage } from './AvatarImage';

type Item = { to: string; label: string; icon: typeof Route };

const MODULES: Item[] = [
  { to: '/', label: 'Dashboard', icon: SquareTerminal },
  { to: '/remediation', label: 'Remediation', icon: Route },
];

/** Preparation and Flashcards exist to help fix exam mistakes, so they sit under remediation. */
const TOOLS: Item[] = [
  { to: '/preparation', label: 'Preparation', icon: BookOpen },
  { to: '/flashcards', label: 'Flashcards', icon: Layers },
];

const PLANNING = [{ to: '/timetable', label: 'Timetable', icon: CalendarDays }];

const PROGRESS = [
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/avatars', label: 'Avatar store', icon: ShoppingBag },
  { to: '/profile', label: 'My profile', icon: UserRound },
];

const isActive = (pathname: string, to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

function Logomark({ letter }: { letter: string }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-[12px] bg-[#0c111d] text-[13px] dark:bg-slate-700 leading-none font-bold text-white">
      {letter}
    </div>
  );
}

function useMarksLeft() {
  return useAppState((s) => remediationTotals(s).marksLeft);
}

function NavItem({ item, collapsed, count }: { item: Item; collapsed: boolean; count?: number }) {
  const { pathname } = useLocation();
  const active = isActive(pathname, item.to);
  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center rounded-md text-[14px] leading-5 transition-colors',
        collapsed ? 'h-8 justify-center' : 'gap-2 px-2 py-1.5',
        active
          ? collapsed
            ? 'bg-sidebar-accent'
            : 'bg-[#e0e7ff] font-medium tracking-[-0.084px] text-[#312e81] dark:bg-[#312e81] dark:text-[#e0e7ff]'
          : 'font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && count !== undefined && count > 0 && (
        <span
          className="shrink-0 rounded-full bg-[var(--inferentics-brand-primary)] px-1.5 py-px text-[11px] leading-4 font-semibold text-white tabular-nums"
          aria-label={`${count} marks left to fix`}
          title={`${count} marks left to fix`}
          data-testid="nav-marks-left"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/** Loam's 244px sidebar, narrowing to 48px when collapsed. */
export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const student = useStudent();
  const marksLeft = useMarksLeft();
  return (
    <aside className={cn('hidden shrink-0 flex-col border-r border-border bg-background shadow-sm transition-[width] md:flex', collapsed ? 'w-[48px]' : 'w-[244px]')}>
      <div className="shrink-0 p-2">
        <div className={cn('flex h-12 items-center gap-2 rounded-md', collapsed ? 'justify-center' : 'px-2')}>
          <Logomark letter={student.name.charAt(0)} />
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="truncate text-[14px] leading-none font-medium tracking-[-0.084px] text-sidebar-foreground">Student Learning</p>
              <p className="truncate text-[12px] leading-none font-normal tracking-[-0.072px] text-sidebar-foreground">
                Current Year: {student.class} {student.section}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {MODULES.map((item) => <NavItem key={item.to} item={item} collapsed={collapsed} count={item.to === '/remediation' ? marksLeft : undefined} />)}
        </div>
        <div className="mt-4 flex flex-col gap-1">
          {!collapsed && <p className="px-2 pt-1 pb-0.5 text-[12px] leading-4 font-normal tracking-[-0.072px] text-muted-foreground">Practice tools</p>}
          {TOOLS.map((item) => <NavItem key={item.to} item={item} collapsed={collapsed} />)}
        </div>
        <div className="mt-4 flex flex-col gap-1">
          {!collapsed && <p className="px-2 pt-1 pb-0.5 text-[12px] leading-4 font-normal tracking-[-0.072px] text-muted-foreground">Plan</p>}
          {PLANNING.map((item) => <NavItem key={item.to} item={item} collapsed={collapsed} />)}
        </div>
        <div className="mt-4 flex flex-col gap-1">
          {!collapsed && <p className="px-2 pt-1 pb-0.5 text-[12px] leading-4 font-normal tracking-[-0.072px] text-muted-foreground">Your progress</p>}
          {PROGRESS.map((item) => <NavItem key={item.to} item={item} collapsed={collapsed} />)}
        </div>
      </nav>

      <div className="shrink-0 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn('flex h-12 w-full items-center rounded-md transition-colors hover:bg-sidebar-accent', collapsed ? 'justify-center' : 'gap-2 px-2')}>
              <AvatarImage config={student.avatar} className="size-8 shrink-0 rounded-lg" />
              {!collapsed && (
                <>
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px] text-left">
                    <p className="truncate text-[14px] leading-none font-semibold tracking-[-0.084px] text-sidebar-foreground">{student.name}</p>
                    <p className="truncate text-[12px] leading-none font-normal tracking-[-0.072px] text-sidebar-foreground">{student.id}</p>
                  </div>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[228px]">
            <DropdownMenuItem asChild><Link to="/profile"><UserRound className="size-4" />My profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/settings"><Settings2 className="size-4" />Demo settings</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

/** Loam is desktop only, but the SRS requires phones, so the sidebar becomes a bottom bar. Remediation takes the raised middle slot. */
export function MobileNav() {
  const marksLeft = useMarksLeft();
  const items = [MODULES[0], TOOLS[0], MODULES[1], TOOLS[1], ...PLANNING];
  return (
    <nav aria-label="Main" className="flex shrink-0 border-t border-border bg-background md:hidden">
      {items.map((item) => {
        const main = item.to === '/remediation';
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive: active }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] leading-3 font-medium',
                main ? 'font-semibold text-foreground' : active ? 'text-[#312e81] dark:text-[#a5b4fc]' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive: active }) => (
              <>
                {main ? (
                  <span
                    className={cn(
                      'relative -mt-5 flex size-11 items-center justify-center rounded-full text-white shadow-md ring-4 ring-background',
                      active ? 'bg-[var(--inferentics-brand-primary-hover)]' : 'bg-[var(--inferentics-brand-primary)]',
                    )}
                  >
                    <item.icon className="size-5" />
                    {marksLeft > 0 && (
                      <span className="absolute -top-1 -right-1 rounded-full bg-foreground px-1 text-[9px] leading-[14px] text-background tabular-nums" aria-label={`${marksLeft} marks left to fix`}>
                        {marksLeft}
                      </span>
                    )}
                  </span>
                ) : (
                  <item.icon className="size-5" />
                )}
                <span className="max-w-full truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
