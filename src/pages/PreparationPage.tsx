import { BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { CardGrid, PageTitle } from '../components/page-parts';
import { SubjectCard } from '../components/SubjectCard';
import { savedSnippetIds } from '../services/revisionService';
import { useAppState } from '../services/store';
import { subjectsForClass, useStudent } from '../services/studentService';

export function PreparationPage() {
  const student = useStudent();
  const subjects = subjectsForClass(student.class);
  const saved = useAppState((s) => savedSnippetIds(s).length);
  return (
    <>
      <PageTitle
        title="Preparation"
        sub={`Select a subject to begin, Class ${student.class}`}
        aside={
          <Button asChild variant="outline">
            <Link to="/preparation/saved" data-testid="open-saved">
              <BookmarkCheck className="size-4" />Saved cards<span className="rounded-full bg-muted px-1.5 text-[12px] leading-5 tabular-nums">{saved}</span>
            </Link>
          </Button>
        }
      />
      {subjects.length === 0 ? (
        <EmptyState variant="page" title="No subjects for this class yet" description="Choose another class in Demo settings." />
      ) : (
        <CardGrid>{subjects.map((s) => <SubjectCard key={s.id} subject={s} to={`/preparation/${s.id}`} />)}</CardGrid>
      )}
    </>
  );
}
