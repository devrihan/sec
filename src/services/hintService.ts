import { HINT_COST_COINS, HINT_LATENCY_MS } from '../config/rewards';
import { chapterById, questionById, subjectById } from './catalog';
import { InsufficientCoinsError, spendCoinsForHint } from './pointsService';
import { attemptById } from './quizService';
import { getState, newId, nowIso, pushPopup, updateState, type AppState } from './store';
import { coinsOf } from './studentService';
import type { HintRequest, Question } from '../types';

export interface HintContext {
  questionText: string;
  subject: string;
  chapter: string;
  marks: number;
  hintContext: string;
}

/**
 * The replaceable seam for hints. A real provider must call a server-side proxy;
 * a key must never reach browser code (SRS 12.5). Questions never come from here.
 */
export interface HintProvider {
  label: string;
  getHint(context: HintContext): Promise<string>;
}

export const mockHintProvider: HintProvider = {
  label: 'Demo hints',
  getHint: (context) =>
    new Promise((resolve) => setTimeout(() => resolve(context.hintContext), HINT_LATENCY_MS)),
};

let provider: HintProvider = mockHintProvider;

export function setHintProvider(next: HintProvider): void {
  provider = next;
}

export const hintProviderLabel = () => provider.label;

export const findHint = (s: AppState, attemptId: string, questionId: string): HintRequest | undefined =>
  s.hintRequests.find((h) => h.quizAttemptId === attemptId && h.questionId === questionId);

/** Rejects text that gives the answer away and falls back to the approved seeded context. */
function safeHint(text: string, question: Question): string {
  const correct = question.options.find((o) => o.id === question.correctOptionId)?.text ?? '';
  const trimmed = text.trim();
  // Whole-word match, so short answers such as "Li" or "+3" are caught without
  // flagging every word that happens to contain those letters.
  const escaped = correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const leaks = correct !== '' && new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(trimmed);
  return trimmed && !leaks ? trimmed : question.hintContext;
}

export type HintOutcome =
  | { status: 'shown'; hint: HintRequest }
  | { status: 'insufficient'; needed: number; available: number }
  | { status: 'unavailable' };

const inFlight = new Map<string, Promise<HintOutcome>>();

async function fetchAndCharge(attemptId: string, question: Question): Promise<HintOutcome> {
  const context: HintContext = {
    questionText: question.questionText,
    subject: subjectById(question.subjectId)?.name ?? '',
    chapter: chapterById(question.chapterId)?.title ?? '',
    marks: question.marks,
    hintContext: question.hintContext,
  };

  let text: string;
  try {
    text = safeHint(await provider.getHint(context), question);
  } catch {
    text = question.hintContext;
  }

  const s = getState();
  const attempt = attemptById(s, attemptId);
  if (!attempt) return { status: 'unavailable' };

  try {
    const number = attempt.questionIds.indexOf(question.id) + 1;
    const result = spendCoinsForHint(attempt.studentId, attemptId, question.id, HINT_COST_COINS, number);
    if (!result) {
      const existing = findHint(getState(), attemptId, question.id);
      return existing ? { status: 'shown', hint: existing } : { status: 'unavailable' };
    }
    const hint: HintRequest = {
      id: newId('HINT'),
      studentId: attempt.studentId,
      questionId: question.id,
      quizAttemptId: attemptId,
      coinCost: HINT_COST_COINS,
      hintText: text,
      createdAt: nowIso(),
    };
    updateState((st) => ({ ...st, hintRequests: [...st.hintRequests, hint] }));
    pushPopup(result);
    return { status: 'shown', hint };
  } catch (error) {
    if (error instanceof InsufficientCoinsError) {
      return { status: 'insufficient', needed: error.needed, available: error.available };
    }
    throw error;
  }
}

/**
 * Checks the balance first, so a student who cannot pay never reaches the provider.
 * Charges once per question per attempt. Repeat clicks share one request, and
 * reopening a used hint is free.
 */
export function requestHint(attemptId: string, questionId: string): Promise<HintOutcome> {
  const s = getState();
  const attempt = attemptById(s, attemptId);
  const question = questionById(questionId);
  if (!attempt || !question || attempt.mode !== 'solo' || attempt.completedAt) {
    return Promise.resolve({ status: 'unavailable' });
  }
  if (attempt.answers.some((a) => a.questionId === questionId)) {
    return Promise.resolve({ status: 'unavailable' });
  }

  const existing = findHint(s, attemptId, questionId);
  if (existing) return Promise.resolve({ status: 'shown', hint: existing });

  const key = `${attemptId}:${questionId}`;
  const running = inFlight.get(key);
  if (running) return running;

  const available = coinsOf(s, attempt.studentId);
  if (available < HINT_COST_COINS) {
    return Promise.resolve({ status: 'insufficient', needed: HINT_COST_COINS, available });
  }

  const work = fetchAndCharge(attemptId, question).finally(() => inFlight.delete(key));
  inFlight.set(key, work);
  return work;
}
