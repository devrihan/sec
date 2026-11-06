import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { BackLink, HERO_CTA, NotFoundState, PageTitle, WHITE_PANEL } from '../components/page-parts';
import { FLASHCARD_QUESTION_COUNT, HINT_COST_COINS } from '../config/rewards';
import { chapterById, subjectById } from '../services/catalog';
import { questionsForChapter } from '../services/questionService';
import { startQuiz, unfinishedAttempt } from '../services/quizService';
import { useAppState } from '../services/store';

function Fact({ label, value, testId }: { label: string; value: string | number; testId?: string }) {
  return (
    <div>
      <dt className="text-[14px] leading-5 text-muted-foreground">{label}</dt>
      <dd className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px] text-foreground tabular-nums" data-testid={testId}>{value}</dd>
    </div>
  );
}

export function QuizIntroPage() {
  const { subjectId = '', chapterId = '' } = useParams();
  const navigate = useNavigate();
  const subject = subjectById(subjectId);
  const chapter = chapterById(chapterId);
  const unfinished = useAppState((s) => unfinishedAttempt(s, chapterId));
  if (!subject || !chapter) return <NotFoundState message="This chapter doesn't exist." />;

  const pool = questionsForChapter(chapter.id);
  const count = Math.min(FLASHCARD_QUESTION_COUNT, pool.length);
  const mix = [...new Set(pool.map((q) => q.marks))].sort((a, b) => a - b);

  return (
    <>
      <BackLink to={`/flashcards/${subject.id}`}>{subject.name} chapters</BackLink>
      <PageTitle title={chapter.title} sub={`${subject.name} quiz`} />
      {pool.length === 0 ? (
        <EmptyState variant="page" title="No questions for this chapter yet" />
      ) : (
        <section className={`${WHITE_PANEL} space-y-6`}>
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <Fact label="Questions" value={count} testId="quiz-count" />
            <Fact label="Marks mix" value={`${mix.join(', ')}`} />
            <Fact label="Hint cost" value={`${HINT_COST_COINS} coins`} />
          </dl>
          <ul className="list-disc space-y-1 pl-5 text-[16px] leading-6 text-muted-foreground">
            <li>Answer one question at a time. An answer can't be changed once submitted.</li>
            <li>Coins and points are added only after you finish every question.</li>
            <li>A hint is charged once per question.</li>
            {pool.length < FLASHCARD_QUESTION_COUNT && <li>This chapter has {pool.length} questions available right now.</li>}
          </ul>
          {unfinished ? (
            <Button asChild size="lg" className={HERO_CTA}>
              <Link to={`/flashcards/quiz/${unfinished.id}`}>Resume quiz ({unfinished.answers.length} of {unfinished.questionIds.length} answered)</Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className={HERO_CTA}
              onClick={() => {
                const attempt = startQuiz(subject.id, chapter.id);
                if (attempt) navigate(`/flashcards/quiz/${attempt.id}`);
              }}
            >
              Start quiz
            </Button>
          )}
        </section>
      )}
    </>
  );
}
