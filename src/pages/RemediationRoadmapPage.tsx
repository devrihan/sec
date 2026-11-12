import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BackLink, Notice, NotFoundState, PageTitle } from '../components/page-parts';
import { RoadmapGoal, RoadmapNode } from '../components/RoadmapNode';
import { REMEDIATION_COMPLETION_REWARD } from '../config/rewards';
import { exams, subjectById } from '../services/catalog';
import { getRoadmap, type RoadmapNode as Node } from '../services/remediationService';
import { useAppState } from '../services/store';
import { useStudent } from '../services/studentService';

const STEP = 136;
/** Leaves room above the first stop for its "Start here" bubble. */
const TOP = 96;
const BOTTOM = 72;
/** Horizontal positions (percent) that swing the path from side to side. */
const X_CYCLE = [50, 64, 74, 64, 50, 36, 26, 36];

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

const marksText = (n: number) => `${n} ${n === 1 ? 'mark' : 'marks'}`;

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

  // One extra point for the finish line after the last chapter.
  const points = Array.from({ length: roadmap.nodes.length + 1 }, (_, i) => ({ x: X_CYCLE[i % X_CYCLE.length], y: TOP + i * STEP }));
  const height = points[points.length - 1].y + BOTTOM;
  const reached = roadmap.nodes.filter((n) => n.state !== 'locked').length + (roadmap.isComplete ? 1 : 0);
  const walked = points.slice(0, Math.max(1, reached));
  // Labels sit on the roomier side. Mid-path stops take the side the road is leaving.
  const sideOf = (i: number) => {
    const { x } = points[i];
    if (x === 50) return i % X_CYCLE.length === 0 ? 'left' : 'right';
    return x > 50 ? 'left' : 'right';
  };
  const goal = points[points.length - 1];
  const { coins, points: rewardPoints } = REMEDIATION_COMPLETION_REWARD;
  const next = roadmap.current;

  const onLocked = (node: Node) => {
    const before = roadmap.nodes[node.position - 2];
    setLockedNote(`${node.chapter.title} is locked. Pass ${before?.chapter.title ?? 'the previous chapter'} with at least 75% to unlock it.`);
  };

  return (
    <>
      <BackLink to="/remediation">Remediation</BackLink>
      <section className="space-y-4 rounded-2xl bg-linear-to-br from-[#133951] to-[#0f766e] p-6 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px]">{subject.name} • {exam.name}</h1>
            <p className="text-[18px] leading-[28px] font-medium tracking-[-0.108px] text-white/80" data-testid="next-win">
              {next ? `Fix ${next.chapter.title} next to win back about ${marksText(next.marks)}` : `You've fixed the mistakes behind all ${marksText(roadmap.marksTotal)}`}
            </p>
          </div>
          {roadmap.current && (
            <Button asChild size="lg" className="shrink-0 bg-white text-[#133951] shadow-[0_4px_0_0_rgb(255_255_255/0.3)] hover:bg-white/90">
              <Link to={`${base}/${roadmap.current.chapter.id}`} data-testid="continue-chapter">Continue current chapter</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="flex shrink-0 items-baseline gap-2" data-testid="marks-left">
            <span className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px] tabular-nums">{roadmap.marksLeft}</span>
            <span className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-white/80">{roadmap.marksLeft === 1 ? 'mark' : 'marks'} left to win back</span>
          </p>
          <Progress
            value={roadmap.marksPercent}
            aria-label="Subject remediation progress"
            className="h-3 min-w-[120px] flex-1 bg-white/20 [&_[data-slot=progress-indicator]]:bg-[#34d399]"
          />
          <span className="shrink-0 text-[14px] leading-5 font-medium tracking-[-0.084px] tabular-nums" data-testid="progress-count">
            {roadmap.completed} / {roadmap.total} chapters
          </span>
          <Badge variant="secondary" className="shrink-0" data-testid="progress-percent">Progress {roadmap.marksPercent}%</Badge>
        </div>
      </section>

      {roadmap.isComplete && (
        <section className="flex flex-col items-start gap-2 rounded-xl bg-good-tint px-6 py-4 outline outline-1 outline-offset-[-1px] outline-border" data-testid="subject-complete">
          <h2 className="text-[20px] leading-7 font-semibold tracking-[-0.12px] text-good-strong">{subject.name} remediation complete</h2>
          <p className="text-[16px] leading-6 text-foreground">Every chapter from {exam.name} is fixed. Your reward has been added.</p>
          <Button asChild variant="outline" size="sm"><Link to="/leaderboard">View leaderboard</Link></Button>
        </section>
      )}

      <div className="@container relative mx-auto w-full max-w-[640px]" style={{ height }}>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full">
          <path d={curve(points)} fill="none" stroke="var(--road)" strokeWidth="16" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {walked.length > 1 && <path d={curve(walked)} fill="none" stroke="#34d399" strokeWidth="16" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {roadmap.nodes.map((n, i) => (
          <RoadmapNode key={n.chapter.id} node={n} x={points[i].x} y={points[i].y} side={sideOf(i)} to={`${base}/${n.chapter.id}`} avatar={student.avatar} onLocked={onLocked} />
        ))}
        <RoadmapGoal x={goal.x} y={goal.y} side={sideOf(points.length - 1)} reached={roadmap.isComplete} reward={`${coins} coins and ${rewardPoints} points`} />
      </div>

      {/* Stays in view, because a locked stop can be far down the path. */}
      {lockedNote && (
        <div className="sticky bottom-4 z-10 rounded-lg bg-background shadow-lg">
          <Notice tone="error" testId="locked-note">{lockedNote}</Notice>
        </div>
      )}
    </>
  );
}
