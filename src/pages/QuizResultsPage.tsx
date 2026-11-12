import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HERO_CTA, NotFoundState, SectionHeading } from '../components/page-parts';
import { SectionAverageCard, type SectionAverageVariant } from '../components/section-average-card';
import { questionById } from '../services/catalog';
import { accuracyPercent, attemptById, marksOf } from '../services/quizService';
import { roadmapSpotForChapter } from '../services/remediationService';
import { useAppState } from '../services/store';
import { cn } from '@/lib/utils';

/** Loam's summary-card thresholds: good at 60+, warning at 40–59, danger below 40. */
const variantFor = (pct: number): SectionAverageVariant => (pct >= 60 ? 'good' : pct >= 40 ? 'warning' : 'danger');

export function ReviewList({ rows }: { rows: { id: string; text: string; right: boolean; detail: string }[] }) {
  return (
    <ol className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-background">
      {rows.map((r) => (
        <li key={r.id} className="flex gap-3 px-4 py-3">
          <span aria-hidden="true" className={cn('mt-2 size-2 shrink-0 rounded-full', r.right ? 'bg-[#008a2e]' : 'bg-[#e60000]')} />
          <div className="min-w-0">
            <p className="text-[16px] leading-6 text-foreground">{r.text}</p>
            <p className="text-[14px] leading-5 text-muted-foreground">{r.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function QuizResultsPage() {
  const { attemptId = '' } = useParams();
  const attempt = useAppState((s) => attemptById(s, attemptId));
  const reward = useAppState((s) => s.transactions.find((t) => t.dedupeKey === `quiz:${attemptId}`));
  const state = useAppState((s) => s);
  const spot = useMemo(() => (attempt ? roadmapSpotForChapter(state, attempt.chapterId) : undefined), [state, attempt]);
  if (!attempt || !attempt.completedAt) {
    return <NotFoundState message="Results appear after every question is answered." />;
  }
  const total = attempt.questionIds.length;
  const marks = marksOf(attempt);
  const accuracy = accuracyPercent(attempt);

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row" data-testid="quiz-result">
        <SectionAverageCard label="Accuracy" value={accuracy} variant={variantFor(accuracy)} className="shrink-0 lg:w-[285px]" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 rounded-xl border border-border bg-card px-6 py-4">
          <div>
            <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.132px] text-foreground">Quiz completed</h1>
            <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground tabular-nums">Score: {attempt.score} / {total}</p>
            <p className="text-[16px] leading-6 text-muted-foreground tabular-nums">
              Accuracy: {accuracy}%. Marks: {marks.earned} of {marks.total}.
              {reward && ` +${reward.coinAmount} coins and +${reward.pointsAmount} leaderboard points.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/leaderboard">View leaderboard</Link></Button>
            <Button asChild className={HERO_CTA}><Link to="/flashcards">Back to Flashcards</Link></Button>
          </div>
        </div>
      </section>
      {spot && (
        <section className="flex flex-col gap-3 rounded-xl border border-good-edge bg-good-tint px-5 py-4 sm:flex-row sm:items-center" data-testid="retake-remediation">
          <div className="min-w-0 flex-1">
            <p className="text-[16px] leading-6 font-semibold text-foreground">
              {spot.node.state === 'current' ? 'Ready? Retake the remediation check' : 'This chapter is on your roadmap'}
            </p>
            <p className="text-[14px] leading-5 text-muted-foreground">
              {spot.node.state === 'current'
                ? `Pass it to win back up to ${spot.node.marks} ${spot.node.marks === 1 ? 'mark' : 'marks'} in ${spot.subject.name}, ${spot.exam.name}.`
                : `It unlocks after the earlier chapters on your ${spot.subject.name} ${spot.exam.name} roadmap.`}
            </p>
          </div>
          <Button asChild className={HERO_CTA}>
            <Link to={spot.node.state === 'current' ? `/remediation/${spot.exam.id}/${spot.subject.id}/${spot.node.chapter.id}` : `/remediation/${spot.exam.id}/${spot.subject.id}`}>
              {spot.node.state === 'current' ? 'Go to remediation' : 'Open roadmap'}
            </Link>
          </Button>
        </section>
      )}
      <section>
        <SectionHeading title="Review your answers" />
        <ReviewList
          rows={attempt.answers.flatMap((a) => {
            const q = questionById(a.questionId);
            if (!q) return [];
            const text = (id: string) => q.options.find((o) => o.id === id)?.text;
            return [{
              id: a.questionId,
              text: q.questionText,
              right: a.correct,
              detail: a.correct ? 'Correct' : `Your answer: ${text(a.selectedOptionId)}. Correct answer: ${text(q.correctOptionId)}`,
            }];
          })}
        />
      </section>
    </>
  );
}
