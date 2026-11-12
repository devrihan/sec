import { fixChecks } from './catalog';
import { updateState, type AppState } from './store';
import type { FixCheck, FixMarking, FixResponse, MistakeRetry, NumericPart, TwinQuestion } from '../types';

/**
 * A fix check proves a mistake is fixed: the original question is re-asked before its answer is shown,
 * then twin questions on the same concept and in the same format are marked in the chapter check.
 */

/** A written item or a twin counts as fixed at this share of the marks, the same bar as the chapter pass mark. */
export const FIXED_AT = 0.75;
/** Twins asked per mistake on each attempt; they rotate through the three written for it. */
export const TWINS_PER_MISTAKE = 2;
/** MCQs added after the twins. */
export const MCQ_TOP_UP = 2;

export const fixCheckFor = (errorId: string): FixCheck | undefined => fixChecks.find((f) => f.errorId === errorId);

export function twinById(twinId: string): { twin: TwinQuestion; errorId: string } | undefined {
  for (const f of fixChecks) {
    const twin = f.twins.find((t) => t.id === twinId);
    if (twin) return { twin, errorId: f.errorId };
  }
  return undefined;
}

const SUPERSCRIPT: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };

/**
 * Reads what a student typed: 0.6, −212.3, 1,250, 1.8e-4, 1.8 × 10^-4, 1.8 x 10⁻⁴ or a fraction like 60/7.
 * Returns null for anything that isn't a number.
 */
export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/[−–—]/g, '-').replace(/,/g, '').replace(/\s+/g, '');
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, (c) => SUPERSCRIPT[c]);
  if (!s) return null;
  const sci = s.match(/^([+-]?\d*\.?\d+)[x×*]10\^?([+-]?\d+)$/i);
  if (sci) return Number(sci[1]) * 10 ** Number(sci[2]);
  const frac = s.match(/^([+-]?\d*\.?\d+)\/([+-]?\d*\.?\d+)$/);
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2]);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  return Number(s);
}

/** Within 2% (rounding), and never a wrong sign: a sign slip must not pass. */
export function numberMatches(given: number, answer: number): boolean {
  if (answer === 0) return Math.abs(given) <= 0.005;
  if (Math.sign(given) !== Math.sign(answer)) return false;
  return Math.abs(given - answer) <= Math.abs(answer) * 0.02;
}

export function partResults(parts: NumericPart[], values: string[] = []): boolean[] {
  return parts.map((p, i) => {
    const n = parseNumber(values[i] ?? '');
    return n !== null && numberMatches(n, p.answer);
  });
}

/** Marks one response: numeric needs every part right; written earns the share of marking points ticked. */
export function scoreResponse(marking: FixMarking, response: FixResponse | undefined): number {
  if (!response) return 0;
  if (marking.kind === 'numeric') return partResults(marking.parts, response.values).every(Boolean) ? 1 : 0;
  if (!response.marked) return 0;
  return (response.ticked?.length ?? 0) / marking.keyPoints.length;
}

/** Whether the student has done enough to move on: every number filled in, or the written answer self-marked. */
export function isAnswered(marking: FixMarking, response: FixResponse | undefined): boolean {
  if (!response) return false;
  if (marking.kind === 'numeric') return marking.parts.every((_, i) => (response.values?.[i] ?? '').trim() !== '');
  return Boolean(response.marked);
}

/** Three twins per mistake; attempt n uses twins n and n+1 (mod 3), so every retry differs from the last. */
export function twinsForAttempt(check: FixCheck, attemptNumber: number): TwinQuestion[] {
  const n = check.twins.length;
  const count = Math.min(TWINS_PER_MISTAKE, n);
  return Array.from({ length: count }, (_, i) => check.twins[(attemptNumber + i) % n]);
}

export const mistakeRetries = (s: AppState): Record<string, MistakeRetry> => s.mistakeRetries ?? {};

export const retryFor = (s: AppState, errorId: string): MistakeRetry | undefined => mistakeRetries(s)[errorId];

/** Records the re-ask of an original exam question. A null response means "show me the answer". */
export function recordRetry(errorId: string, response: FixResponse | null): MistakeRetry | null {
  const check = fixCheckFor(errorId);
  if (!check) return null;
  const retry: MistakeRetry = {
    errorId,
    score: response ? scoreResponse(check.retry, response) : null,
    response,
    at: new Date().toISOString(),
  };
  updateState((s) => ({ ...s, mistakeRetries: { ...mistakeRetries(s), [errorId]: retry } }));
  return retry;
}
