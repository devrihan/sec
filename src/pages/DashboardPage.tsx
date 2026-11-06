import { CalendarDays, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BadgePill } from '../components/BadgePill';
import { CardGrid, PageTitle, SectionHeading } from '../components/page-parts';
import { ProgressBar } from '../components/ProgressBar';
import { SectionAverageCard } from '../components/section-average-card';
import { StatCard } from '../components/stat-card';
import { formatTime, toDateKey } from '../lib/dates';
import { chapterById, subjectById } from '../services/catalog';
import { getLeaderboard } from '../services/leaderboardService';
import { activeRoadmaps } from '../services/remediationService';
import { useAppState } from '../services/store';
import { latestBadgeIdOf, subjectsForClass, useEarnedPoints, useStudent } from '../services/studentService';
import { sessionsOn } from '../services/timetableService';

export function DashboardPage() {
  const student = useStudent();
  const points = useEarnedPoints();
  const state = useAppState((s) => s);
  const latestBadge = latestBadgeIdOf(state, student.id);

  const board = useMemo(() => getLeaderboard(state), [state]);
  const allRoadmaps = useMemo(() => activeRoadmaps(state), [state]);
  const me = board.find((r) => r.isCurrent);
  const ahead = me && me.rank > 1 ? board[me.rank - 2] : null;
  const toFix = allRoadmaps.reduce((sum, r) => sum + r.roadmap.total - r.roadmap.completed, 0);
  const openRoadmaps = allRoadmaps.filter((r) => !r.roadmap.isComplete).slice(0, 3);
  const todaySessions = sessionsOn(state, toDateKey(new Date())).filter((e) => !e.done);
  const unfinished = state.quizAttempts.filter((a) => a.studentId === student.id && !a.completedAt && a.mode === 'solo');

  return (
    <>
      <PageTitle title={`Welcome, ${student.name}`} sub={`Class ${student.class} • Section ${student.section}`} />

      <section className="flex flex-col gap-6 lg:flex-row">
        <SectionAverageCard label="Your points" value={points.toLocaleString('en-IN')} suffix="" className="shrink-0 lg:w-[285px]" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 rounded-xl border border-border bg-card px-6 py-4">
          <div>
            <p className="text-[24px] leading-8 font-semibold tracking-[-0.132px] text-foreground" data-testid="dashboard-rank">
              {ahead && me
                ? `You're #${me.rank} in Class ${student.class}${student.section}, ${(ahead.totalEarnedPoints - me.totalEarnedPoints).toLocaleString('en-IN')} points behind ${ahead.name}.`
                : `You lead Class ${student.class}${student.section}.`}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[16px] leading-6 text-muted-foreground">
              Your latest badge: <BadgePill badgeId={latestBadge} />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/leaderboard">View leaderboard</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/avatars">Avatar store</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/profile">My profile</Link></Button>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading title="Pick where to work today" sub="Learn, practise, then fix your weak areas" />
        <CardGrid>
          <StatCard name="Preparation" subtitle="Learn chapter-wise" label="Subjects" avg={subjectsForClass(student.class).length} href="/preparation" testId="module-preparation" />
          <StatCard name="Flashcards" subtitle="Practise & compete" label="Your section rank" avg={null} valueDisplay={me ? `#${me.rank}` : undefined} href="/flashcards" testId="module-flashcards" />
          <StatCard name="Remediation" subtitle="Improve weak areas" label="Chapters to fix" avg={toFix} href="/remediation" testId="module-remediation" />
        </CardGrid>
      </section>

      <section>
        <SectionHeading
          title="Your plan for today"
          aside={<Button asChild variant="outline"><Link to="/timetable"><CalendarDays className="size-4" />Open timetable</Link></Button>}
        />
        {todaySessions.length === 0 ? (
          <p className="rounded-lg border border-border bg-white px-4 py-6 text-[14px] leading-5 text-muted-foreground">
            No study sessions today. Open your timetable to plan one.
          </p>
        ) : (
          <ul className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-white" data-testid="today-plan">
            {todaySessions.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-4 py-3">
                <span className="w-[150px] shrink-0 text-[14px] leading-5 text-muted-foreground tabular-nums">{formatTime(e.startTime)} – {formatTime(e.endTime)}</span>
                <span className="min-w-0 flex-1 truncate text-[16px] leading-6 font-medium text-foreground">{subjectById(e.subjectId)?.name} – {chapterById(e.chapterId)?.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(unfinished.length > 0 || openRoadmaps.length > 0) && (
        <section>
          <SectionHeading title="Pick up where you left off" />
          <ul className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-white">
            {unfinished.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] leading-6 font-medium text-foreground">{chapterById(a.chapterId)?.title}</p>
                  <p className="text-[14px] leading-5 text-muted-foreground">Quiz, {a.answers.length} of {a.questionIds.length} answered. Rewards are added when you finish.</p>
                </div>
                <Button asChild variant="outline" size="sm"><Link to={`/flashcards/quiz/${a.id}`}>Resume quiz<ChevronRight className="size-3.5" /></Link></Button>
              </li>
            ))}
            {openRoadmaps.map(({ exam, subject, roadmap }) => (
              <li key={`${exam.id}-${subject.id}`} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-[16px] leading-6 font-medium text-foreground">{subject.name}, {exam.name}</p>
                  <p className="text-[14px] leading-5 text-muted-foreground">{roadmap.completed} of {roadmap.total} chapters fixed</p>
                  <ProgressBar value={roadmap.percent} label={`${subject.name} ${exam.name} progress`} />
                </div>
                <Button asChild variant="outline" size="sm" className="sm:ml-4"><Link to={`/remediation/${exam.id}/${subject.id}`}>Open roadmap<ChevronRight className="size-3.5" /></Link></Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
