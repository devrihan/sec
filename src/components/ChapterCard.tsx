import { Route } from 'lucide-react';
import { StatCard } from './stat-card';
import type { roadmapSpotForChapter } from '../services/remediationService';
import type { Chapter } from '../types';

type Spot = ReturnType<typeof roadmapSpotForChapter>;

/** Marks a chapter that is still on one of the student's remediation roadmaps. */
export function RoadmapTag({ spot }: { spot: NonNullable<Spot> }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-good-edge bg-good-soft px-2 py-0.5 text-[12px] leading-4 font-medium text-good" data-testid="roadmap-tag">
      <Route className="size-3" aria-hidden="true" />
      On your roadmap · {spot.node.marks} {spot.node.marks === 1 ? 'mark' : 'marks'}
    </span>
  );
}

export function ChapterCard({ chapter, to, summary, label, value, spot }: { chapter: Chapter; to: string; summary: string; label: string; value: number; spot?: Spot }) {
  return (
    <StatCard
      name={`${chapter.number}. ${chapter.title}`}
      subtitle={summary}
      label={label}
      avg={value}
      href={to}
      testId="chapter-card"
      tag={spot ? <RoadmapTag spot={spot} /> : undefined}
    />
  );
}
