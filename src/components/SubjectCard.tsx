import { chaptersForSubject } from '../services/questionService';
import { StatCard } from './stat-card';
import type { Subject } from '../types';

export function SubjectCard({ subject, to }: { subject: Subject; to: string }) {
  return (
    <StatCard
      name={subject.name}
      subtitle={`Class ${subject.class}`}
      label="Chapters"
      avg={chaptersForSubject(subject.id).length}
      href={to}
      testId="subject-card"
    />
  );
}
