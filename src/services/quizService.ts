import { FLASHCARD_QUESTION_COUNT } from '../config/rewards';
import { chapterById, questionById } from './catalog';
import { awardQuizReward } from './pointsService';
import { questionsForChapter, shuffled } from './questionService';
import { getState, newId, nowIso, pushPopup, updateState, type AppState } from './store';
import type { QuizAnswer, QuizAttempt, QuizMode } from '../types';

export const attemptById = (s: AppState, id: string) => s.quizAttempts.find((a) => a.id === id);

export function unfinishedAttempt(s: AppState, chapterId: string): QuizAttempt | undefined {
  return s.quizAttempts.find(
    (a) => a.studentId === s.demoStudentId && a.chapterId === chapterId && a.mode === 'solo' && !a.completedAt,
  );
}

export function createAttempt(
  mode: QuizMode,
  subjectId: string,
  chapterId: string,
  questionIds: string[],
  roomId: string | null,
): QuizAttempt {
  const attempt: QuizAttempt = {
    id: newId('QA'),
    studentId: getState().demoStudentId,
    mode,
    subjectId,
    chapterId,
    questionIds,
    answers: [],
    score: 0,
    startedAt: nowIso(),
    completedAt: null,
    rewardClaimed: false,
    roomId,
  };
  updateState((s) => ({ ...s, quizAttempts: [...s.quizAttempts, attempt] }));
  return attempt;
}

/** Uses the available count when a chapter has fewer questions; never duplicates (SRS 6.3). */
export function startQuiz(subjectId: string, chapterId: string): QuizAttempt | null {
  const pool = questionsForChapter(chapterId);
  if (pool.length === 0) return null;
  const ids = shuffled(pool)
    .slice(0, FLASHCARD_QUESTION_COUNT)
    .map((q) => q.id);
  return createAttempt('solo', subjectId, chapterId, ids, null);
}

/** Refuses a second answer, so a submitted answer cannot be changed. */
export function submitAnswer(attemptId: string, questionId: string, optionId: string): QuizAnswer | null {
  const attempt = attemptById(getState(), attemptId);
  const question = questionById(questionId);
  if (!attempt || !question || attempt.completedAt) return null;
  if (!attempt.questionIds.includes(questionId)) return null;
  const existing = attempt.answers.find((a) => a.questionId === questionId);
  if (existing) return existing;
  if (!question.options.some((o) => o.id === optionId)) return null;

  const answer: QuizAnswer = {
    questionId,
    selectedOptionId: optionId,
    correct: optionId === question.correctOptionId,
  };
  patchAttempt(attemptId, (a) => ({ ...a, answers: [...a.answers, answer] }));
  return answer;
}

export function patchAttempt(id: string, recipe: (a: QuizAttempt) => QuizAttempt): void {
  updateState((s) => ({
    ...s,
    quizAttempts: s.quizAttempts.map((a) => (a.id === id ? recipe(a) : a)),
  }));
}

/** Seals the attempt and adds to the tie-break tally. Safe to call twice. */
export function sealAttempt(attemptId: string): QuizAttempt | null {
  const attempt = attemptById(getState(), attemptId);
  if (!attempt) return null;
  if (attempt.completedAt) return attempt;
  if (attempt.answers.length < attempt.questionIds.length) return null;

  const score = attempt.answers.filter((a) => a.correct).length;
  patchAttempt(attemptId, (a) => ({ ...a, score, completedAt: nowIso() }));
  updateState((s) => {
    const stat = s.quizStats[attempt.studentId] ?? { correct: 0, answered: 0 };
    return {
      ...s,
      quizStats: {
        ...s.quizStats,
        [attempt.studentId]: {
          correct: stat.correct + score,
          answered: stat.answered + attempt.questionIds.length,
        },
      },
    };
  });
  return attemptById(getState(), attemptId) ?? null;
}

/** The only place a solo reward is granted, and only once all questions are answered (SRS 6.7). */
export function completeQuiz(attemptId: string): QuizAttempt | null {
  const attempt = sealAttempt(attemptId);
  if (!attempt) return null;
  if (attempt.mode === 'solo' && !attempt.rewardClaimed) {
    const title = chapterById(attempt.chapterId)?.title ?? 'chapter';
    const result = awardQuizReward(
      attempt.studentId,
      attempt.id,
      attempt.score,
      attempt.questionIds.length,
      title,
    );
    patchAttempt(attemptId, (a) => ({ ...a, rewardClaimed: true }));
    if (result) pushPopup(result);
  }
  return attemptById(getState(), attemptId) ?? null;
}

export function accuracyPercent(attempt: QuizAttempt): number {
  const total = attempt.questionIds.length;
  return total === 0 ? 0 : Math.round((attempt.score / total) * 1000) / 10;
}

export function marksOf(attempt: QuizAttempt) {
  const marks = (id: string) => questionById(id)?.marks ?? 0;
  return {
    earned: attempt.answers.filter((a) => a.correct).reduce((sum, a) => sum + marks(a.questionId), 0),
    total: attempt.questionIds.reduce((sum, id) => sum + marks(id), 0),
  };
}
