import { BookOpen, Check, CircleCheck, ListChecks, PenLine, PlayCircle, Repeat, X } from 'lucide-react';
import { useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseDateKey, toDateKey } from '../lib/dates';
import { MIN_WRITTEN } from './FixAnswer';
import { clock } from './VideoPreviewCard';
import { videoForChapter } from '../services/questionService';
import { formulaItems, mistakeFixFor, routeOf, schemeSummary } from '../services/mistakeFixService';
import { useAppState } from '../services/store';
import type { MistakeFix, SchemeStep, SlipDrill, StudentError } from '../types';

const marks = (n: number) => `${n} ${n === 1 ? 'mark' : 'marks'}`;

export const shortDate = (key: string) => parseDateKey(key).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

function Panel({ icon: Icon, title, why, route, children }: { icon: ComponentType<{ className?: string }>; title: string; why: string; route: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--inferentics-brand-primary)]/25 bg-good-tint/60 p-4" data-testid="fix-plan" data-route={route}>
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--inferentics-brand-primary)] text-white"><Icon className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-[12px] leading-4 font-semibold tracking-[0.04em] text-good-strong uppercase">How to fix this kind of mistake</p>
          <h3 className="text-[16px] leading-6 font-semibold text-foreground">{title}</h3>
          <p className="text-[14px] leading-5 text-muted-foreground">{why}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Relearn({ error, fix }: { error: StudentError; fix: MistakeFix }) {
  const time = fix.concept?.videoTime ?? null;
  const video = videoForChapter(error.chapterId);
  const moment = time !== null ? video?.timeline?.find((c) => c.time === time) : undefined;
  const ids = fix.concept?.snippetIds ?? [];
  const base = `/preparation/${error.subjectId}/${error.chapterId}`;
  return (
    <Panel icon={BookOpen} route="relearn" title="Re-learn the concept" why="This was a concept mix-up, so more practice questions won't fix it on their own. Go back to the idea first.">
      <div className="flex flex-wrap gap-2">
        {moment && (
          <Button asChild variant="outline" className="bg-background">
            <Link to={`${base}?t=${moment.time}`} data-testid="relearn-video"><PlayCircle className="size-4" />Watch from {clock(moment.time)} · {moment.label}</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="bg-background">
          <Link to={`${base}/revision${ids.length ? `?cards=${ids.join(',')}` : ''}`} data-testid="relearn-cards">
            <BookOpen className="size-4" />{ids.length ? `Revise ${ids.length} matching ${ids.length === 1 ? 'card' : 'cards'}` : 'Revise the chapter cards'}
          </Link>
        </Button>
      </div>
    </Panel>
  );
}

function FormulaPlan({ fix }: { fix: MistakeFix }) {
  const state = useAppState((s) => s);
  const today = toDateKey(new Date());
  const items = formulaItems(state, today).filter((i) => fix.formulaCards?.some((c) => c.id === i.card.id));
  const due = items.filter((i) => i.due <= today).length;
  return (
    <Panel icon={Repeat} route="formula" title="Make the formula stick" why="You knew the method but recalled the formula wrong. Short reviews spread over days fix recall better than one long session.">
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => (
          <li key={i.card.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-[14px] leading-5">
            <span className="text-foreground">{i.card.front}</span>
            <span className={cn('text-[12px] leading-4 font-medium', i.due <= today ? 'text-warn' : 'text-muted-foreground')}>
              {i.due <= today ? 'Due today' : `Next review ${shortDate(i.due)}`}
            </span>
          </li>
        ))}
      </ul>
      <Button asChild className="self-start bg-[var(--inferentics-brand-primary)] text-white hover:bg-[var(--inferentics-brand-primary-hover)]">
        <Link to="/remediation/formulas" data-testid="review-formulas">{due > 0 ? `Review formulas (${due} due)` : 'Open formula cards'}</Link>
      </Button>
    </Panel>
  );
}

function Drill({ drill }: { drill: SlipDrill }) {
  const [said, setSaid] = useState<boolean | null>(null);
  const right = said !== null && said === drill.correct;
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3" data-testid="slip-drill">
      <p className="font-mono text-[13px] leading-5 text-foreground">{drill.working}</p>
      {said === null ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setSaid(true)}>Looks right</Button>
          <Button size="sm" variant="outline" onClick={() => setSaid(false)}>Has a slip</Button>
        </div>
      ) : (
        <p className={cn('flex items-start gap-1.5 text-[13px] leading-5', right ? 'text-good' : 'text-bad')} data-testid="drill-verdict">
          {right ? <Check className="mt-0.5 size-4 shrink-0" /> : <X className="mt-0.5 size-4 shrink-0" />}
          <span><strong>{right ? 'Spotted.' : 'Not quite.'}</strong> {drill.explanation}</span>
        </p>
      )}
    </li>
  );
}

function SlipPlan({ fix, errorType }: { fix: MistakeFix; errorType: string }) {
  const slip = errorType === 'Unit error' ? 'unit slip' : errorType === 'Sign error' ? 'sign slip' : 'small slip';
  return (
    <Panel icon={ListChecks} route="slip" title="Build a checking habit" why={`You understood the question but made a ${slip}. Run this check before every answer like it; it appears in your fix check too.`}>
      <ol className="flex flex-col gap-1.5 rounded-lg bg-background p-3" data-testid="slip-checklist">
        {(fix.checklist ?? []).map((c, i) => (
          <li key={c} className="flex items-start gap-2 text-[14px] leading-5 text-foreground">
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
            {c}
          </li>
        ))}
      </ol>
      <div>
        <h4 className="mb-2 text-[14px] leading-5 font-semibold text-foreground">Spot the slip</h4>
        <ul className="flex flex-col gap-2">{(fix.drills ?? []).map((d) => <Drill key={d.id} drill={d} />)}</ul>
      </div>
    </Panel>
  );
}

function SchemeTable({ steps, ticked, onTick }: { steps: SchemeStep[]; ticked?: number[]; onTick?: (i: number) => void }) {
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
      {steps.map((s, i) => (
        <li key={s.step} className="flex items-start gap-3 px-3 py-2 text-[14px] leading-5">
          {onTick ? (
            <input type="checkbox" checked={ticked?.includes(i) ?? false} onChange={() => onTick(i)} className="mt-0.5 size-4 shrink-0 accent-[var(--inferentics-brand-primary)]" aria-label={s.step} data-testid="scheme-tick" />
          ) : s.inExam ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-good" aria-label="In your exam answer" />
          ) : (
            <X className="mt-0.5 size-4 shrink-0 text-bad" aria-label="Missing from your exam answer" />
          )}
          <span className="min-w-0 flex-1 text-foreground">{s.step}</span>
          <span className="shrink-0 text-[12px] leading-5 font-semibold text-muted-foreground tabular-nums">{marks(s.marks)}</span>
        </li>
      ))}
    </ul>
  );
}

function SchemePlan({ fix }: { fix: MistakeFix }) {
  const { steps, total, missing, missingMarks } = schemeSummary(fix);
  const [text, setText] = useState('');
  const [ticked, setTicked] = useState<number[] | null>(null);
  const earned = ticked ? steps.reduce((sum, s, i) => sum + (ticked.includes(i) ? s.marks : 0), 0) : 0;
  return (
    <Panel icon={PenLine} route="scheme" title="Write for full marks" why="Your answer was on the right track but left out steps that examiners give marks for.">
      <p className="text-[14px] leading-5 font-medium text-foreground" data-testid="scheme-summary">
        The {missing.length === 1 ? 'step' : 'steps'} you missed carry {marks(missingMarks)} of the {total}: {missing.map((m) => m.step.split(':')[0].toLowerCase()).join('; ')}.
      </p>
      <SchemeTable steps={steps} />
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
        <label htmlFor={`practice-${fix.errorId}`} className="text-[14px] leading-5 font-semibold text-foreground">Practise writing it again, step by step</label>
        <textarea
          id={`practice-${fix.errorId}`}
          rows={3}
          value={text}
          disabled={ticked !== null}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] leading-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Cover every step in the scheme above, in order."
          data-testid="scheme-practice"
        />
        {ticked === null ? (
          <Button size="sm" variant="outline" className="self-start" disabled={text.trim().length < MIN_WRITTEN} onClick={() => setTicked([])} data-testid="scheme-mark">
            Mark it against the scheme
          </Button>
        ) : (
          <>
            <SchemeTable steps={steps} ticked={ticked} onTick={(i) => setTicked(ticked.includes(i) ? ticked.filter((x) => x !== i) : [...ticked, i])} />
            <p className="text-[14px] leading-5 font-semibold text-foreground tabular-nums" data-testid="scheme-score">
              {earned} / {total} marks {earned === total ? '· full marks' : ''}
            </p>
          </>
        )}
      </div>
    </Panel>
  );
}

/** The fix that matches how the marks were lost. Shown once the mistake's answer is revealed. */
export function MistakeFixPlan({ error }: { error: StudentError }) {
  const fix = mistakeFixFor(error.id);
  if (!fix) return null;
  const route = routeOf(error.errorType);
  if (route === 'relearn' && fix.concept) return <Relearn error={error} fix={fix} />;
  if (route === 'formula' && fix.formulaCards) return <FormulaPlan fix={fix} />;
  if (route === 'slip' && fix.checklist) return <SlipPlan fix={fix} errorType={error.errorType} />;
  if (route === 'scheme' && fix.scheme) return <SchemePlan fix={fix} />;
  return null;
}
