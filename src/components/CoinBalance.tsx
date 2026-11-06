import { Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { walletState } from '../services/studentService';

export function CoinIcon({ className }: { className?: string }) {
  return <Coins className={cn('size-4 shrink-0 text-amber-500', className)} aria-hidden="true" />;
}

const STYLE = {
  normal: 'border-input bg-background text-foreground',
  low: 'border-warn/30 bg-warn-soft text-warn',
  insufficient: 'border-bad/30 bg-bad-soft text-bad',
};
const LABEL = { normal: '', low: 'Low balance', insufficient: 'Too low for hints' };

export function CoinBalance({ coins }: { coins: number }) {
  const state = walletState(coins);
  return (
    <Link
      to="/profile"
      data-testid="wallet"
      className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[14px] leading-5 font-medium tracking-[-0.084px] tabular-nums shadow-xs', STYLE[state])}
    >
      <CoinIcon />
      <span className="sr-only">Coins: </span>
      <span data-testid="wallet-amount">{coins.toLocaleString('en-IN')}</span>
      {state !== 'normal' && <span className="hidden text-[12px] leading-4 tracking-[-0.072px] sm:inline">{LABEL[state]}</span>}
    </Link>
  );
}
