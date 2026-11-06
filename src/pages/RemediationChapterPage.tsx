import { useMemo, useState } from 'react';
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
import { revisionForChapter } from '../services/questionService';
import { attemptHistory, errorsForChapter, getRoadmap, startAssessment } from '../services/remediationService';
import { useAppState } from '../services/store';
import type { StudentError } from '../types';

const LABEL = 'text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground';
const HEAD = 'h-auto px-4 py-3 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground';

function MistakeCard({ error, index, total }: { error: StudentError; index: number; total: number }) {
  const original = descriptiveById(error.questionId)?.questionText ?? questionById(error.questionId)?.questionText;
  const mistake = studentMistake(error.errorType);
  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm" data-testid="error-card">
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#e60000]/30 bg-[#fff0f0] px-4 py-3">
          <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-[#e60000]">Your answer</h3>
          <p className="text-[16px] leading-6 text-foreground">{error.studentAnswer}</p>
        </div>
        <div className="rounded-lg border border-[#d3fde5] bg-[#ecfdf2] px-4 py-3">
          <h3 className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-[#008a2e]">Correct answer</h3>
          <p className="text-[16px] leading-6 text-foreground">{error.expectedAnswer}</p>
        </div>
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

  return (
    <>
      <BackLink to={road}>{subject.name} roadmap</BackLink>
      <PageTitle
        title={chapter.title}
        sub={`${subject.name} · ${exam.name}`}
        aside={<Badge variant="secondary" data-testid="mistake-count">{errors.length} {errors.length === 1 ? 'mistake' : 'mistakes'} identified</Badge>}
      />
      <Note>These answers are sample records for the demo student, not real exam data.</Note>

      <div className="grid gap-4">
        {errors.map((e, i) => <MistakeCard key={e.id} error={e} index={i} total={errors.length} />)}
      </div>

      {hasRevision && (
        <Button asChild variant="outline"><Link to={`/preparation/${subjectId}/${chapterId}/revision`}>Open revision notes</Link></Button>
      )}

      {history.length > 0 && (
        <section>
          <SectionHeading title="Your attempts" />
          <div className="overflow-hidden rounded-xl border border-sidebar-border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-sidebar-border bg-green-50 hover:bg-green-50">
                  <TableHead className={HEAD}>Attempt</TableHead>
                  <TableHead className={HEAD}>Score</TableHead>
                  <TableHead className={HEAD}>Result</TableHead>
                  <TableHead className={HEAD}>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="attempts">
                {history.map((a, i) => (
                  <TableRow key={a.id} className="border-sidebar-border bg-white hover:bg-muted/30" data-testid="attempt-row">
                    <TableCell className="px-4 py-3 text-[14px] leading-5 tabular-nums">{i + 1}</TableCell>
                    <TableCell className="px-4 py-3 text-[14px] leading-5 tabular-nums">{a.score} / {a.total} = {a.percent}%</TableCell>
                    <TableCell className={`px-4 py-3 text-[14px] leading-5 font-medium ${a.passed ? 'text-green-700' : 'text-red-700'}`}>{a.passed ? 'Passed' : 'Not passed'}</TableCell>
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
        <div className="flex justify-center">
          <Button
            size="lg"
            className={HERO_CTA}
            data-testid="start-assessment"
            onClick={() => {
              const outcome = startAssessment(examId, subjectId, chapterId);
              if (outcome.ok) navigate(`${road}/${chapterId}/assessment`);
              else setProblem("This chapter doesn't have enough questions for an assessment yet.");
            }}
          >
            Start {REMEDIATION_QUESTION_COUNT}-question assessment
          </Button>
        </div>
      )}
    </>
  );
}
