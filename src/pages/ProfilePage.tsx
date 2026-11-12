import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AvatarImage } from '../components/AvatarImage';
import { BadgeCase } from '../components/BadgeCase';
import { PageTitle, SectionHeading, WHITE_PANEL } from '../components/page-parts';
import { SLOT_CROP, withItem } from '../avatar3d/options';
import { allBadges, avatarById } from '../services/catalog';
import { rankOf } from '../services/leaderboardService';
import { useAppState } from '../services/store';
import { badgesOf, equipAvatar, useCoins, useEarnedPoints, useStudent } from '../services/studentService';

const TYPE_LABEL: Record<string, string> = {
  OPENING_BALANCE: 'Opening balance',
  QUIZ_REWARD: 'Quiz reward',
  MULTIPLAYER_REWARD: 'Room reward',
  HINT_PURCHASE: 'Hint',
  AVATAR_PURCHASE: 'Avatar',
  REMEDIATION_REWARD: 'Remediation reward',
  DEMO_ADJUSTMENT: 'Demo adjustment',
};

const signed = (n: number) => (n === 0 ? '—' : `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('en-IN')}`);
const HEAD = 'h-auto px-4 py-3 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground';
const CELL = 'px-4 py-3 text-[14px] leading-5';

function Metric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div>
      <dt className="text-[14px] leading-5 text-muted-foreground">{label}</dt>
      <dd className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px] text-foreground tabular-nums" data-testid={testId}>{value}</dd>
    </div>
  );
}

export function ProfilePage() {
  const student = useStudent();
  const coins = useCoins();
  const points = useEarnedPoints();
  const state = useAppState((s) => s);
  const earned = badgesOf(state, student.id);
  const owned = state.studentAvatars.filter((a) => a.studentId === student.id);
  const history = state.transactions.filter((t) => t.studentId === student.id).slice().reverse();

  return (
    <>
      <PageTitle title="My profile" sub={`${student.id} • Class ${student.class} • Section ${student.section} • ${student.academicYear}`} />

      <section className={cn(WHITE_PANEL, 'flex flex-wrap items-center gap-6')}>
        <AvatarImage config={student.avatar} alt={`${student.name}'s 3D avatar`} className="size-20" testId="profile-avatar" />
        <div className="min-w-0">
          <h2 className="text-2xl leading-8 font-semibold tracking-[-0.132px] text-foreground">{student.name}</h2>
          <p className="text-[16px] leading-6 text-muted-foreground">Wearing {avatarById(student.avatar.top)?.name}</p>
        </div>
        <dl className="flex flex-wrap gap-x-10 gap-y-3 lg:ml-auto">
          <Metric label="Available coins" value={coins.toLocaleString('en-IN')} testId="profile-coins" />
          <Metric label="Total earned points" value={points.toLocaleString('en-IN')} testId="profile-points" />
          <Metric label="Section rank" value={`#${rankOf(state, student.id)}`} />
        </dl>
      </section>

      <section>
        <SectionHeading title="Your badges" sub={`${earned.length} of ${allBadges().length} earned. Each one marks something you really did.`} />
        <BadgeCase state={state} />
      </section>

      <section>
        <SectionHeading title="Your inventory" sub="Items you buy stay here for good" aside={<Button asChild variant="outline"><Link to="/avatars">Customise avatar</Link></Button>} />
        <ul className="flex flex-wrap gap-4" data-testid="owned-avatars">
          {owned.map((o) => {
            const a = avatarById(o.avatarId);
            return (
              <li key={o.avatarId} data-avatar={o.avatarId} className="flex w-[150px] flex-col items-center gap-2 rounded-xl border bg-card p-4 shadow-sm">
                {a && <AvatarImage config={withItem(student.avatar, a)} crop={SLOT_CROP[a.slot]} className="size-14" />}
                <span className="truncate text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">{a?.name}</span>
                {a && student.avatar[a.slot] === o.avatarId
                  ? <Badge variant="secondary">Equipped</Badge>
                  : <Button variant="outline" size="xs" onClick={() => equipAvatar(o.avatarId)}>Equip</Button>}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionHeading title="Transaction history" />
        <div className="overflow-hidden rounded-xl border border-sidebar-border bg-background">
          <Table data-testid="ledger">
            <TableHeader>
              <TableRow className="border-sidebar-border bg-table-head hover:bg-table-head">
                <TableHead className={HEAD}>Date</TableHead>
                <TableHead className={HEAD}>Type</TableHead>
                <TableHead className={HEAD}>Reason</TableHead>
                <TableHead className={cn(HEAD, 'text-right')}>Coins</TableHead>
                <TableHead className={cn(HEAD, 'text-right')}>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((t) => (
                <TableRow key={t.id} className="border-sidebar-border bg-background hover:bg-muted/30">
                  <TableCell className={cn(CELL, 'tabular-nums')}>{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell className={CELL}>{TYPE_LABEL[t.type] ?? t.type}</TableCell>
                  <TableCell className={CELL}>{t.reason}</TableCell>
                  <TableCell className={cn(CELL, 'text-right tabular-nums', t.coinAmount < 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400')}>{signed(t.coinAmount)}</TableCell>
                  <TableCell className={cn(CELL, 'text-right tabular-nums')}>{signed(t.pointsAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
