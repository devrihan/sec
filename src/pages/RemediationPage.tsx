import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Note, PageTitle, SectionHeading } from '../components/page-parts';
import { ProgressBar } from '../components/ProgressBar';
import { examsWithErrors, getRoadmap, subjectsWithErrors, subjectsWithoutErrors } from '../services/remediationService';
import { useAppState } from '../services/store';

const marksText = (n: number) => `${n} ${n === 1 ? 'mark' : 'marks'}`;

export function RemediationPage() {
  const state = useAppState((s) => s);
  const groups = useMemo(
    () =>
      examsWithErrors(state).map((exam) => ({
        exam,
        cards: subjectsWithErrors(exam.id, state).map((subject) => ({ subject, roadmap: getRoadmap(state, exam.id, subject.id) })),
        clear: subjectsWithoutErrors(exam.id, state),
      })),
    [state],
  );

  return (
    <>
      <PageTitle title="Remediation" sub="Pick a roadmap and win back the marks you lost" />
      {groups.length === 0 ? (
        <EmptyState
          variant="page"
          illustration="/illustrations/no-answer-found.svg"
          title="No exam mistakes on record"
          description="There are no stored exam errors for your class. Sample records exist for Class 12."
          action={<Button asChild variant="outline"><Link to="/preparation">Go to Preparation</Link></Button>}
        />
      ) : (
        <>
          <Note>Exam records here are sample data for the demo student.</Note>
          {groups.map(({ exam, cards, clear }) => {
            const left = cards.reduce((sum, c) => sum + c.roadmap.marksLeft, 0);
            return (
              <section key={exam.id} data-testid="exam-group" aria-label={exam.name}>
                <SectionHeading title={exam.name} sub={left > 0 ? `${marksText(left)} still to win back` : 'Every mark won back'} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map(({ subject, roadmap }) => {
                    const next = roadmap.current;
                    return (
                      <Link
                        key={subject.id}
                        to={`/remediation/${exam.id}/${subject.id}`}
                        data-testid="roadmap-card"
                        className={cn(
                          'group flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md',
                          roadmap.isComplete ? 'border-good-edge bg-good-soft' : 'border-border bg-card',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[18px] leading-7 font-semibold tracking-[-0.108px] text-foreground">{subject.name}</p>
                            <p className="text-[14px] leading-5 text-muted-foreground">{exam.name}</p>
                          </div>
                          {roadmap.isComplete ? (
                            <CheckCircle2 className="size-5 shrink-0 text-good" aria-label="Complete" />
                          ) : (
                            <span className="shrink-0 text-right">
                              <span className="block text-[24px] leading-7 font-bold text-good-strong tabular-nums">{roadmap.marksLeft}</span>
                              <span className="block text-[12px] leading-4 text-muted-foreground">marks left</span>
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <ProgressBar value={roadmap.marksPercent} label={`${subject.name} ${exam.name} progress`} />
                          <p className="text-[14px] leading-5 text-muted-foreground tabular-nums">{roadmap.completed} of {roadmap.total} chapters fixed</p>
                        </div>
                        <p className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-[14px] leading-5">
                          <span className="min-w-0 truncate text-foreground">
                            {next ? <>Next: <span className="font-medium">{next.chapter.title}</span></> : 'All chapters fixed'}
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </p>
                      </Link>
                    );
                  })}
                </div>
                {clear.length > 0 && (
                  <p className="mt-3 text-[14px] leading-5 text-muted-foreground">
                    No mistakes recorded in{' '}
                    {clear.map((s, i) => (
                      <span key={s.id}>
                        {i > 0 && ', '}
                        <Link to={`/remediation/${exam.id}/${s.id}`} data-testid="clear-subject" className="font-medium text-foreground underline underline-offset-2">{s.name}</Link>
                      </span>
                    ))}
                    {' '}for this exam.
                  </p>
                )}
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
