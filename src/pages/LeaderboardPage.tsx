import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-states/empty-state';
import { LeaderboardSkeleton, LeaderboardTable } from '../components/LeaderboardTable';
import { BackLink, PageTitle } from '../components/page-parts';
import { LEADERBOARD_LATENCY_MS } from '../config/rewards';
import { getLeaderboard } from '../services/leaderboardService';
import { useAppState } from '../services/store';
import { useStudent } from '../services/studentService';

export function LeaderboardPage() {
  const student = useStudent();
  const state = useAppState((s) => s);
  const [loading, setLoading] = useState(true);
  const rows = useMemo(() => getLeaderboard(state), [state]);
  const me = rows.find((r) => r.isCurrent);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), LEADERBOARD_LATENCY_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <BackLink to="/flashcards">Flashcards</BackLink>
      <PageTitle
        title={`Class ${student.class}${student.section} leaderboard`}
        sub={`Cumulative earned points for ${student.academicYear}. Spending coins never lowers your points.`}
      />
      {loading ? (
        <LeaderboardSkeleton />
      ) : (
        <>
          {rows.length <= 1 && <EmptyState variant="page" title="No classmates here yet" description="You're the only student in this section of the demo." />}
          {me && rows.length > 1 && (
            <p className="text-[20px] leading-7 font-medium tracking-[-0.12px] text-foreground">
              You are <span data-testid="my-rank">#{me.rank}</span> of {rows.length} in your section
            </p>
          )}
          <LeaderboardTable rows={rows} />
        </>
      )}
    </>
  );
}
