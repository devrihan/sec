import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { OPTIONAL_SLOTS, SLOT_CROP } from '../avatar3d/options';
import { AvatarImage } from './AvatarImage';
import { CoinIcon } from './CoinBalance';
import type { Avatar, AvatarConfig } from '../types';

export type AvatarStatus = 'available' | 'insufficient' | 'owned' | 'equipped';

interface Props {
  item: Avatar;
  status: AvatarStatus;
  shortBy: number;
  previewConfig: AvatarConfig;
  previewing: boolean;
  onPreview: () => void;
  onBuy: () => void;
  onEquip: () => void;
  onRemove: () => void;
}

export function AvatarCard({ item, status, shortBy, previewConfig, previewing, onPreview, onBuy, onEquip, onRemove }: Props) {
  const removable = status === 'equipped' && OPTIONAL_SLOTS.includes(item.slot);
  return (
    <Card
      data-testid="avatar-card"
      data-status={status}
      data-avatar={item.id}
      className={cn('items-center gap-2 rounded-xl p-3 text-center', status === 'equipped' && 'border-[#008a2e]/40', previewing && 'border-primary')}
    >
      <button type="button" onClick={onPreview} aria-label={`Try on ${item.name}`} title={item.description} className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <AvatarImage config={previewConfig} crop={SLOT_CROP[item.slot]} alt="" className={cn('size-24', status === 'insufficient' && 'opacity-60')} />
      </button>
      <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">{item.name}</h3>
      <p className="flex items-center gap-1 text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground tabular-nums">
        {item.price === 0 ? 'Free' : <><CoinIcon className="size-3.5" />{item.price.toLocaleString('en-IN')} coins</>}
      </p>
      <div className="mt-1 flex min-h-[52px] flex-col items-center gap-1">
        {status === 'available' && <Button size="sm" onClick={onBuy}>Purchase</Button>}
        {status === 'insufficient' && (
          <>
            <Button size="sm" disabled>Purchase</Button>
            <p className="text-[12px] leading-4 tracking-[-0.072px] text-[#e60000]">{shortBy.toLocaleString('en-IN')} more coins needed</p>
          </>
        )}
        {status === 'owned' && <Button variant="outline" size="sm" onClick={onEquip}>Equip</Button>}
        {status === 'equipped' && (
          <span className="flex h-8 items-center gap-1 text-[14px] leading-5 font-medium tracking-[-0.084px] text-[#008a2e]"><Check className="size-4" />Equipped</span>
        )}
        {removable && <Button variant="ghost" size="xs" onClick={onRemove}>Remove</Button>}
      </div>
    </Card>
  );
}
