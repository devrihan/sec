import { useParams } from 'react-router-dom';
import { ChapterCard } from '../components/ChapterCard';
import { BackLink, CardGrid, NotFoundState, PageTitle } from '../components/page-parts';
import { subjectById } from '../services/catalog';
import { chaptersForSubject, questionsForChapter } from '../services/questionService';
import { roadmapFirst } from '../services/remediationService';
import { useAppState } from '../services/store';
import { useStudent } from '../services/studentService';

export function FlashcardChaptersPage() {
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
      <BackLink to="/flashcards">All subjects</BackLink>
      <PageTitle title={subject.name} sub={anyOnRoadmap ? 'Practise the chapters on your remediation roadmap first' : 'Select a chapter to start a quiz'} />
      <CardGrid>
        {chapters.map((c) => (
          <ChapterCard key={c.id} chapter={c} to={`/flashcards/${subject.id}/${c.id}`} summary="Question bank" label="MCQs" value={questionsForChapter(c.id).length} spot={spots.get(c.id)} />
        ))}
      </CardGrid>
    </>
  );
}
