import { Check, Lock, Star, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { RoadmapNode as Node } from '../services/remediationService';
import type { AvatarConfig } from '../types';
import { AvatarImage } from './AvatarImage';

interface Props {
  node: Node;
  x: number;
  y: number;
  /** Which side of the button the chapter label sits on. */
  side: 'left' | 'right';
  to: string;
  avatar: AvatarConfig;
  onLocked: (node: Node) => void;
}

/** The solid bottom edge makes each stop look like a chunky button you can press. */
const DISC = 'relative flex size-[72px] items-center justify-center rounded-full text-white shadow-[0_8px_0_0_var(--lip)] transition-[translate,box-shadow,filter]';
const PRESS = 'group-hover:brightness-105 group-active:translate-y-1 group-active:shadow-[0_4px_0_0_var(--lip)] group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50';

const FACE = {
  completed: 'bg-[#10b981] [--lip:#047857]',
  current: 'bg-[#6366f1] [--lip:#4338ca]',
  locked: 'bg-[#e2e8f0] text-[#94a3b8] [--lip:#cbd5e1] dark:bg-[#334155] dark:[--lip:#1e293b]',
  goal: 'bg-[#f59e0b] [--lip:#b45309]',
};

const ANCHOR = 'group absolute size-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full text-left outline-none';

function Label({ x, side, highlight, children }: { x: number; side: 'left' | 'right'; highlight?: boolean; children: React.ReactNode }) {
  const room = side === 'right' ? 100 - x : x;
  return (
    <span
      className={cn('absolute top-1/2 flex max-w-[240px] -translate-y-1/2', side === 'right' ? 'left-full ml-3' : 'right-full mr-3 justify-end text-right')}
      style={{ width: `calc(${room}cqw - 48px)` }}
    >
      <span className={cn('grid min-w-0 rounded-xl border bg-card px-3 py-2 shadow-sm', highlight && 'border-[#a5b4fc]')}>{children}</span>
    </span>
  );
}

/** A stop on the path, placed by its centre. The label is inside the link, so it opens the chapter too. */
export function RoadmapNode({ node, x, y, side, to, avatar, onLocked }: Props) {
  const current = node.state === 'current';
  const errors = `${node.errorCount} ${node.errorCount === 1 ? 'error' : 'errors'}`;
  const status =
    node.state === 'completed'
      ? `Completed, best ${node.bestScore}%`
      : current
        ? `Current, ${errors}`
        : `Locked, ${errors}`;
  const body = (
    <>
      {current && <span aria-hidden="true" className="road-pulse absolute -inset-1.5 rounded-full border-4 border-[#a5b4fc]" />}
      <span aria-hidden="true" className={cn(DISC, FACE[node.state], node.state !== 'locked' && PRESS)}>
        {node.state === 'completed' ? <Check className="size-9" strokeWidth={3} /> : node.state === 'locked' ? <Lock className="size-7" strokeWidth={2.5} /> : <Star className="size-8 fill-current" />}
      </span>
      {current && (
        <>
          <span aria-hidden="true" className="road-bob absolute bottom-full left-1/2 mb-3 -translate-x-1/2 rounded-lg border border-[#a5b4fc] bg-card px-3 py-1 text-[14px] leading-5 font-semibold tracking-[-0.084px] whitespace-nowrap text-[#4338ca] shadow-sm dark:text-[#a5b4fc]">
            {node.attempts > 0 ? 'Keep going' : node.position === 1 ? 'Start here' : 'Up next'}
          </span>
          <span aria-hidden="true" className={cn('absolute top-1/2 size-10 -translate-y-1/2', side === 'right' ? 'right-full mr-1.5' : 'left-full ml-1.5')}>
            <AvatarImage config={avatar} className="size-10 border-2 border-white shadow-sm" />
          </span>
        </>
      )}
      <Label x={x} side={side} highlight={current}>
        <strong className={cn('text-[14px] leading-5 font-medium tracking-[-0.084px]', node.state === 'locked' ? 'text-muted-foreground' : 'text-foreground')}>
          {node.position}. {node.chapter.title}
        </strong>
        <small className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{status}</small>
      </Label>
    </>
  );
  const common = {
    className: cn(ANCHOR, node.state === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer'),
    style: { left: `${x}%`, top: `${y}px` },
    'data-testid': 'roadmap-node',
    'data-state': node.state,
  };

  if (node.state === 'locked') {
    return <button type="button" {...common} aria-disabled="true" onClick={() => onLocked(node)}>{body}</button>;
  }
  return <Link to={to} {...common}>{body}</Link>;
}

/** The end of the path. It marks the subject reward, and isn't a chapter you can open. */
export function RoadmapGoal({ x, y, side, reached, reward }: { x: number; y: number; side: 'left' | 'right'; reached: boolean; reward: string }) {
  return (
    <div className={ANCHOR} style={{ left: `${x}%`, top: `${y}px` }} data-testid="roadmap-goal">
      <span aria-hidden="true" className={cn(DISC, reached ? FACE.goal : FACE.locked)}><Trophy className="size-8" strokeWidth={2.5} /></span>
      <Label x={x} side={side}>
        <strong className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">Finish line</strong>
        <small className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{reached ? `Earned ${reward}` : `Earn ${reward}`}</small>
      </Label>
    </div>
  );
}
