import { BookOpen, FileQuestion, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { MIN_WRITTEN, NumericAnswer, WrittenAnswer } from '../components/FixAnswer';
import { MistakeFixPlan } from '../components/MistakeFixPlan';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { studentMistake } from '@/lib/student-mistakes';
import { BackLink, HERO_CTA, Note, Notice, NotFoundState, PageTitle, SectionHeading } from '../components/page-parts';
import { Formula } from '../components/RevisionSnippet';
import { REMEDIATION_QUESTION_COUNT } from '../config/rewards';
import { chapterById, descriptiveById, exams, questionById, subjectById } from '../services/catalog';
import { questionsForChapter, revisionForChapter } from '../services/questionService';
import { attemptHistory, errorsForChapter, getRoadmap, startAssessment } from '../services/remediationService';
import { useAppState } from '../services/store';
import { fixCheckFor, isAnswered, MCQ_TOP_UP, recordRetry, retryFor, TWINS_PER_MISTAKE } from '../services/fixCheckService';
import type { FixCheck, FixResponse, MistakeRetry, StudentError } from '../types';

const LABEL = 'text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground';
const HEAD = 'h-auto px-4 py-3 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground';

function RevealedAnswer({ error }: { error: StudentError }) {
  return (
    <>
      <div className="rounded-lg border border-good-edge bg-good-soft px-4 py-3">
        <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-good">Correct answer</h3>
        <p className="text-[16px] leading-6 text-foreground">{error.expectedAnswer}</p>
      </div>
      <div>
        <h3 className={LABEL}>Why it is correct</h3>
        <p className="text-[16px] leading-6 text-muted-foreground">{error.explanation}</p>
      </div>
      {error.formula && (
        <div className="space-y-1">
          <h3 className={LABEL}>Formula</h3>
          <Formula>{error.formula}</Formula>
        </div>
      )}
      <div>
        <h3 className={LABEL}>Concept revision</h3>
        <p className="text-[16px] leading-6 text-muted-foreground">{error.concept}</p>
      </div>
    </>
  );
}

/** Re-asks the exam question before showing the answer, so the student finds out whether they can now do it. */
function RetryBox({ error, check }: { error: StudentError; check: FixCheck }) {
  const [draft, setDraft] = useState<FixResponse>({});
  const marking = check.retry;
  const ready = marking.kind === 'numeric' ? isAnswered(marking, draft) : (draft.text ?? '').trim().length >= MIN_WRITTEN;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4" data-testid="retry-box">
      <div>
        <h3 className="text-[16px] leading-6 font-semibold text-foreground">Try it again before you see the answer</h3>
        <p className="text-[14px] leading-5 text-muted-foreground">Same question as in your exam. Can you get it right now?</p>
      </div>
      {marking.kind === 'numeric' ? (
        <NumericAnswer parts={marking.parts} response={draft} onChange={setDraft} />
      ) : (
        <WrittenAnswer
          keyPoints={marking.keyPoints}
          response={draft}
          // Comparing with the marking points reveals the answer, so it counts as the retry.
          onChange={(r) => (r.marked ? recordRetry(error.id, r) : setDraft(r))}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        {marking.kind === 'numeric' && (
          <Button disabled={!ready} onClick={() => recordRetry(error.id, draft)} data-testid="check-retry">Check my answer</Button>
        )}
        <button type="button" className="text-[14px] leading-5 font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => recordRetry(error.id, null)} data-testid="skip-retry">
          I'm stuck, show me the answer
        </button>
      </div>
    </div>
  );
}

function RetryOutcome({ error, check, retry }: { error: StudentError; check: FixCheck; retry: MistakeRetry }) {
  const marking = check.retry;
  if (retry.score === null || !retry.response) {
    return <p className="rounded-lg bg-muted px-4 py-2 text-[14px] leading-5 text-muted-foreground" data-testid="retry-outcome">You looked at the answer without retrying. The fix check below will test this mistake.</p>;
  }
  if (marking.kind === 'numeric') {
    const right = retry.score >= 1;
    return (
      <div className={cn('flex flex-col gap-3 rounded-lg border px-4 py-3', right ? 'border-good-edge bg-good-soft' : 'border-bad/30 bg-bad-soft')} data-testid="retry-outcome">
        <p className={cn('text-[15px] leading-6 font-semibold', right ? 'text-good' : 'text-bad')}>{right ? 'Right this time. Now make sure it sticks.' : 'Still not right. Read why below before the fix check.'}</p>
        <NumericAnswer parts={marking.parts} response={retry.response} locked showResult />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3" data-testid="retry-outcome">
      <WrittenAnswer keyPoints={marking.keyPoints} response={retry.response} onChange={(r) => recordRetry(error.id, r)} />
    </div>
  );
}

function MistakeCard({ error, index, total, retry }: { error: StudentError; index: number; total: number; retry: MistakeRetry | undefined }) {
  const original = descriptiveById(error.questionId)?.questionText ?? questionById(error.questionId)?.questionText;
  const mistake = studentMistake(error.errorType);
  const check = fixCheckFor(error.id);
  // Without fix data there is nothing to re-ask, so the answer shows straight away as before.
  const revealed = !check || retry !== undefined;
  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm" data-testid="error-card" data-revealed={revealed}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] leading-5 text-muted-foreground">Mistake {index + 1} of {total}</span>
        <span className="flex items-center gap-2 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: mistake.color }} />
          {mistake.label}
        </span>
      </header>
      <div>
        <h2 className={LABEL}>Original question</h2>
        <p className="text-[16px] leading-6 text-foreground">{original}</p>
      </div>
      <div className="rounded-lg border border-bad/30 bg-bad-soft px-4 py-3">
        <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-bad">Your answer in the exam</h3>
        <p className="text-[16px] leading-6 text-foreground">{error.studentAnswer}</p>
      </div>
      {check && !retry && <RetryBox error={error} check={check} />}
      {check && retry && <RetryOutcome error={error} check={check} retry={retry} />}
      {revealed && <RevealedAnswer error={error} />}
      {revealed && <MistakeFixPlan error={error} />}
    </article>
  );
}

export function RemediationChapterPage() {
  const { examId = '', subjectId = '', chapterId = '' } = useParams();
  const navigate = useNavigate();
  const state = useAppState((s) => s);
  const [problem, setProblem] = useState<string | null>(null);
  const node = useMemo(
    () => getRoadmap(state, examId, subjectId).nodes.find((n) => n.chapter.id === chapterId),
    [state, examId, subjectId, chapterId],
  );
  const chapter = chapterById(chapterId);
  const subject = subjectById(subjectId);
  const exam = exams.find((e) => e.id === examId);
  const road = `/remediation/${examId}/${subjectId}`;

  if (!chapter || !subject || !exam || !node) {
    return <NotFoundState message="This chapter isn't on your roadmap." />;
  }
  if (node.state === 'locked') {
    return (
      <>
        <BackLink to={road}>{subject.name} roadmap</BackLink>
        <EmptyState
          variant="page"
          title="This chapter is locked"
          description={`Pass the previous chapter with at least 75% to unlock ${chapter.title}.`}
          action={<Button asChild variant="outline"><Link to={road}>Back to roadmap</Link></Button>}
        />
      </>
    );
  }

  const errors = errorsForChapter(state, examId, chapterId);
  const history = attemptHistory(state, examId, chapterId);
  const hasRevision = revisionForChapter(chapterId).length > 0;
  const hasFixChecks = errors.length > 0 && errors.every((e) => fixCheckFor(e.id));
  const retried = errors.filter((e) => retryFor(state, e.id)).length;
  const ready = !hasFixChecks || retried === errors.length;
  const mcqs = Math.min(MCQ_TOP_UP, questionsForChapter(chapterId).length);
  const checkSize = hasFixChecks ? errors.length * TWINS_PER_MISTAKE + mcqs : REMEDIATION_QUESTION_COUNT;
  const prep = [
    hasRevision && { to: `/preparation/${subjectId}/${chapterId}/revision`, icon: BookOpen, label: 'Revision notes', line: 'Go over the key ideas' },
    { to: `/preparation/${subjectId}/${chapterId}/questions`, icon: FileQuestion, label: 'Important questions', line: 'See what exams usually ask' },
    questionsForChapter(chapterId).length > 0 && { to: `/flashcards/${subjectId}/${chapterId}`, icon: Layers, label: 'Flashcard quiz', line: 'Practise, then come back' },
  ].filter((x) => !!x);

  return (
    <>
      <BackLink to={road}>{subject.name} roadmap</BackLink>
      <PageTitle
        title={chapter.title}
        sub={node.state === 'current' ? `${subject.name} · ${exam.name} · Fix this chapter to win back about ${node.marks} ${node.marks === 1 ? 'mark' : 'marks'}` : `${subject.name} · ${exam.name}`}
        aside={<Badge variant="secondary" data-testid="mistake-count">{errors.length} {errors.length === 1 ? 'mistake' : 'mistakes'} identified</Badge>}
      />
      <Note>These answers are sample records for the demo student, not real exam data.</Note>

      <div className="grid gap-4">
        {errors.map((e, i) => <MistakeCard key={e.id} error={e} index={i} total={errors.length} retry={retryFor(state, e.id)} />)}
      </div>

      {node.state !== 'completed' && (
        <section data-testid="before-retry">
          <SectionHeading title="Before the fix check" sub="Use the practice tools on this chapter if anything still feels shaky" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {prep.map((p) => (
              <Link key={p.to} to={p.to} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><p.icon className="size-4" /></span>
                <span className="min-w-0">
                  <span className="block text-[14px] leading-5 font-medium text-foreground">{p.label}</span>
                  <span className="block truncate text-[14px] leading-5 text-muted-foreground">{p.line}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <SectionHeading title="Your attempts" />
          <div className="overflow-hidden rounded-xl border border-sidebar-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="border-sidebar-border bg-table-head hover:bg-table-head">
                  <TableHead className={HEAD}>Attempt</TableHead>
                  <TableHead className={HEAD}>Score</TableHead>
                  <TableHead className={HEAD}>Result</TableHead>
                  <TableHead className={HEAD}>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="attempts">
                {history.map((a, i) => (
                  <TableRow key={a.id} className="border-sidebar-border bg-background hover:bg-muted/30" data-testid="attempt-row">
                    <TableCell className="px-4 py-3 text-[14px] leading-5 tabular-nums">{i + 1}</TableCell>
                    <TableCell className="px-4 py-3 text-[14px] leading-5 tabular-nums">{a.score} / {a.total} = {a.percent}%</TableCell>
                    <TableCell className={`px-4 py-3 text-[14px] leading-5 font-medium ${a.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{a.passed ? 'Passed' : 'Not passed'}</TableCell>
                    <TableCell className="px-4 py-3 text-[14px] leading-5 text-muted-foreground tabular-nums">{new Date(a.attemptedAt).toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {problem && <Notice tone="error">{problem}</Notice>}
      {node.state === 'completed' ? (
        <Notice>You passed this chapter with a best score of {node.bestScore}%.</Notice>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-good-edge bg-good-tint px-6 py-6 text-center" data-testid="fix-check-panel">
          <h2 className="text-[20px] leading-7 font-semibold text-foreground">Fix check</h2>
          {hasFixChecks ? (
            <p className="max-w-[560px] text-[15px] leading-6 text-muted-foreground">
              {checkSize} questions: {TWINS_PER_MISTAKE} new questions for each of your {errors.length} {errors.length === 1 ? 'mistake' : 'mistakes'}, on the same concept and in the same format as the exam{mcqs > 0 ? `, plus ${mcqs} quick MCQs` : ''}.
              {' '}To pass, score at least 75% <strong className="font-semibold text-foreground">and</strong> get at least one question right for every mistake.
            </p>
          ) : (
            <p className="text-[15px] leading-6 text-muted-foreground">{checkSize} questions. Score at least 75% to pass.</p>
          )}
          {!ready && (
            <p className="text-[14px] leading-5 font-medium text-warn" data-testid="retry-progress">
              Try each mistake again above first: {retried} of {errors.length} done
            </p>
          )}
          <Button
            size="lg"
            className={HERO_CTA}
            disabled={!ready}
            data-testid="start-assessment"
            onClick={() => {
              const outcome = startAssessment(examId, subjectId, chapterId);
              if (outcome.ok) navigate(`${road}/${chapterId}/assessment`);
              else setProblem("This chapter doesn't have enough questions for a check yet.");
            }}
          >
            Start fix check
          </Button>
        </section>
      )}
    </>
  );
}
