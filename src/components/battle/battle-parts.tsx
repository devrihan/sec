import { Atom, Check, Crown, Flame, Rocket, Shield, UserRound, Zap, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { AvatarImage } from '../AvatarImage';
import { seedStudentById } from '../../services/catalog';
import { useAppState } from '../../services/store';

export const EMBLEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Rocket, label: 'Rocket' },
  { icon: Zap, label: 'Bolt' },
  { icon: Flame, label: 'Flame' },
  { icon: Atom, label: 'Atom' },
  { icon: Crown, label: 'Crown' },
  { icon: Shield, label: 'Shield' },
];

/** Re-renders on an interval, for countdowns. */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function TeamEmblem({ emblem, className, iconClassName }: { emblem: number; className?: string; iconClassName?: string }) {
  const { icon: Icon, label } = EMBLEMS[emblem % EMBLEMS.length];
  return (
    <span
      role="img"
      aria-label={`${label} emblem`}
      className={cn(`em-${emblem % EMBLEMS.length}`, 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--em)] text-white shadow-sm', className)}
    >
      <Icon className={cn('size-5', iconClassName)} aria-hidden="true" />
    </span>
  );
}

export const studentName = (id: string) => seedStudentById(id)?.name ?? id;

/** A player's 3D avatar head with optional leader and ready marks. */
export function PlayerAvatar({
  studentId,
  size = 'md',
  leader,
  ready,
  speaking,
}: {
  studentId: string;
  size?: 'sm' | 'md' | 'lg';
  leader?: boolean;
  ready?: boolean;
  speaking?: boolean;
}) {
  const config = useAppState((s) => s.avatarConfigs[studentId]);
  const dim = size === 'lg' ? 'size-16' : size === 'md' ? 'size-10' : 'size-7';
  return (
    <span className="relative inline-flex shrink-0">
      {config ? (
        <AvatarImage config={config} className={cn(dim, 'transition-shadow', speaking && 'battle-speaking')} alt="" />
      ) : (
        <span className={cn(dim, 'flex items-center justify-center rounded-full bg-muted text-muted-foreground')}><UserRound className="size-1/2" /></span>
      )}
      {leader && (
        <span className="absolute -top-1.5 -left-1 flex size-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 ring-2 ring-background" title="Team leader">
          <Crown className="size-3" aria-hidden="true" />
        </span>
      )}
      {ready && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-good text-white ring-2 ring-background" title="Ready">
          <Check className="size-3" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatMinutes(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  return `${m} min`;
}
