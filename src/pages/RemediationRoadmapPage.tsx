import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackLink, HERO_CTA, Notice, NotFoundState, PageTitle } from '../components/page-parts';
import { ProgressBar } from '../components/ProgressBar';
import { RoadmapNode } from '../components/RoadmapNode';
import { exams, subjectById } from '../services/catalog';
import { getRoadmap, type RoadmapNode as Node } from '../services/remediationService';
import { useAppState } from '../services/store';
import { useStudent } from '../services/studentService';

const STEP = 112;
const TOP = 56;
/** Horizontal positions (percent) that make the path wander like a level map. */
const X_CYCLE = [30, 38, 68, 74, 60, 32, 24, 40, 70, 62];

/** Smooth path through the nodes, in a 0–100 wide coordinate space. */
function curve(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const midY = (prev.y + p.y) / 2;
      return `C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    })
    .join(' ');
}

export function RemediationRoadmapPage() {
  const { examId = '', subjectId = '' } = useParams();
  const student = useStudent();
  const state = useAppState((s) => s);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const roadmap = useMemo(() => getRoadmap(state, examId, subjectId), [state, examId, subjectId]);
  const exam = exams.find((e) => e.id === examId);
  const subject = subjectById(subjectId);
  if (!exam || !subject || subject.class !== student.class) {
    return <NotFoundState message="This exam or subject isn't available for you." />;
  }
  const base = `/remediation/${exam.id}/${subject.id}`;

  if (roadmap.total === 0) {
    return (
      <>
        <BackLink to="/remediation">Remediation</BackLink>
        <PageTitle title={`${subject.name} • ${exam.name}`} />
        <EmptyState
          variant="page"
          illustration="/illustrations/no-answer-found.svg"
          title="No remediation chapters found for this subject. Great work!"
          action={<Button asChild variant="outline"><Link to="/remediation">Choose another subject</Link></Button>}
        />
      </>
    );
  }

  const points = roadmap.nodes.map((_, i) => ({ x: X_CYCLE[i % X_CYCLE.length], y: TOP + i * STEP }));
  const height = TOP * 2 + (roadmap.nodes.length - 1) * STEP;
  const reached = roadmap.nodes.filter((n) => n.state !== 'locked').length;
  const walked = points.slice(0, Math.max(1, reached));

  const onLocked = (node: Node) => {
    const before = roadmap.nodes[node.position - 2];
    setLockedNote(`${node.chapter.title} is locked. Pass ${before?.chapter.title ?? 'the previous chapter'} with at least 75% to unlock it.`);
  };

  return (
    <>
      <BackLink to="/remediation">Remediation</BackLink>
      <PageTitle title={`${subject.name} • ${exam.name}`} sub="Fix each chapter to unlock the next" aside={<Badge variant="secondary" data-testid="progress-percent">Progress {roadmap.percent}%</Badge>} />

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1"><ProgressBar value={roadmap.percent} label="Subject remediation progress" /></div>
        <span className="shrink-0 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground tabular-nums" data-testid="progress-count">
          {roadmap.completed} / {roadmap.total} chapters
        </span>
      </div>

      {roadmap.isComplete && (
        <section className="flex flex-col items-start gap-2 rounded-xl bg-[#EAF4EE] px-6 py-4 outline outline-1 outline-offset-[-1px] outline-gray-200" data-testid="subject-complete">
          <h2 className="text-[20px] leading-7 font-semibold tracking-[-0.12px] text-[#008138]">{subject.name} remediation complete</h2>
          <p className="text-[16px] leading-6 text-foreground">Every chapter from {exam.name} is fixed. Your reward has been added.</p>
          <Button asChild variant="outline" size="sm"><Link to="/leaderboard">View leaderboard</Link></Button>
        </section>
      )}

      {lockedNote && <Notice tone="error" testId="locked-note">{lockedNote}</Notice>}

      <div className="relative overflow-hidden rounded-2xl border bg-background" style={{ height }}>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full">
          <path d={curve(points)} fill="none" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 8" vectorEffect="non-scaling-stroke" />
          {walked.length > 1 && <path d={curve(walked)} fill="none" stroke="var(--inferentics-brand-primary)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {roadmap.nodes.map((n, i) => (
          <RoadmapNode key={n.chapter.id} node={n} x={points[i].x} y={points[i].y} to={`${base}/${n.chapter.id}`} onLocked={onLocked} />
        ))}
      </div>

      {roadmap.current && (
        <div className="flex justify-center">
          <Button asChild size="lg" className={HERO_CTA}>
            <Link to={`${base}/${roadmap.current.chapter.id}`} data-testid="continue-chapter">Continue current chapter</Link>
          </Button>
        </div>
      )}
    </>
  );
}
