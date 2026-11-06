import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { HERO_CTA, Note, PageTitle, Pick, WHITE_PANEL } from '../components/page-parts';
import { examsWithErrors, subjectsWithErrors, subjectsWithoutErrors } from '../services/remediationService';
import { useAppState } from '../services/store';

export function RemediationPage() {
  const state = useAppState((s) => s);
  const navigate = useNavigate();
  const exams = useMemo(() => examsWithErrors(state), [state]);
  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const subjects = useMemo(() => subjectsWithErrors(examId, state), [examId, state]);
  const clear = useMemo(() => subjectsWithoutErrors(examId, state), [examId, state]);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');

  useEffect(() => {
    if (!subjects.some((s) => s.id === subjectId)) setSubjectId(subjects[0]?.id ?? '');
  }, [subjects, subjectId]);

  return (
    <>
      <PageTitle title="Remediation" sub="Review your exam and improve your weak chapters" />
      {exams.length === 0 ? (
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
          <section className={`${WHITE_PANEL} flex max-w-[520px] flex-col gap-4`}>
            <Pick label="Examination" testId="exam-select" value={examId} onChange={setExamId} options={exams.map((e) => ({ value: e.id, label: e.name }))} />
            <Pick label="Subject" testId="remediation-subject" value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
            <Button className={`${HERO_CTA} self-start`} disabled={!subjectId} data-testid="view-roadmap" onClick={() => navigate(`/remediation/${examId}/${subjectId}`)}>
              View my roadmap
            </Button>
            {clear.length > 0 && (
              <p className="text-[14px] leading-5 text-muted-foreground">
                No mistakes recorded in{' '}
                {clear.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ', '}
                    <Link to={`/remediation/${examId}/${s.id}`} data-testid="clear-subject" className="font-medium text-foreground underline underline-offset-2">{s.name}</Link>
                  </span>
                ))}
                {' '}for this exam.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
