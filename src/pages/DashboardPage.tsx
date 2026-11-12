import { BookOpen, CalendarDays, ChevronRight, Layers } from 'lucide-react';
import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BadgePill } from '../components/BadgePill';
import { DashboardCompanion } from '../components/DashboardCompanion';
import { GalaxyBackground } from '../components/GalaxyBackground';
import { PageTitle, SectionHeading } from '../components/page-parts';
import { RemediationHero } from '../components/RemediationHero';
import { formatTime, toDateKey } from '../lib/dates';
import { chapterById, subjectById } from '../services/catalog';
import { getLeaderboard } from '../services/leaderboardService';
import { revisionForChapter } from '../services/questionService';
import { examsWithErrors, nextFix, remediationTotals } from '../services/remediationService';
import { useAppState } from '../services/store';
import { latestBadgeIdOf, useEarnedPoints, useStudent } from '../services/studentService';
import { sessionsOn } from '../services/timetableService';

/** A smaller card for the modules that support remediation. */
function SupportCard({
  icon: Icon,
  name,
  line,
  to,
  allTo,
  testId,
}: {
  icon: ComponentType<{ className?: string }>;
  name: string;
  line: string;
  to: string;
  allTo: string;
  testId: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3" data-testid={testId}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <Link to={to} className="group min-w-0 flex-1">
        <p className="text-[14px] leading-5 font-medium text-foreground group-hover:underline">{name}</p>
        <p className="truncate text-[14px] leading-5 text-muted-foreground">{line}</p>
      </Link>
      <Link to={allTo} className="shrink-0 text-[12px] leading-4 text-muted-foreground hover:text-foreground">All subjects</Link>
    </div>
  );
}

export function DashboardPage() {
  const student = useStudent();
  const points = useEarnedPoints();
  const state = useAppState((s) => s);
  const latestBadge = latestBadgeIdOf(state, student.id);

  const board = useMemo(() => getLeaderboard(state), [state]);
  const totals = useMemo(() => remediationTotals(state), [state]);
  const next = useMemo(() => nextFix(state), [state]);
  const hasRecords = useMemo(() => examsWithErrors(state).length > 0, [state]);
  const me = board.find((r) => r.isCurrent);
  const ahead = me && me.rank > 1 ? board[me.rank - 2] : null;
  const todaySessions = sessionsOn(state, toDateKey(new Date())).filter((e) => !e.done);
  const unfinished = state.quizAttempts.filter((a) => a.studentId === student.id && !a.completedAt && a.mode === 'solo');

  const focus = next && { subjectId: next.subject.id, chapter: next.node.chapter };
  const revisionTo = focus
    ? `/preparation/${focus.subjectId}/${focus.chapter.id}${revisionForChapter(focus.chapter.id).length > 0 ? '/revision' : ''}`
    : '/preparation';

  return (
    <>
      <GalaxyBackground />
      <PageTitle title={`Welcome, ${student.name}`} sub={`Class ${student.class} • Section ${student.section}`} />

      <div className="-mt-2 flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[14px] leading-5 text-muted-foreground">
        <span><span className="font-semibold text-foreground tabular-nums">{points.toLocaleString('en-IN')}</span> points</span>
        <span data-testid="dashboard-rank">
          {ahead && me
            ? `#${me.rank} in Class ${student.class}${student.section}, ${(ahead.totalEarnedPoints - me.totalEarnedPoints).toLocaleString('en-IN')} behind ${ahead.name}`
            : `You lead Class ${student.class}${student.section}`}
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">Latest badge: <BadgePill badgeId={latestBadge} /></span>
        <span className="ml-auto hidden gap-3 sm:flex">
          <Link to="/leaderboard" className="font-medium text-foreground hover:underline">Leaderboard</Link>
          <Link to="/avatars" className="font-medium text-foreground hover:underline">Avatar store</Link>
        </span>
      </div>

      {/* The card takes 70%; the avatar the other 30%, stretched to the card's height. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <RemediationHero totals={totals} next={next} hasRecords={hasRecords} />
        <div className="h-[320px] lg:h-auto">
          <DashboardCompanion />
        </div>
      </div>

      <section>
        <SectionHeading title="Practice tools" sub={focus ? `Get ready for ${focus.chapter.title} before you retry it` : 'Revise and practise any chapter'} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SupportCard
            icon={BookOpen}
            name="Preparation"
            line={focus ? `Revise ${focus.chapter.title}` : 'Learn chapter-wise'}
            to={revisionTo}
            allTo="/preparation"
            testId="module-preparation"
          />
          <SupportCard
            icon={Layers}
            name="Flashcards"
            line={focus ? `Practise ${focus.chapter.title} with a quiz` : me ? `Practise & compete · you're #${me.rank}` : 'Practise & compete'}
            to={focus ? `/flashcards/${focus.subjectId}/${focus.chapter.id}` : '/flashcards'}
            allTo="/flashcards"
            testId="module-flashcards"
          />
        </div>
      </section>

      <section>
        <SectionHeading
          title="Your plan for today"
          aside={<Button asChild variant="outline"><Link to="/timetable"><CalendarDays className="size-4" />Open timetable</Link></Button>}
        />
        {todaySessions.length === 0 ? (
          <p className="rounded-lg border border-border bg-background px-4 py-6 text-[14px] leading-5 text-muted-foreground">
            No study sessions today. Open your timetable to plan one.
          </p>
        ) : (
          <ul className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-background" data-testid="today-plan">
            {todaySessions.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-4 py-3">
                <span className="w-[150px] shrink-0 text-[14px] leading-5 text-muted-foreground tabular-nums">{formatTime(e.startTime)} – {formatTime(e.endTime)}</span>
                <span className="min-w-0 flex-1 truncate text-[16px] leading-6 font-medium text-foreground">{subjectById(e.subjectId)?.name} – {chapterById(e.chapterId)?.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unfinished.length > 0 && (
        <section>
          <SectionHeading title="Unfinished quizzes" />
          <ul className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-background">
            {unfinished.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] leading-6 font-medium text-foreground">{chapterById(a.chapterId)?.title}</p>
                  <p className="text-[14px] leading-5 text-muted-foreground">Quiz, {a.answers.length} of {a.questionIds.length} answered. Rewards are added when you finish.</p>
                </div>
                <Button asChild variant="outline" size="sm"><Link to={`/flashcards/quiz/${a.id}`}>Resume quiz<ChevronRight className="size-3.5" /></Link></Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
