import { EmptyState } from '@/components/empty-states/empty-state';
import { CardGrid, PageTitle } from '../components/page-parts';
import { SubjectCard } from '../components/SubjectCard';
import { subjectsForClass, useStudent } from '../services/studentService';

export function PreparationPage() {
  const student = useStudent();
  const subjects = subjectsForClass(student.class);
  return (
    <>
      <PageTitle title="Preparation" sub={`Select a subject to begin, Class ${student.class}`} />
      {subjects.length === 0 ? (
        <EmptyState variant="page" title="No subjects for this class yet" description="Choose another class in Demo settings." />
      ) : (
        <CardGrid>{subjects.map((s) => <SubjectCard key={s.id} subject={s} to={`/preparation/${s.id}`} />)}</CardGrid>
      )}
    </>
  );
}
