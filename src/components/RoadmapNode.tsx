import { Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { RoadmapNode as Node } from '../services/remediationService';

interface Props {
  node: Node;
  x: number;
  y: number;
  to: string;
  onLocked: (node: Node) => void;
}

const DOT = {
  completed: 'border-[var(--inferentics-brand-primary)] bg-[var(--inferentics-brand-primary)] text-white',
  current: 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/10',
  locked: 'border-border bg-muted text-muted-foreground',
};

/** A stop on the curve. Its width runs from the dot to the card edge, so labels fit on phones. */
export function RoadmapNode({ node, x, y, to, onLocked }: Props) {
  const side = x < 50 ? 'right' : 'left';
  const errors = `${node.errorCount} ${node.errorCount === 1 ? 'error' : 'errors'}`;
  const status =
    node.state === 'completed'
      ? `Completed, best ${node.bestScore}%`
      : node.state === 'current'
        ? `Current, ${errors}`
        : `Locked, ${errors}`;
  const body = (
    <>
      <span aria-hidden="true" className={cn('flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-[16px] leading-6 font-semibold transition-transform group-hover:scale-105', DOT[node.state])}>
        {node.state === 'completed' ? <Check className="size-5" /> : node.state === 'locked' ? <Lock className="size-4" /> : node.position}
      </span>
      <span className={cn('grid max-w-[260px] min-w-0 rounded-lg border bg-card px-3 py-1.5 shadow-xs', node.state === 'current' && 'border-primary')}>
        <strong className={cn('text-[14px] leading-5 font-medium tracking-[-0.084px]', node.state === 'locked' ? 'text-muted-foreground' : 'text-foreground')}>
          {node.position}. {node.chapter.title}
        </strong>
        <small className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{status}</small>
      </span>
    </>
  );
  const common = {
    className: cn(
      'group absolute flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      side === 'right' ? '-translate-x-[22px] -translate-y-[22px]' : 'flex-row-reverse -translate-x-[calc(100%-22px)] -translate-y-[22px] text-right',
      node.state === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer',
    ),
    style: { left: `${x}%`, top: `${y}px`, width: `calc(${side === 'right' ? 100 - x : x}% + 14px)` },
    'data-testid': 'roadmap-node',
    'data-state': node.state,
  };

  if (node.state === 'locked') {
    return <button type="button" {...common} aria-disabled="true" onClick={() => onLocked(node)}>{body}</button>;
  }
  return <Link to={to} {...common}>{body}</Link>;
}
