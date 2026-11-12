import { CalendarClock, Eye, PartyPopper, RotateCcw, ThumbsUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { shortDate } from '../components/MistakeFixPlan';
import { BackLink, flashcardTone, PageTitle, SectionHeading } from '../components/page-parts';
import { toDateKey } from '../lib/dates';
import { chapterById } from '../services/catalog';
import { dueFormulaItems, formulaItems, INTERVALS, nextFormulaDate, reviewFormula } from '../services/mistakeFixService';
import { useAppState } from '../services/store';

/** Spaced repetition for formulas the student mis-recalled in an exam. */
export function FormulaReviewPage() {
  const state = useAppState((s) => s);
  const today = toDateKey(new Date());
  const all = useMemo(() => formulaItems(state, today), [state, today]);
  // The session queue is fixed when the page opens; forgotten cards go to the back of it.
  const [queue, setQueue] = useState(() => dueFormulaItems(state, today).map((i) => i.card.id));
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);

  const current = all.find((i) => i.card.id === queue[0]);
  const next = nextFormulaDate(state, today);

  const answer = (remembered: boolean) => {
    if (!current) return;
    reviewFormula(current.card.id, remembered, today);
    setShown(false);
    setQueue((q) => (remembered ? q.slice(1) : [...q.slice(1), q[0]]));
    if (remembered) setDone((d) => d + 1);
  };

  return (
    <>
      <BackLink to="/remediation">Remediation</BackLink>
      <PageTitle title="Formula cards" sub="Formulas you mis-recalled in an exam, brought back just before you'd forget them" />

      {all.length === 0 ? (
        <EmptyState variant="page" title="No formula mistakes on record" description="Formula cards appear here when an exam mistake was a formula you recalled wrongly." />
      ) : current ? (
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
          <p className="text-center text-[14px] leading-5 text-muted-foreground tabular-nums" data-testid="formula-progress">
            {queue.length} {queue.length === 1 ? 'card' : 'cards'} left today{done > 0 ? ` · ${done} done` : ''}
          </p>
          <article className={cn('flex min-h-[260px] flex-col gap-4 rounded-2xl border bg-card p-6 shadow-md sm:p-8', flashcardTone(all.indexOf(current)))} data-testid="formula-card">
            <p className="text-[12px] leading-4 font-semibold tracking-[0.04em] text-muted-foreground uppercase">{chapterById(current.error.chapterId)?.title}</p>
            <h2 className="text-[22px] leading-8 font-semibold text-foreground">{current.card.front}</h2>
            {shown ? (
              <p className="rounded-lg border border-black/10 bg-background/80 px-4 py-3 font-mono text-[17px] leading-7 text-foreground dark:border-white/10" data-testid="formula-back">{current.card.back}</p>
            ) : (
              <p className="text-[14px] leading-5 text-muted-foreground">Say or write it from memory first, then check.</p>
            )}
          </article>
          {shown ? (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" variant="outline" onClick={() => answer(false)} data-testid="formula-forgot"><RotateCcw className="size-4" />Forgot</Button>
              <Button size="lg" className="bg-[var(--inferentics-brand-primary)] text-white hover:bg-[var(--inferentics-brand-primary-hover)]" onClick={() => answer(true)} data-testid="formula-remembered">
                <ThumbsUp className="size-4" />Got it
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={() => setShown(true)} data-testid="formula-show"><Eye className="size-4" />Show the formula</Button>
          )}
          <p className="text-center text-[12px] leading-4 text-muted-foreground">
            "Got it" brings the card back after {INTERVALS.slice(0, 4).join(', ')} and then {INTERVALS[4]} days. "Forgot" keeps it in today's set.
          </p>
        </div>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-good-edge bg-good-tint px-6 py-10 text-center" data-testid="formulas-done">
          <PartyPopper className="size-10 text-good-strong" aria-hidden="true" />
          <h2 className="text-[22px] leading-8 font-bold text-foreground">{done > 0 ? 'All due formulas reviewed' : 'Nothing due today'}</h2>
          {next && <p className="text-[15px] leading-6 text-muted-foreground">Next review: {shortDate(next)}</p>}
          <Button asChild variant="outline"><Link to="/remediation">Back to remediation</Link></Button>
        </section>
      )}

      {all.length > 0 && (
        <section>
          <SectionHeading title="All your formula cards" />
          <ul className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-background">
            {all.map((i) => (
              <li key={i.card.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-testid="formula-row">
                <span className="min-w-0 flex-1 text-[14px] leading-5 text-foreground">{i.card.front}</span>
                <span className="flex items-center gap-1.5 text-[12px] leading-4 text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {i.due <= today ? 'Due today' : `Next ${shortDate(i.due)}`}
                  {i.review ? ` · box ${i.review.box}` : ' · new'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
