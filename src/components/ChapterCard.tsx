import { StatCard } from './stat-card';
import type { Chapter } from '../types';

export function ChapterCard({ chapter, to, summary, label, value }: { chapter: Chapter; to: string; summary: string; label: string; value: number }) {
  return (
    <StatCard
      name={`${chapter.number}. ${chapter.title}`}
      subtitle={summary}
      label={label}
      avg={value}
      href={to}
      testId="chapter-card"
    />
  );
}
