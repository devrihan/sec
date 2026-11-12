import { useParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { ChapterCard } from '../components/ChapterCard';
import { BackLink, CardGrid, NotFoundState, PageTitle } from '../components/page-parts';
import { subjectById } from '../services/catalog';
import { bankForChapter, chaptersForSubject, resourceSummary } from '../services/questionService';
import { roadmapFirst } from '../services/remediationService';
import { useAppState } from '../services/store';
import { useStudent } from '../services/studentService';

export function SubjectChaptersPage() {
  const { subjectId = '' } = useParams();
  const student = useStudent();
  const state = useAppState((s) => s);
  const subject = subjectById(subjectId);
  if (!subject || subject.class !== student.class) {
    return <NotFoundState message="This subject isn't part of your class." />;
  }
  const { chapters, spots, anyOnRoadmap } = roadmapFirst(state, chaptersForSubject(subject.id));
  return (
    <>
      <BackLink to="/preparation">All subjects</BackLink>
      <PageTitle title={subject.name} sub={anyOnRoadmap ? 'Chapters on your remediation roadmap come first' : `Class ${subject.class} chapters in syllabus order`} />
      {chapters.length === 0 ? (
        <EmptyState variant="page" title="No chapters yet" />
      ) : (
        <CardGrid>
          {chapters.map((c) => (
            <ChapterCard key={c.id} chapter={c} to={`/preparation/${subject.id}/${c.id}`} summary={resourceSummary(c.id)} label="Questions" value={bankForChapter(c.id).length} spot={spots.get(c.id)} />
          ))}
        </CardGrid>
      )}
    </>
  );
}
