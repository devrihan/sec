import { TableSkeleton } from '@/components/page-skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AvatarImage } from './AvatarImage';
import { BadgePill } from './BadgePill';
import type { LeaderboardEntry } from '../types';

const HEAD = 'h-auto px-4 py-3 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground';

export function LeaderboardTable({ rows }: { rows: LeaderboardEntry[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-sidebar-border bg-white">
      <Table data-testid="leaderboard">
        <TableHeader>
          <TableRow className="border-sidebar-border bg-green-50 hover:bg-green-50">
            <TableHead className={cn(HEAD, 'w-[72px]')}>Rank</TableHead>
            <TableHead className={HEAD}>Student</TableHead>
            <TableHead className={cn(HEAD, 'hidden sm:table-cell')}>Latest badge</TableHead>
            <TableHead className={cn(HEAD, 'text-right')}>Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            return (
              <TableRow
                key={r.studentId}
                data-testid="board-row"
                aria-current={r.isCurrent ? 'true' : undefined}
                className={cn('border-sidebar-border', r.isCurrent ? 'is-me bg-secondary hover:bg-secondary' : 'bg-white hover:bg-muted/30')}
              >
                <TableCell className="px-4 py-2.5 text-[14px] leading-5 font-medium tabular-nums">#{r.rank}</TableCell>
                <TableCell className="px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[14px] leading-5 text-foreground">
                    <AvatarImage config={r.avatar} alt={`${r.name}'s avatar`} className="size-8" />
                    <span className={r.isCurrent ? 'font-medium' : undefined}>{r.name}{r.isCurrent && ' (you)'}</span>
                  </span>
                </TableCell>
                <TableCell className="hidden px-4 py-2.5 sm:table-cell"><BadgePill badgeId={r.latestBadgeId} /></TableCell>
                <TableCell className="px-4 py-2.5 text-right text-[14px] leading-5 font-medium tabular-nums">{r.totalEarnedPoints.toLocaleString('en-IN')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return <TableSkeleton rows={6} columns={4} />;
}
