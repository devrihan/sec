import { useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { BackLink, NotFoundState, PageTitle } from '../components/page-parts';
import { StatCard } from '../components/stat-card';
import { VideoPreviewCard } from '../components/VideoPreviewCard';
import { chapterById, descriptiveQuestions, subjectById } from '../services/catalog';
import { bankForChapter, revisionForChapter, videoForChapter } from '../services/questionService';
import { useStudent } from '../services/studentService';

export function ChapterResourcesPage() {
  const { subjectId = '', chapterId = '' } = useParams();
  const [params] = useSearchParams();
  const t = Number(params.get('t'));
  const startAt = params.has('t') && Number.isFinite(t) && t >= 0 ? t : null;
  const student = useStudent();
  const subject = subjectById(subjectId);
  const chapter = chapterById(chapterId);
  if (!subject || !chapter || chapter.subjectId !== subject.id || subject.class !== student.class) {
    return <NotFoundState message="This chapter isn't part of your subjects." />;
  }
  const video = videoForChapter(chapter.id);
  const base = `/preparation/${subject.id}/${chapter.id}`;
  const isBoardClass = subject.class === 10 || subject.class === 12;

  return (
    <>
      <BackLink to={`/preparation/${subject.id}`}>{subject.name} chapters</BackLink>
      <PageTitle title={chapter.title} sub={subject.name} />
      {video ? (
        <VideoPreviewCard key={startAt ?? 'none'} video={video} startAt={startAt} />
      ) : (
        <EmptyState variant="page" illustration="/illustrations/no-answer-found.svg" title="Video coming soon" description="Revision and questions for this chapter are ready below." />
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StatCard name="Revision cards" subtitle="Swipe through the whole chapter" label="Cards" avg={revisionForChapter(chapter.id).length} href={`${base}/revision`} testId="open-revision" />
        <StatCard
          name="Important Questions"
          subtitle={isBoardClass ? 'CBSE PYQs and question bank' : 'Syllabus and NCERT based'}
          label="Questions"
          avg={bankForChapter(chapter.id).length}
          href={`${base}/questions`}
          testId="open-questions"
        />
        <StatCard
          name="Written practice"
          subtitle="Timed mini-paper with mock AI marking"
          label="Questions"
          avg={descriptiveQuestions.filter((q) => q.chapterId === chapter.id && q.class === subject.class).length}
          href={`${base}/written-practice`}
          testId="open-written-practice"
        />
      </div>
    </>
  );
}
