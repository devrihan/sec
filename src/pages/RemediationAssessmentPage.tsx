import { Check, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { studentMistake } from '@/lib/student-mistakes';
import { cn } from '@/lib/utils';
import { BackLink, HERO_CTA, NotFoundState, SectionHeading, WHITE_PANEL } from '../components/page-parts';
import { BadgeUnlock } from '../components/BadgeMedal';
import { NumericAnswer, WrittenAnswer } from '../components/FixAnswer';
import { OptionList } from '../components/QuestionCard';
import { SectionAverageCard } from '../components/section-average-card';
import { chapterById, descriptiveById, questionById, studentErrors } from '../services/catalog';
import { FIXED_AT, isAnswered, twinById } from '../services/fixCheckService';
import { checklistFor } from '../services/mistakeFixService';
import {
  answeredCount,
  attemptById,
  mistakeResults,
  openAttempt,
  setAssessmentAnswer,
  setTwinResponse,
  startAssessment,
  submitAssessment,
  type SubmitResult,
} from '../services/remediationService';
import { useAppState } from '../services/store';
import type { FixResponse, RemediationAttempt } from '../types';
import { ReviewList } from './QuizResultsPage';

export function RemediationAssessmentPage() {
  const { examId = '', subjectId = '', chapterId = '' } = useParams();
  const navigate = useNavigate();
  const open = useAppState((s) => openAttempt(s, examId, chapterId));
  const [result, setResult] = useState<SubmitResult | null>(null);
  const finished = useAppState((s) => (result ? attemptById(s, result.attempt.id) : undefined));
  const chapter = chapterById(chapterId);
  const road = `/remediation/${examId}/${subjectId}`;

  if (!chapter) return <NotFoundState message="This chapter doesn't exist." />;

  if (result && finished) {
    return (
      <ResultView
        attempt={finished}
        result={result}
        road={road}
        chapterPath={`${road}/${chapterId}`}
        onRetry={() => {
          const outcome = startAssessment(examId, subjectId, chapterId);
          if (outcome.ok) setResult(null);
          else navigate(road);
        }}
      />
    );
  }

  // Nothing in progress, e.g. a refresh after submitting: the chapter page shows the state.
  if (!open) return <Navigate to={`${road}/${chapterId}`} replace />;

  return <Runner key={open.id} attempt={open} back={`${road}/${chapterId}`} title={chapter.title} onSubmit={setResult} />;
}

type Item =
  | { kind: 'twin'; twinId: string; errorId: string }
  | { kind: 'mcq'; questionId: string; optionIds: string[] };

/** Twins first, grouped by mistake, then the MCQ top-up. */
const itemsOf = (attempt: RemediationAttempt): Item[] => [
  ...(attempt.twins ?? []).map((t) => ({ kind: 'twin' as const, ...t })),
  ...attempt.questions.map((q) => ({ kind: 'mcq' as const, ...q })),
];

const mistakeNumber = (attempt: RemediationAttempt, errorId: string) =>
  [...new Set((attempt.twins ?? []).map((t) => t.errorId))].indexOf(errorId) + 1;

function TwinItem({ attempt, twinId, errorId }: { attempt: RemediationAttempt; twinId: string; errorId: string }) {
  const found = twinById(twinId);
  const error = studentErrors.find((e) => e.id === errorId);
  if (!found || !error) return <NotFoundState message="This question is missing." />;
  const { twin } = found;
  const response = attempt.responses?.[twinId];
  // Keep the checklist ticks when the answer itself changes, and the answer when a tick changes.
  const save = (r: FixResponse) => setTwinResponse(attempt.id, twinId, { ...response, ...r });
  const checklist = checklistFor(errorId);
  const checked = response?.checked ?? [];
  return (
    <section className={`${WHITE_PANEL} flex flex-col gap-4`} data-testid="twin-item" data-kind={twin.kind}>
      <p className="flex flex-wrap items-center gap-2 text-[13px] leading-5 text-muted-foreground">
        <Badge variant="outline">Mistake {mistakeNumber(attempt, errorId)}</Badge>
        Same concept as the question you got wrong · {studentMistake(error.errorType).label}
      </p>
      <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground" data-testid="question-text">{twin.questionText}</p>
      {twin.kind === 'numeric' ? (
        <NumericAnswer key={twinId} parts={twin.parts} response={response} onChange={save} />
      ) : (
        <WrittenAnswer key={twinId} keyPoints={twin.keyPoints} response={response} onChange={save} />
      )}
      {checklist.length > 0 && (
        <fieldset className="rounded-lg border border-warn/30 bg-warn-soft p-3" data-testid="submit-checklist">
          <legend className="px-1 text-[13px] leading-5 font-semibold text-warn">Before you move on: you slipped on this kind of question before</legend>
          <ul className="flex flex-col gap-1.5">
            {checklist.map((c, i) => (
              <li key={c}>
                <label className="flex cursor-pointer items-start gap-2.5 text-[14px] leading-5 text-foreground">
                  <input
                    type="checkbox"
                    checked={checked.includes(i)}
                    onChange={() => save({ checked: checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i] })}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--inferentics-brand-primary)]"
                  />
                  {c}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </section>
  );
}

function Runner({ attempt, back, title, onSubmit }: { attempt: RemediationAttempt; back: string; title: string; onSubmit: (r: SubmitResult) => void }) {
  const [index, setIndex] = useState(0);
  const items = itemsOf(attempt);
  const item = items[index];
  const answered = answeredCount(attempt);
  const isLast = index === items.length - 1;
  const hasTwins = (attempt.twins?.length ?? 0) > 0;

  let body: ReactNode;
  let done: boolean;
  if (item.kind === 'twin') {
    const found = twinById(item.twinId);
    done = Boolean(found && isAnswered(found.twin, attempt.responses?.[item.twinId]));
    body = <TwinItem attempt={attempt} twinId={item.twinId} errorId={item.errorId} />;
  } else {
    const question = questionById(item.questionId);
    if (!question) return <NotFoundState message="This question is missing from the question bank." />;
    const options = item.optionIds
      .map((id) => question.options.find((o) => o.id === id))
      .filter((o): o is NonNullable<typeof o> => o !== undefined);
    done = Boolean(attempt.answers[question.id]);
    body = (
      <section className={`${WHITE_PANEL} assessment`}>
        {hasTwins && <Badge variant="outline" className="mb-3">Quick MCQ</Badge>}
        <p className="mb-4 text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground" data-testid="question-text">{question.questionText}</p>
        <OptionList
          question={question}
          options={options}
          selectedId={attempt.answers[question.id] ?? null}
          onSelect={(id) => setAssessmentAnswer(attempt.id, question.id, id)}
          name={`a-${attempt.id}-${question.id}`}
        />
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      <BackLink to={back}>{title}</BackLink>
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.132px] text-foreground">{title} fix check</h1>
        <p className="text-[16px] leading-6 text-muted-foreground">
          {hasTwins ? 'Score at least 75% and get at least one question right for every mistake' : 'Score at least 75% to unlock the next chapter'}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground tabular-nums" data-testid="assessment-progress">
          Assessment question {index + 1} of {attempt.total}
        </span>
        <Badge variant="secondary">{answered} answered</Badge>
      </div>
      {body}
      <div className="flex justify-between">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
        {isLast ? (
          <Button
            data-testid="submit-assessment"
            disabled={answered < attempt.total}
            onClick={() => {
              const r = submitAssessment(attempt.id);
              if (r) onSubmit(r);
            }}
          >
            Submit fix check
          </Button>
        ) : (
          <Button disabled={!done} onClick={() => setIndex(index + 1)}>Next</Button>
        )}
      </div>
    </div>
  );
}

function MistakeReport({ attempt }: { attempt: RemediationAttempt }) {
  const results = mistakeResults(attempt);
  if (results.length === 0) return null;
  return (
    <section>
      <SectionHeading title="Your mistakes" sub="Each one needs at least one of its questions right to count as fixed" />
      <ol className="flex flex-col gap-4">
        {results.map((m, i) => {
          const error = studentErrors.find((e) => e.id === m.errorId);
          const original = error && (descriptiveById(error.questionId)?.questionText ?? questionById(error.questionId)?.questionText);
          return (
            <li
              key={m.errorId}
              className={cn('flex flex-col gap-3 rounded-xl border p-4', m.fixed ? 'border-good-edge bg-good-soft' : 'border-bad/30 bg-bad-soft')}
              data-testid="mistake-result"
              data-fixed={m.fixed}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[14px] leading-5 text-muted-foreground">
                  <span className="font-semibold text-foreground">Mistake {i + 1}</span>
                  {error && ` · ${studentMistake(error.errorType).label}`}
                  <span className="mt-0.5 block text-foreground">{original}</span>
                </p>
                <span className={cn('rounded-full px-2.5 py-1 text-[12px] leading-4 font-semibold text-white', m.fixed ? 'bg-good' : 'bg-bad')}>
                  {m.fixed ? 'Fixed' : 'Still repeating'}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {m.twins.map((t) => {
                  const found = twinById(t.twinId);
                  if (!found) return null;
                  const { twin } = found;
                  const response = attempt.responses?.[t.twinId];
                  const right = t.score >= FIXED_AT;
                  return (
                    <li key={t.twinId} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                      <p className="flex items-start gap-2 text-[14px] leading-5 text-foreground">
                        {right
                          ? <Check className="mt-0.5 size-4 shrink-0 text-good" aria-label="Right" />
                          : <X className="mt-0.5 size-4 shrink-0 text-bad" aria-label="Not right" />}
                        {twin.questionText}
                      </p>
                      {twin.kind === 'numeric' ? (
                        <NumericAnswer parts={twin.parts} response={response} locked showResult />
                      ) : (
                        <p className="text-[13px] leading-5 text-muted-foreground">You ticked {response?.ticked?.length ?? 0} of {twin.keyPoints.length} marking points.</p>
                      )}
                      <p className="text-[13px] leading-5 text-muted-foreground"><span className="font-medium text-foreground">Solution: </span>{twin.solution}</p>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ResultView({ attempt, result, road, chapterPath, onRetry }: { attempt: RemediationAttempt; result: SubmitResult; road: string; chapterPath: string; onRetry: () => void }) {
  // The pass mark is 75%, so 60% must not read as green here, unlike Loam's summary-card scale.
  const variant = attempt.passed ? 'good' : attempt.percent >= 40 ? 'warning' : 'danger';
  const repeating = mistakeResults(attempt).filter((m) => !m.fixed).length;
  const hasTwins = (attempt.twins?.length ?? 0) > 0;
  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row" data-testid={attempt.passed ? 'assessment-passed' : 'assessment-failed'}>
        <SectionAverageCard label="Your score" value={attempt.percent} variant={variant} className="shrink-0 lg:w-[285px]" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 rounded-xl border border-border bg-card px-6 py-4">
          <div>
            <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.132px] text-foreground">{attempt.passed ? 'Chapter fixed' : 'Not passed yet'}</h1>
            <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground tabular-nums" data-testid="assessment-score">
              Score: {attempt.score} / {attempt.total} = {attempt.percent}%
            </p>
            {attempt.passed ? (
              result.subjectCompleted
                ? <p className="text-[16px] leading-6 text-muted-foreground">You finished every chapter on this roadmap.</p>
                : <p className="text-[16px] leading-6 text-muted-foreground" data-testid="next-unlocked">Next chapter unlocked: {result.nextChapterTitle}</p>
            ) : repeating > 0 && attempt.percent >= 75 ? (
              <p className="text-[16px] leading-6 text-muted-foreground" data-testid="still-repeating">
                Good score, but {repeating === 1 ? 'one mistake is' : `${repeating} mistakes are`} still repeating. Review {repeating === 1 ? 'it' : 'them'} below and try again. You'll get different questions.
              </p>
            ) : (
              <p className="text-[16px] leading-6 text-muted-foreground">
                You need at least 75%{hasTwins ? ' and one right answer for every mistake' : ''}. Review and try again. New questions are picked on every attempt.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {attempt.passed ? (
              <Button asChild className={HERO_CTA}><Link to={road} data-testid="continue-roadmap">Continue roadmap</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline"><Link to={chapterPath}>Review mistakes</Link></Button>
                <Button className={HERO_CTA} data-testid="retry-assessment" onClick={onRetry}>Retry fix check</Button>
              </>
            )}
          </div>
        </div>
      </section>
      <BadgeUnlock badges={result.newBadges} testId="assessment-badges" />
      <MistakeReport attempt={attempt} />
      {attempt.questionIds.length > 0 && (
        <section>
          <SectionHeading title={hasTwins ? 'Quick MCQs' : 'Review each question'} />
          <ReviewList
            rows={attempt.questionIds.flatMap((id) => {
              const q = questionById(id);
              if (!q) return [];
              const right = attempt.answers[id] === q.correctOptionId;
              const text = (optionId: string) => q.options.find((o) => o.id === optionId)?.text;
              return [{
                id,
                text: q.questionText,
                right,
                detail: `${right ? 'Correct. ' : `Your answer: ${text(attempt.answers[id])}. Correct answer: ${text(q.correctOptionId)}. `}${q.explanation}`,
              }];
            })}
          />
        </section>
      )}
    </>
  );
}
