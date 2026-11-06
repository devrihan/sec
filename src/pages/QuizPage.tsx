import { Lightbulb } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { BackLink, NotFoundState, WHITE_PANEL } from '../components/page-parts';
import { OptionList } from '../components/QuestionCard';
import { HINT_COST_COINS } from '../config/rewards';
import { chapterById, questionById, subjectById } from '../services/catalog';
import { findHint, hintProviderLabel, requestHint } from '../services/hintService';
import { attemptById, completeQuiz, submitAnswer } from '../services/quizService';
import { finishRoom } from '../services/roomService';
import { useAppState } from '../services/store';
import { useCoins } from '../services/studentService';

export function QuizPage() {
  const { attemptId = '' } = useParams();
  const navigate = useNavigate();
  const attempt = useAppState((s) => attemptById(s, attemptId));
  const [index, setIndex] = useState(() => {
    if (!attempt) return 0;
    return Math.min(attempt.answers.length, attempt.questionIds.length - 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const questionId = attempt?.questionIds[index] ?? '';
  const answer = attempt?.answers.find((a) => a.questionId === questionId);
  const submitted = Boolean(answer);

  useEffect(() => {
    if (submitted) nextRef.current?.focus();
  }, [submitted]);

  if (!attempt) return <NotFoundState message="This quiz attempt doesn't exist. It may have been cleared by a demo reset." />;
  if (attempt.completedAt) {
    const results = attempt.roomId ? `/flashcards/rooms/${attempt.roomId}/results` : `/flashcards/results/${attempt.id}`;
    return <Navigate to={results} replace />;
  }

  const question = questionById(questionId);
  if (!question) return <NotFoundState message="This question is missing from the question bank." />;

  const backTo = attempt.mode === 'solo' ? `/flashcards/${attempt.subjectId}/${attempt.chapterId}` : '/flashcards/rooms';
  const total = attempt.questionIds.length;
  const isLast = index === total - 1;
  const chosen = answer?.selectedOptionId ?? selected;
  const chapter = chapterById(attempt.chapterId);

  const finish = () => {
    if (attempt.mode === 'solo') {
      completeQuiz(attempt.id);
      navigate(`/flashcards/results/${attempt.id}`, { replace: true });
    } else {
      const room = finishRoom(attempt.id);
      navigate(room ? `/flashcards/rooms/${room.id}/results` : '/flashcards/rooms', { replace: true });
    }
  };

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      <BackLink to={backTo}>Flashcards</BackLink>
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.132px] text-foreground">{chapter?.title}</h1>
        <p className="text-[16px] leading-6 text-muted-foreground">{subjectById(attempt.subjectId)?.name}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground tabular-nums" data-testid="quiz-progress">
          Question {String(index + 1).padStart(2, '0')} of {total}
        </span>
        <Badge variant="secondary">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</Badge>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {attempt.questionIds.map((id, i) => {
          const a = attempt.answers.find((x) => x.questionId === id);
          return (
            <span
              key={id}
              className={cn(
                'h-1.5 flex-1 rounded-[2px]',
                a ? (a.correct ? 'bg-[var(--inferentics-brand-primary)]' : 'bg-[#e76e4f]') : i === index ? 'bg-primary' : 'bg-secondary',
              )}
            />
          );
        })}
      </div>

      <div className={`flip${submitted ? ' is-flipped' : ''}`}>
        <div className="flip-inner">
          <section className={`flip-face flip-front ${WHITE_PANEL}`} aria-hidden={submitted}>
            <p className="mb-1 text-[12px] leading-4 font-medium tracking-[-0.072px] text-muted-foreground">Question</p>
            <p className="mb-4 text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground" data-testid="question-text">{question.questionText}</p>
            <OptionList question={question} selectedId={chosen} disabled={submitted} onSelect={setSelected} name={`q-${question.id}`} />
            {attempt.mode === 'solo' && !submitted && <HintControl key={question.id} attemptId={attempt.id} questionId={question.id} />}
          </section>
          <section className={`flip-face flip-back ${WHITE_PANEL}`} aria-hidden={!submitted} data-testid="feedback">
            <p role="status" className={cn('verdict mb-1 text-[20px] leading-7 font-semibold tracking-[-0.12px]', answer?.correct ? 'text-[#008a2e]' : 'text-[#e60000]')}>
              {submitted ? (answer?.correct ? 'Correct' : 'Incorrect') : ''}
            </p>
            <p className="mb-4 text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground">{question.questionText}</p>
            {submitted && <OptionList question={question} selectedId={chosen} revealed name={`r-${question.id}`} />}
            {question.explanation && submitted && (
              <p className="mt-4 text-[16px] leading-6 text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{question.explanation}</p>
            )}
          </section>
        </div>
      </div>

      <div className="flex justify-end">
        {!submitted ? (
          <Button disabled={!selected} onClick={() => { if (selected) submitAnswer(attempt.id, question.id, selected); }}>Submit answer</Button>
        ) : isLast ? (
          <Button ref={nextRef} onClick={finish}>Finish quiz</Button>
        ) : (
          <Button ref={nextRef} onClick={() => { setSelected(null); setIndex(index + 1); }}>Next question</Button>
        )}
      </div>
    </div>
  );
}

function HintControl({ attemptId, questionId }: { attemptId: string; questionId: string }) {
  const coins = useCoins();
  const hint = useAppState((s) => findHint(s, attemptId, questionId));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (hint) {
    return (
      <div className="mt-4 rounded-lg border border-[#ad4e00]/20 bg-[#fffcf0] px-4 py-3" data-testid="hint-text">
        <p className="text-[14px] leading-5 text-foreground">{hint.hintText}</p>
        <p className="mt-1 text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">Hint used for {hint.coinCost} coins. {hintProviderLabel()}.</p>
      </div>
    );
  }

  const ask = async () => {
    setLoading(true);
    const outcome = await requestHint(attemptId, questionId);
    setLoading(false);
    if (outcome.status === 'insufficient') {
      setMessage(`Hints cost ${outcome.needed} coins and you have ${outcome.available}. Finish a quiz to earn more.`);
    } else if (outcome.status === 'unavailable') {
      setMessage("A hint isn't available for this question.");
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        aria-busy={loading}
        onClick={ask}
        data-testid="hint-button"
        className={coins < HINT_COST_COINS ? 'border-dashed text-muted-foreground' : undefined}
      >
        {loading ? <Spinner className="size-4" /> : <Lightbulb className="size-4" />}
        {loading ? 'Getting your hint' : `Get hint · ${HINT_COST_COINS} coins`}
      </Button>
      {message && <p role="alert" data-testid="hint-message" className="text-[14px] leading-5 text-[#e60000]">{message}</p>}
    </div>
  );
}
