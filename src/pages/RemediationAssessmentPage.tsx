import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackLink, HERO_CTA, NotFoundState, SectionHeading, WHITE_PANEL } from '../components/page-parts';
import { OptionList } from '../components/QuestionCard';
import { SectionAverageCard } from '../components/section-average-card';
import { chapterById, questionById } from '../services/catalog';
import {
  attemptById,
  openAttempt,
  setAssessmentAnswer,
  startAssessment,
  submitAssessment,
  type SubmitResult,
} from '../services/remediationService';
import { useAppState } from '../services/store';
import type { RemediationAttempt } from '../types';
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

function Runner({ attempt, back, title, onSubmit }: { attempt: RemediationAttempt; back: string; title: string; onSubmit: (r: SubmitResult) => void }) {
  const [index, setIndex] = useState(0);
  const entry = attempt.questions[index];
  const question = questionById(entry.questionId);
  if (!question) return <NotFoundState message="This question is missing from the question bank." />;
  const options = entry.optionIds
    .map((id) => question.options.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => o !== undefined);
  const answered = Object.keys(attempt.answers).length;
  const isLast = index === attempt.total - 1;

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      <BackLink to={back}>{title}</BackLink>
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.132px] text-foreground">{title} assessment</h1>
        <p className="text-[16px] leading-6 text-muted-foreground">Score at least 75% to unlock the next chapter</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground tabular-nums" data-testid="assessment-progress">
          Assessment question {index + 1} of {attempt.total}
        </span>
        <Badge variant="secondary">{answered} answered</Badge>
      </div>
      <section className={`${WHITE_PANEL} assessment`}>
        <p className="mb-4 text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground" data-testid="question-text">{question.questionText}</p>
        <OptionList
          question={question}
          options={options}
          selectedId={attempt.answers[question.id] ?? null}
          onSelect={(id) => setAssessmentAnswer(attempt.id, question.id, id)}
          name={`a-${attempt.id}-${question.id}`}
        />
      </section>
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
            Submit assessment
          </Button>
        ) : (
          <Button disabled={!attempt.answers[question.id]} onClick={() => setIndex(index + 1)}>Next</Button>
        )}
      </div>
    </div>
  );
}

function ResultView({ attempt, result, road, chapterPath, onRetry }: { attempt: RemediationAttempt; result: SubmitResult; road: string; chapterPath: string; onRetry: () => void }) {
  // The pass mark is 75%, so 60% must not read as green here, unlike Loam's summary-card scale.
  const variant = attempt.passed ? 'good' : attempt.percent >= 40 ? 'warning' : 'danger';
  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row" data-testid={attempt.passed ? 'assessment-passed' : 'assessment-failed'}>
        <SectionAverageCard label="Your score" value={attempt.percent} variant={variant} className="shrink-0 lg:w-[285px]" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 rounded-xl border border-border bg-card px-6 py-4">
          <div>
            <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.132px] text-foreground">{attempt.passed ? 'Chapter completed' : 'Not passed yet'}</h1>
            <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground tabular-nums" data-testid="assessment-score">
              Score: {attempt.score} / {attempt.total} = {attempt.percent}%
            </p>
            {attempt.passed ? (
              result.subjectCompleted
                ? <p className="text-[16px] leading-6 text-muted-foreground">You finished every chapter on this roadmap.</p>
                : <p className="text-[16px] leading-6 text-muted-foreground" data-testid="next-unlocked">Next chapter unlocked: {result.nextChapterTitle}</p>
            ) : (
              <p className="text-[16px] leading-6 text-muted-foreground">You need at least 75%. Review and try again. New questions are picked on every attempt.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {attempt.passed ? (
              <Button asChild className={HERO_CTA}><Link to={road} data-testid="continue-roadmap">Continue roadmap</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline"><Link to={chapterPath}>Review mistakes</Link></Button>
                <Button className={HERO_CTA} data-testid="retry-assessment" onClick={onRetry}>Retry assessment</Button>
              </>
            )}
          </div>
        </div>
      </section>
      <section>
        <SectionHeading title="Review each question" />
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
    </>
  );
}
