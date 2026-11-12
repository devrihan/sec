import { addDaysKey, toDateKey } from '../lib/dates';
import { mistakeFixes } from './catalog';
import { myErrors } from './remediationService';
import { updateState, type AppState } from './store';
import type { FormulaCard, FormulaReview, MistakeFix, StudentError } from '../types';

/**
 * Each kind of mistake gets its own fix: re-learn a concept, drill a formula on a schedule,
 * build a checking habit for slips, or learn what full marks needs for incomplete answers.
 */

export type FixRoute = 'relearn' | 'formula' | 'slip' | 'scheme';

const ROUTES: Record<string, FixRoute> = {
  Conceptual: 'relearn',
  'Formula recall': 'formula',
  'Sign error': 'slip',
  'Unit error': 'slip',
  Calculation: 'slip',
  'Incomplete answer': 'scheme',
  'Misread question': 'scheme',
};

export const routeOf = (errorType: string): FixRoute => ROUTES[errorType] ?? 'relearn';

export const mistakeFixFor = (errorId: string): MistakeFix | undefined => mistakeFixes.find((f) => f.errorId === errorId);

/** The checklist to run before submitting an answer, for slips only. */
export const checklistFor = (errorId: string): string[] => mistakeFixFor(errorId)?.checklist ?? [];

// ---- Formula cards: spaced repetition ----

/** Days until the next review after a "got it" from each box. Forgetting a card sends it back to box 0. */
export const INTERVALS = [1, 3, 7, 16, 30];
const LAST_BOX = INTERVALS.length - 1;

export interface FormulaItem {
  card: FormulaCard;
  error: StudentError;
  review: FormulaReview | undefined;
  /** New cards are due straight away. */
  due: string;
}

export const formulaReviews = (s: AppState): Record<string, FormulaReview> => s.formulaReviews ?? {};

/** Every formula card from this student's formula-recall mistakes, with its schedule. */
export function formulaItems(s: AppState, today: string = toDateKey(new Date())): FormulaItem[] {
  const reviews = formulaReviews(s);
  return myErrors(s).flatMap((error) =>
    (mistakeFixFor(error.id)?.formulaCards ?? []).map((card) => {
      const review = reviews[card.id];
      return { card, error, review, due: review?.due ?? today };
    }),
  );
}

export const dueFormulaItems = (s: AppState, today: string = toDateKey(new Date())) =>
  formulaItems(s, today).filter((i) => i.due <= today);

/** The next date any formula card comes due, after today. */
export function nextFormulaDate(s: AppState, today: string = toDateKey(new Date())): string | null {
  const later = formulaItems(s, today).map((i) => i.due).filter((d) => d > today).sort();
  return later[0] ?? null;
}

/** "Got it" spaces the card out by its box; "forgot" sends it back to box 0, due again today. */
export function scheduleReview(previous: FormulaReview | undefined, remembered: boolean, today: string, now = new Date().toISOString()): FormulaReview {
  if (!remembered) return { box: 0, due: today, reviewedAt: now };
  const box = previous ? previous.box : 0;
  return { box: Math.min(box + 1, LAST_BOX), due: addDaysKey(today, INTERVALS[box]), reviewedAt: now };
}

export function reviewFormula(cardId: string, remembered: boolean, today: string = toDateKey(new Date())): FormulaReview {
  let next: FormulaReview | undefined;
  updateState((s) => {
    next = scheduleReview(formulaReviews(s)[cardId], remembered, today);
    return { ...s, formulaReviews: { ...formulaReviews(s), [cardId]: next } };
  });
  return next as FormulaReview;
}

// ---- Incomplete answers: the marking scheme ----

export function schemeSummary(fix: MistakeFix | undefined) {
  const steps = fix?.scheme ?? [];
  const total = steps.reduce((sum, s) => sum + s.marks, 0);
  const missing = steps.filter((s) => !s.inExam);
  return { steps, total, missing, missingMarks: missing.reduce((sum, s) => sum + s.marks, 0) };
}
