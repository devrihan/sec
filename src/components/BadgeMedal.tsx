import { cn } from '@/lib/utils';
import type { Badge } from '../types';

export const TIER_LABEL: Record<Badge['tier'], string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  legendary: 'Legendary',
};

/** A badge's medal. Locked medals stay visible in grey, so students can see what's left to earn. */
export function BadgeMedal({ badge, size, locked, className }: { badge: Badge; size: number; locked?: boolean; className?: string }) {
  return (
    <img
      src={badge.imageUrl}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 drop-shadow-sm', locked && 'opacity-40 grayscale', className)}
    />
  );
}

/** The celebration shown wherever a badge is earned. */
export function BadgeUnlock({ badges, testId }: { badges: Badge[]; testId?: string }) {
  if (badges.length === 0) return null;
  return (
    <div className="rounded-xl border border-good-edge bg-good-soft p-4" data-testid={testId}>
      <p className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-good">
        {badges.length === 1 ? 'Badge unlocked' : 'Badges unlocked'}
      </p>
      <ul className="mt-3 grid gap-3">
        {badges.map((b) => (
          <li key={b.id} className="flex items-center gap-3">
            <BadgeMedal badge={b} size={72} className="badge-pop" />
            <div className="min-w-0">
              <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground">{b.name}</p>
              <p className="text-[14px] leading-5 text-muted-foreground">{b.description}</p>
              <p className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{TIER_LABEL[b.tier]}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
