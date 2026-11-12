import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { badgeCards, type BadgeCard } from '../services/badgeService';
import type { AppState } from '../services/store';
import type { Badge } from '../types';
import { BadgeMedal, TIER_LABEL } from './BadgeMedal';

const GROUPS: { id: Badge['group']; title: string }[] = [
  { id: 'fix', title: 'Fixing your mistakes' },
  { id: 'practice', title: 'Practice and habits' },
  { id: 'milestone', title: 'Points milestones' },
];

const TIER_TEXT: Record<Badge['tier'], string> = {
  bronze: 'text-[#b84a0e] dark:text-[#fb923c]',
  silver: 'text-[#1d4ed8] dark:text-[#93c5fd]',
  gold: 'text-[#b45309] dark:text-[#fbbf24]',
  legendary: 'text-[#7e22ce] dark:text-[#e879f9]',
};

const dateText = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const rarityText = ({ holders, sectionSize }: BadgeCard) =>
  holders === 0 ? 'No one in your section has this yet' : `${holders} of ${sectionSize} in your section ${holders === 1 ? 'has' : 'have'} this`;

function BadgeProgressBar({ card }: { card: BadgeCard }) {
  const { current, target } = card.progress;
  if (target <= 1) return null;
  const shown = Math.min(current, target);
  return (
    <div className="w-full space-y-1">
      <Progress
        value={(shown / target) * 100}
        aria-label={`${card.badge.name} progress`}
        className="h-1.5 bg-secondary [&_[data-slot=progress-indicator]]:bg-[var(--inferentics-brand-primary)]"
      />
      <p className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground tabular-nums">{shown} / {target} {card.badge.unit}</p>
    </div>
  );
}

function BadgeTile({ card, onOpen }: { card: BadgeCard; onOpen: () => void }) {
  const { badge, earnedAt } = card;
  const locked = !earnedAt;
  return (
    <li data-badge={badge.id} data-earned={!locked}>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'group flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-center transition-shadow outline-none hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50',
          locked ? 'border-dashed bg-transparent' : 'bg-card shadow-sm',
        )}
      >
        <BadgeMedal badge={badge} size={88} locked={locked} className="transition-transform group-hover:scale-105" />
        <span className={cn('text-[14px] leading-5 font-medium tracking-[-0.084px]', locked ? 'text-muted-foreground' : 'text-foreground')}>{badge.name}</span>
        <span className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{badge.description}</span>
        {locked && <span className="mt-auto w-full pt-1"><BadgeProgressBar card={card} /></span>}
        {!locked && earnedAt && <span className={cn('mt-auto pt-1 text-[12px] leading-4 font-medium tracking-[-0.072px]', TIER_TEXT[badge.tier])}>{TIER_LABEL[badge.tier]}</span>}
      </button>
    </li>
  );
}

function BadgeDetail({ card, onClose }: { card: BadgeCard; onClose: () => void }) {
  const { badge, earnedAt } = card;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="rounded-2xl sm:max-w-[420px]" data-testid="badge-detail">
        <div className="flex flex-col items-center gap-3 text-center">
          <BadgeMedal badge={badge} size={160} locked={!earnedAt} className={earnedAt ? 'badge-pop' : undefined} />
          <div>
            <DialogTitle className="text-[24px] leading-8 font-semibold tracking-[-0.132px] text-foreground">{badge.name}</DialogTitle>
            <p className={cn('text-[14px] leading-5 font-medium tracking-[-0.084px]', TIER_TEXT[badge.tier])}>{TIER_LABEL[badge.tier]}</p>
          </div>
          <DialogDescription className="text-[16px] leading-6 text-muted-foreground">{badge.description}</DialogDescription>
          <p className="text-[16px] leading-6 text-foreground">{badge.meaning}</p>
          {!earnedAt && <BadgeProgressBar card={card} />}
          <div className="text-[14px] leading-5 text-muted-foreground">
            {earnedAt && <p>Earned on {dateText(earnedAt)}</p>}
            <p data-testid="badge-rarity">{rarityText(card)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The student's trophy case: everything earned, and what's left to earn with live progress. */
export function BadgeCase({ state }: { state: AppState }) {
  const cards = useMemo(() => badgeCards(state), [state]);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = cards.find((c) => c.badge.id === openId);

  return (
    <div className="space-y-6" data-testid="profile-badges">
      {GROUPS.map((group) => (
        <div key={group.id} className="space-y-3">
          <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">{group.title}</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.filter((c) => c.badge.group === group.id).map((c) => (
              <BadgeTile key={c.badge.id} card={c} onOpen={() => setOpenId(c.badge.id)} />
            ))}
          </ul>
        </div>
      ))}
      {open && <BadgeDetail card={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
