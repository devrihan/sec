import { ArrowRight, CheckCircle2, Route, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HERO_CTA } from './page-parts';
import { ProgressBar } from './ProgressBar';
import type { nextFix, remediationTotals } from '../services/remediationService';

const marksText = (n: number) => `${n} ${n === 1 ? 'mark' : 'marks'}`;
const SHELL = 'rounded-2xl border border-good-edge bg-good-tint p-5 sm:p-8';
const EYEBROW = 'flex items-center gap-1.5 text-[12px] leading-4 font-semibold tracking-[0.06em] text-good-strong uppercase';

/** The dashboard's lead block: remediation is the main job, so it gets the page's only hero. */
export function RemediationHero({
  totals,
  next,
  hasRecords,
}: {
  totals: ReturnType<typeof remediationTotals>;
  next: ReturnType<typeof nextFix>;
  hasRecords: boolean;
}) {
  if (!hasRecords) {
    return (
      <section className={SHELL} data-testid="module-remediation">
        <p className={EYEBROW}><Route className="size-4" aria-hidden="true" />Remediation</p>
        <h2 className="mt-2 text-[28px] leading-9 font-bold tracking-[-0.2px] text-foreground">No exam mistakes on record yet</h2>
        <p className="mt-1 max-w-[560px] text-[16px] leading-6 text-muted-foreground">
          Once your exam answers are marked, your weak chapters show up here as a roadmap to win those marks back. Until then, get ahead in Preparation.
        </p>
        <Button asChild className={cn(HERO_CTA, 'mt-5')}><Link to="/preparation">Go to Preparation<ArrowRight className="size-4" /></Link></Button>
      </section>
    );
  }

  if (!next) {
    return (
      <section className={SHELL} data-testid="module-remediation">
        <p className={EYEBROW}><CheckCircle2 className="size-4" aria-hidden="true" />Remediation complete</p>
        <h2 className="mt-2 text-[28px] leading-9 font-bold tracking-[-0.2px] text-foreground" data-testid="hero-marks">
          All {marksText(totals.marksTotal)} won back 🎉
        </h2>
        <p className="mt-1 text-[16px] leading-6 text-muted-foreground">Every chapter on your roadmaps is fixed. Keep it that way with revision and quizzes.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className={HERO_CTA}><Link to="/preparation">Keep revising</Link></Button>
          <Button asChild variant="outline"><Link to="/remediation">See your roadmaps</Link></Button>
        </div>
      </section>
    );
  }

  const chapterLink = `/remediation/${next.exam.id}/${next.subject.id}/${next.node.chapter.id}`;
  const list = [...totals.roadmaps].sort((a, b) => b.roadmap.marksLeft - a.roadmap.marksLeft).slice(0, 4);

  return (
    <section className={`${SHELL} @container`} data-testid="module-remediation" aria-labelledby="hero-title">
      <div className="grid gap-8 @min-[35rem]:grid-cols-[minmax(0,1fr)_minmax(0,300px)] @5xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <p className={EYEBROW}><Target className="size-4" aria-hidden="true" />Win back your marks</p>
            <h2 id="hero-title" className="mt-2 flex flex-wrap items-baseline gap-x-3 text-foreground">
              <span className="text-[48px] leading-[52px] font-bold tracking-[-0.5px] text-good-strong tabular-nums" data-testid="hero-marks">{totals.marksLeft}</span>
              <span className="text-[20px] leading-7 font-semibold">{totals.marksLeft === 1 ? 'mark' : 'marks'} still to fix</span>
            </h2>
            <div className="mt-3 max-w-[480px] space-y-1.5">
              <ProgressBar value={totals.marksPercent} label="Marks won back across all exams" />
              <p className="text-[14px] leading-5 text-muted-foreground tabular-nums">
                {totals.marksPercent}% won back · {totals.chaptersLeft} {totals.chaptersLeft === 1 ? 'chapter' : 'chapters'} left to fix
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 @5xl:flex-row @5xl:items-center" data-testid="hero-next">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-4 font-medium tracking-[-0.072px] text-muted-foreground">Next up</p>
              <p className="truncate text-[18px] leading-7 font-semibold tracking-[-0.108px] text-foreground">{next.node.chapter.title}</p>
              <p className="text-[14px] leading-5 text-muted-foreground">
                {next.subject.name} · {next.exam.name} · {next.node.errorCount} {next.node.errorCount === 1 ? 'mistake' : 'mistakes'} · up to {marksText(next.node.marks)}
              </p>
            </div>
            <Button asChild size="lg" className={cn(HERO_CTA, 'shrink-0')}>
              <Link to={chapterLink} data-testid="hero-continue">Continue fixing<ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[16px] leading-6 font-semibold text-foreground">Your roadmaps</h3>
            <Link to="/remediation" className="text-[14px] leading-5 font-medium text-good-strong hover:underline">View all</Link>
          </div>
          <ul className="flex flex-col gap-2">
            {list.map(({ exam, subject, roadmap }) => (
              <li key={`${exam.id}-${subject.id}`}>
                <Link
                  to={`/remediation/${exam.id}/${subject.id}`}
                  className="block space-y-1.5 rounded-lg border border-border bg-background px-3 py-2.5 transition-shadow hover:shadow-sm"
                  data-testid="hero-roadmap"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] leading-5 font-medium text-foreground">{subject.name} · {exam.name}</span>
                    <span className="shrink-0 text-[12px] leading-4 text-muted-foreground tabular-nums">
                      {roadmap.isComplete ? 'Done' : `${roadmap.marksLeft} left`}
                    </span>
                  </span>
                  <ProgressBar value={roadmap.marksPercent} label={`${subject.name} ${exam.name} progress`} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
