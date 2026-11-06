import { useSyncExternalStore } from 'react';
import { avatarForSeed } from '../avatar3d/options';
import { DEFAULT_ACADEMIC_YEAR, DEFAULT_CLASS, DEFAULT_SECTION } from '../config/rewards';
import { addDaysKey, toDateKey } from '../lib/dates';
import { allBadges, seedExtras, seedRooms, seedStudents, timetableSeed } from './catalog';
import { clearState, loadState, onExternalChange, saveState } from './storageService';
import type {
  AppNotification,
  AvatarConfig,
  HintRequest,
  PointTransaction,
  QuizAttempt,
  QuizRoom,
  RemediationAttempt,
  RemediationProgress,
  StudentAvatar,
  StudentBadge,
  TimetableEntry,
  TransactionResult,
} from '../types';

/**
 * The single source of truth (SRS 12.4). Balances, ranks and percentages are not
 * stored here: they are derived from the ledger and progress records.
 */
export interface AppState {
  demoStudentId: string;
  studentClass: number;
  studentSection: string;
  academicYear: string;
  /** The day this demo was seeded. Mock exam dates are offsets from it. */
  seedDate: string;
  avatarConfigs: Record<string, AvatarConfig>;
  timetable: TimetableEntry[];
  notifications: AppNotification[];
  transactions: PointTransaction[];
  studentBadges: StudentBadge[];
  studentAvatars: StudentAvatar[];
  quizAttempts: QuizAttempt[];
  hintRequests: HintRequest[];
  rooms: QuizRoom[];
  remediationProgress: RemediationProgress[];
  remediationAttempts: RemediationAttempt[];
  completedVideoIds: string[];
  /** Correct/answered per student, for the leaderboard tie-break. */
  quizStats: Record<string, { correct: number; answered: number }>;
  /** When each student last gained points, for the tie-break. */
  achievedAt: Record<string, string>;
}

export function buildInitialState(): AppState {
  const demo = seedStudents.find((s) => s.isDemoStudent);
  if (!demo) throw new Error('students.json has no demo student');

  const seedDate = toDateKey(new Date());
  const transactions: PointTransaction[] = [];
  const studentBadges: StudentBadge[] = [];
  const avatarConfigs: Record<string, AvatarConfig> = {};
  const quizStats: AppState['quizStats'] = {};
  const achievedAt: AppState['achievedAt'] = {};
  const thresholdBadges = allBadges()
    .filter((b) => b.threshold !== null)
    .sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0));

  for (const s of seedStudents) {
    avatarConfigs[s.id] = avatarForSeed(s);
    quizStats[s.id] = { correct: s.quizCorrect, answered: s.quizAnswered };
    achievedAt[s.id] = s.achievedAt;

    const history = seedExtras.demoHistory.filter((h) => h.studentId === s.id);
    const entries = history.length
      ? history
      : [
          {
            type: 'OPENING_BALANCE',
            coinAmount: s.openingCoins,
            pointsAmount: s.openingPoints,
            reason: 'Opening balance for the demo',
            createdAt: s.achievedAt,
          },
        ];
    entries.forEach((h, i) =>
      transactions.push({
        id: `TXN-SEED-${s.id}-${i + 1}`,
        studentId: s.id,
        type: h.type as PointTransaction['type'],
        coinAmount: h.coinAmount,
        pointsAmount: h.pointsAmount,
        reason: h.reason,
        referenceId: null,
        academicYear: DEFAULT_ACADEMIC_YEAR,
        createdAt: h.createdAt,
        dedupeKey: null,
      }),
    );

    for (const b of thresholdBadges) {
      if (s.openingPoints >= (b.threshold ?? Infinity)) {
        studentBadges.push({ studentId: s.id, badgeId: b.id, earnedAt: s.achievedAt });
      }
    }
    for (const id of s.extraBadgeIds ?? []) {
      studentBadges.push({ studentId: s.id, badgeId: id, earnedAt: s.achievedAt });
    }
  }

  return {
    demoStudentId: demo.id,
    studentClass: DEFAULT_CLASS,
    studentSection: DEFAULT_SECTION,
    academicYear: DEFAULT_ACADEMIC_YEAR,
    seedDate,
    avatarConfigs,
    timetable: timetableSeed.map(({ daysFromSeed, ...entry }) => ({
      ...entry,
      studentId: demo.id,
      date: addDaysKey(seedDate, daysFromSeed),
      done: false,
      createdAt: new Date().toISOString(),
    })),
    notifications: [],
    transactions,
    studentBadges,
    studentAvatars: seedExtras.ownedAvatars.map((a) => ({ ...a })),
    quizAttempts: [],
    hintRequests: [],
    rooms: seedRooms.map((r) => ({ ...r, participants: r.participants.map((p) => ({ ...p })) })),
    remediationProgress: seedExtras.remediationProgress.map((p) => ({ ...p })),
    remediationAttempts: [],
    completedVideoIds: [],
    quizStats,
    achievedAt,
  };
}

let state: AppState = loadState<AppState>() ?? buildInitialState();
let popups: TransactionResult[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

export function updateState(recipe: (s: AppState) => AppState): void {
  state = recipe(state);
  saveState(state);
  notify();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Selector hook. Selectors must return primitives or references that are already in state. */
export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

/** Picks up a save from another tab. */
export function rehydrate(): void {
  state = loadState<AppState>() ?? state;
  notify();
}

export function resetDemo(): void {
  clearState();
  state = buildInitialState();
  saveState(state);
  popups = [];
  notify();
}

if (typeof window !== 'undefined') onExternalChange(rehydrate);

/* Transaction popups are session UI, so they are not persisted. */
export function pushPopup(result: TransactionResult): void {
  popups = [...popups, result];
  notify();
}

export function dismissPopup(): void {
  popups = popups.slice(1);
  notify();
}

export function usePopup(): TransactionResult | null {
  return useSyncExternalStore(subscribe, () => popups[0] ?? null);
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
