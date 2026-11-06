import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getLeaderboard, nearby } from '../services/leaderboardService';
import { dismissPopup, getState, usePopup } from '../services/store';
import { currentStudent } from '../services/studentService';
import { CoinIcon } from './CoinBalance';
import { LeaderboardTable } from './LeaderboardTable';

const fmt = (n: number) => n.toLocaleString('en-IN');
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`;

function Fact({ label, children, testId }: { label: string; children: React.ReactNode; testId: string }) {
  return (
    <div>
      <dt className="text-[14px] leading-5 text-muted-foreground">{label}</dt>
      <dd className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground tabular-nums" data-testid={testId}>{children}</dd>
    </div>
  );
}

/** One popup for every point-affecting action (SRS 4.2, FR-029). */
export function TransactionModal() {
  const popup = usePopup();
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);
  const student = currentStudent();
  const rows = useMemo(() => (popup ? nearby(getLeaderboard(getState()), 2) : []), [popup]);

  if (!popup) return null;
  const { transaction: t } = popup;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismissPopup(); }}>
      <DialogContent
        showCloseButton={false}
        data-testid="transaction-modal"
        className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-[560px]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          closeRef.current?.focus();
        }}
      >
        <div>
          <DialogTitle className={`flex items-center gap-2 text-[30px] leading-[36px] font-semibold tracking-[-0.225px] ${t.coinAmount < 0 ? 'text-[#e76e4f]' : 'text-[#008138]'}`}>
            <CoinIcon className="size-6" />
            {signed(t.coinAmount)} coins
          </DialogTitle>
          <DialogDescription className="text-[16px] leading-6 text-muted-foreground">{t.reason}</DialogDescription>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Fact label="Previous wallet" testId="txn-prev">{fmt(popup.previousCoins)}</Fact>
          <Fact label="New wallet" testId="txn-new">{fmt(popup.newCoins)}</Fact>
          <Fact label="Leaderboard points" testId="txn-points">{t.pointsAmount === 0 ? 'No change' : signed(t.pointsAmount)}</Fact>
          <Fact label="Your section rank" testId="txn-rank">
            #{popup.newRank} <span className="text-[14px] font-normal text-muted-foreground">(Class {student.class}{student.section})</span>
          </Fact>
        </dl>
        {popup.newRank !== popup.previousRank && (
          <p className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-green-700">
            You moved from #{popup.previousRank} to #{popup.newRank}.
          </p>
        )}

        {popup.newBadges.length > 0 && (
          <div className="rounded-lg border border-[#d3fde5] bg-[#ecfdf2] px-4 py-3" data-testid="txn-badges">
            <p className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-[#008a2e]">
              {popup.newBadges.length === 1 ? 'Badge unlocked' : 'Badges unlocked'}
            </p>
            <ul className="mt-1 flex flex-wrap gap-3">
              {popup.newBadges.map((b) => (
                <li key={b.id} className="flex items-center gap-1.5 text-[14px] leading-5 text-foreground">
                  <img src={b.imageUrl} alt="" width={24} height={24} />
                  {b.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">Updated leaderboard</h3>
          <LeaderboardTable rows={rows} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              dismissPopup();
              navigate('/leaderboard');
            }}
          >
            View leaderboard
          </Button>
          <Button ref={closeRef} onClick={dismissPopup}>Continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
