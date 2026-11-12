import { Check, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AvatarImage } from './AvatarImage';
import type { AvatarStatus } from './AvatarCard';
import { CoinIcon } from './CoinBalance';
import type { Avatar, AvatarConfig } from '../types';

interface Props {
  item: Avatar;
  status: AvatarStatus;
  coins: number;
  previewConfig: AvatarConfig;
  previewing: boolean;
  legendary?: boolean;
  onPreview: () => void;
  onBuy: () => void;
  onEquip: () => void;
  onRemove: () => void;
}

/** A hero in the store: a full-body render, and how close the student's coins are to unlocking it. */
export function HeroCard({ item, status, coins, previewConfig, previewing, legendary, onPreview, onBuy, onEquip, onRemove }: Props) {
  const locked = status === 'insufficient';
  const progress = Math.min(100, Math.round((coins / item.price) * 100));
  return (
    <Card
      data-testid="hero-card"
      data-status={status}
      data-avatar={item.id}
      className={cn(
        'relative items-center gap-2 overflow-hidden rounded-xl p-3 text-center',
        legendary && 'border-amber-400/60 bg-gradient-to-b from-amber-50 to-background dark:from-amber-950/40',
        status === 'equipped' && 'border-[#008a2e]/50',
        previewing && 'border-primary ring-2 ring-primary/30',
      )}
    >
      {locked && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-label="Locked">
          <Lock className="size-3.5" />
        </span>
      )}
      {(status === 'owned' || status === 'equipped') && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-good text-white" aria-label="Unlocked">
          <Sparkles className="size-3.5" />
        </span>
      )}
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Try on ${item.name}`}
        title={item.description}
        className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <AvatarImage config={previewConfig} crop="full" alt="" className={cn('h-36 w-28 rounded-xl', locked && 'opacity-70 grayscale-[35%]')} />
      </button>
      <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">{item.name}</h3>
      <p className="line-clamp-2 min-h-8 text-[12px] leading-4 text-muted-foreground">{item.description}</p>
      <p className="flex items-center gap-1 text-[12px] leading-4 font-medium text-foreground tabular-nums">
        <CoinIcon className="size-3.5" />{item.price.toLocaleString('en-IN')} coins
      </p>
      <div className="mt-1 flex min-h-[56px] w-full flex-col items-center gap-1.5">
        {status === 'available' && <Button size="sm" onClick={onBuy} data-testid="unlock-hero">Unlock</Button>}
        {locked && (
          <div className="w-full space-y-1" data-testid="hero-progress">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={item.price} aria-valuenow={coins} aria-label={`${item.name} unlock progress`}>
              <span className="block h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[12px] leading-4 text-muted-foreground tabular-nums">{(item.price - coins).toLocaleString('en-IN')} more coins to unlock</p>
          </div>
        )}
        {status === 'owned' && <Button variant="outline" size="sm" onClick={onEquip}>Become {item.name.split(',')[0]}</Button>}
        {status === 'equipped' && (
          <>
            <span className="flex h-6 items-center gap-1 text-[14px] leading-5 font-medium text-good"><Check className="size-4" />Equipped</span>
            <Button variant="ghost" size="xs" onClick={onRemove}>Take off</Button>
          </>
        )}
      </div>
    </Card>
  );
}
