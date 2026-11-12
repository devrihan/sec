import {
  BADGE_THRESHOLDS,
  MULTIPLAYER_REWARD,
  QUIZ_REWARD,
  REMEDIATION_COMPLETION_REWARD,
  TEAM_BATTLE_REWARD,
} from '../config/rewards';
import { allBadges, avatarById, seedStudentById } from './catalog';
import { getLeaderboard, rankOf } from './leaderboardService';
import { pushNotification } from './notificationStore';
import { getState, newId, nowIso, pushPopup, updateState, type AppState } from './store';
import { badgesOf, coinsOf, earnedPointsOf, ownsAvatar } from './studentService';
import type { Badge, PointTransaction, StudentBadge, TransactionResult, TransactionType } from '../types';

/**
 * The one place balances change (SRS 4.1). Every module calls these functions, so
 * coins, points, badges and the duplicate guard behave the same everywhere.
 */

export class InsufficientCoinsError extends Error {
  constructor(
    public needed: number,
    public available: number,
  ) {
    super(`Needs ${needed} coins, ${available} available`);
  }
}

interface TransactionInput {
  studentId: string;
  type: TransactionType;
  coinAmount: number;
  pointsAmount: number;
  reason: string;
  referenceId: string | null;
  dedupeKey: string | null;
  /** Earned alongside this transaction, such as Remediation Finisher. */
  achievementBadgeId?: string;
  /** More than one achievement in the same transaction, such as Team Victory and Dream Team. */
  achievementBadgeIds?: string[];
}

function thresholdBadgesReached(s: AppState, studentId: string, newPoints: number): Badge[] {
  const owned = new Set(badgesOf(s, studentId).map((b) => b.badgeId));
  return allBadges()
    .filter((b) => b.threshold !== null && newPoints >= b.threshold && !owned.has(b.id))
    .sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0));
}

/** Returns null if this event was already recorded, so refreshes and double clicks are harmless. */
export function applyTransaction(input: TransactionInput): TransactionResult | null {
  const before = getState();
  if (input.dedupeKey && before.transactions.some((t) => t.dedupeKey === input.dedupeKey)) return null;

  const previousCoins = coinsOf(before, input.studentId);
  const previousPoints = earnedPointsOf(before, input.studentId);
  if (input.coinAmount < 0 && previousCoins + input.coinAmount < 0) {
    throw new InsufficientCoinsError(-input.coinAmount, previousCoins);
  }

  const createdAt = nowIso();
  const transaction: PointTransaction = {
    id: newId('TXN'),
    studentId: input.studentId,
    type: input.type,
    coinAmount: input.coinAmount,
    pointsAmount: input.pointsAmount,
    reason: input.reason,
    referenceId: input.referenceId,
    academicYear: before.academicYear,
    createdAt,
    dedupeKey: input.dedupeKey,
  };

  const newPoints = previousPoints + input.pointsAmount;
  const previousRank = rankOf(before, input.studentId);

  // Achievements go first so a threshold crossed in the same transaction ends up as the latest badge.
  const owned = new Set(badgesOf(before, input.studentId).map((b) => b.badgeId));
  const wanted = [...(input.achievementBadgeId ? [input.achievementBadgeId] : []), ...(input.achievementBadgeIds ?? [])];
  const achievement = allBadges().filter((b) => wanted.includes(b.id) && !owned.has(b.id));
  const newBadges = [...achievement, ...thresholdBadgesReached(before, input.studentId, newPoints)];
  const newStudentBadges: StudentBadge[] = newBadges.map((b) => ({
    studentId: input.studentId,
    badgeId: b.id,
    earnedAt: createdAt,
  }));

  updateState((s) => ({
    ...s,
    transactions: [...s.transactions, transaction],
    studentBadges: [...s.studentBadges, ...newStudentBadges],
    achievedAt: input.pointsAmount > 0 ? { ...s.achievedAt, [input.studentId]: createdAt } : s.achievedAt,
  }));

  const after = getState();
  notifyAbout(before, transaction, newBadges);
  return {
    transaction,
    previousCoins,
    newCoins: coinsOf(after, input.studentId),
    previousPoints,
    newPoints: earnedPointsOf(after, input.studentId),
    previousRank,
    newRank: rankOf(after, input.studentId),
    newBadges,
  };
}

const REWARD_TYPES: TransactionType[] = ['QUIZ_REWARD', 'MULTIPLAYER_REWARD', 'TEAM_BATTLE_REWARD', 'REMEDIATION_REWARD'];

/** Badges, rewards and overtakes all come from real ledger changes. */
function notifyAbout(before: AppState, t: PointTransaction, badges: Badge[]): void {
  const me = before.demoStudentId;
  if (t.studentId === me) {
    for (const b of badges) {
      pushNotification({
        type: 'achievement',
        title: 'Achievement unlocked!',
        body: `You've earned the ${b.name} badge.`,
        href: '/profile',
        dedupeKey: `badge:${b.id}:${t.id}`,
      });
    }
    if (REWARD_TYPES.includes(t.type)) {
      pushNotification({
        type: 'achievement',
        title: `+${t.coinAmount} coins earned`,
        body: `${t.reason}. Spend them in the avatar store!`,
        href: '/avatars',
        dedupeKey: `reward:${t.id}`,
      });
    }
    return;
  }

  const rowsBefore = getLeaderboard(before);
  const rowsAfter = getLeaderboard(getState());
  const rank = (rows: typeof rowsAfter, id: string) => rows.find((r) => r.studentId === id)?.rank ?? 0;
  const wasBehind = rank(rowsBefore, t.studentId) > rank(rowsBefore, me);
  const isAhead = rank(rowsAfter, t.studentId) > 0 && rank(rowsAfter, t.studentId) < rank(rowsAfter, me);
  if (wasBehind && isAhead) {
    pushNotification({
      type: 'leaderboard',
      title: "You've been overtaken!",
      body: `${seedStudentById(t.studentId)?.name} has moved ahead of you on the leaderboard. Complete a flashcard challenge to earn more points!`,
      href: '/flashcards',
      dedupeKey: `overtaken:${t.id}`,
      announce: true,
    });
  }
}

export function calculateQuizReward(correct: number) {
  return {
    coins: QUIZ_REWARD.baseCoins + QUIZ_REWARD.coinsPerCorrect * correct,
    points: QUIZ_REWARD.basePoints + QUIZ_REWARD.pointsPerCorrect * correct,
  };
}

export function calculateMultiplayerReward(correct: number, won: boolean) {
  return {
    coins:
      MULTIPLAYER_REWARD.baseCoins +
      MULTIPLAYER_REWARD.coinsPerCorrect * correct +
      (won ? MULTIPLAYER_REWARD.winnerBonusCoins : 0),
    points:
      MULTIPLAYER_REWARD.basePoints +
      MULTIPLAYER_REWARD.pointsPerCorrect * correct +
      (won ? MULTIPLAYER_REWARD.winnerBonusPoints : 0),
  };
}

export function awardQuizReward(
  studentId: string,
  attemptId: string,
  correct: number,
  total: number,
  chapterTitle: string,
): TransactionResult | null {
  const { coins, points } = calculateQuizReward(correct);
  return applyTransaction({
    studentId,
    type: 'QUIZ_REWARD',
    coinAmount: coins,
    pointsAmount: points,
    reason: `Completed the ${chapterTitle} quiz (${correct}/${total} correct)`,
    referenceId: attemptId,
    dedupeKey: `quiz:${attemptId}`,
    achievementBadgeId: total > 0 && correct === total ? 'quiz-champion' : undefined,
  });
}

export function awardMultiplayerReward(
  studentId: string,
  roomId: string,
  correct: number,
  won: boolean,
  chapterTitle: string,
): TransactionResult | null {
  const { coins, points } = calculateMultiplayerReward(correct, won);
  return applyTransaction({
    studentId,
    type: 'MULTIPLAYER_REWARD',
    coinAmount: coins,
    pointsAmount: points,
    reason: `Finished the ${chapterTitle} room quiz${won ? ' in first place' : ''}`,
    referenceId: roomId,
    dedupeKey: `room:${roomId}:${studentId}`,
  });
}

export type BattleOutcome = 'won' | 'draw' | 'lost';

/** Every member of a team gets the same reward: their team's marks, plus a win or draw bonus. */
export function calculateTeamBattleReward(marks: number, outcome: BattleOutcome) {
  const r = TEAM_BATTLE_REWARD;
  return {
    coins: r.baseCoins + r.coinsPerMark * marks + (outcome === 'won' ? r.winBonusCoins : outcome === 'draw' ? r.drawBonusCoins : 0),
    points: r.basePoints + r.pointsPerMark * marks + (outcome === 'won' ? r.winBonusPoints : outcome === 'draw' ? r.drawBonusPoints : 0),
  };
}

export function awardTeamBattleReward(
  studentId: string,
  battleId: string,
  teamName: string,
  marks: number,
  outcome: BattleOutcome,
  badgeIds: string[],
): TransactionResult | null {
  const { coins, points } = calculateTeamBattleReward(marks, outcome);
  const how = outcome === 'won' ? 'won' : outcome === 'draw' ? 'drew' : 'played';
  return applyTransaction({
    studentId,
    type: 'TEAM_BATTLE_REWARD',
    coinAmount: coins,
    pointsAmount: points,
    reason: `${teamName} ${how} a team battle (${marks} marks)`,
    referenceId: battleId,
    dedupeKey: `battle:${battleId}:${studentId}`,
    achievementBadgeIds: badgeIds,
  });
}

export function spendCoinsForHint(
  studentId: string,
  attemptId: string,
  questionId: string,
  cost: number,
  questionNumber: number,
): TransactionResult | null {
  return applyTransaction({
    studentId,
    type: 'HINT_PURCHASE',
    coinAmount: -cost,
    pointsAmount: 0,
    reason: `Hint for question ${questionNumber}`,
    referenceId: questionId,
    dedupeKey: `hint:${attemptId}:${questionId}`,
  });
}

export type PurchaseOutcome =
  | { ok: true; result: TransactionResult }
  | { ok: false; reason: 'insufficient' | 'owned' | 'unavailable' };

export function purchaseAvatar(avatarId: string): PurchaseOutcome {
  const s = getState();
  const studentId = s.demoStudentId;
  const avatar = avatarById(avatarId);
  if (!avatar || !avatar.isAvailable) return { ok: false, reason: 'unavailable' };
  if (ownsAvatar(s, studentId, avatarId)) return { ok: false, reason: 'owned' };
  if (coinsOf(s, studentId) < avatar.price) return { ok: false, reason: 'insufficient' };

  const result = applyTransaction({
    studentId,
    type: 'AVATAR_PURCHASE',
    coinAmount: -avatar.price,
    pointsAmount: 0,
    reason: `Bought the ${avatar.name} avatar`,
    referenceId: avatarId,
    dedupeKey: `avatar:${studentId}:${avatarId}`,
  });
  if (!result) return { ok: false, reason: 'owned' };

  updateState((st) => ({
    ...st,
    studentAvatars: [...st.studentAvatars, { studentId, avatarId, purchasedAt: nowIso() }],
  }));
  pushPopup(result);
  return { ok: true, result };
}

export function completeRemediationSubject(
  studentId: string,
  examId: string,
  subjectId: string,
  label: string,
): TransactionResult | null {
  return applyTransaction({
    studentId,
    type: 'REMEDIATION_REWARD',
    coinAmount: REMEDIATION_COMPLETION_REWARD.coins,
    pointsAmount: REMEDIATION_COMPLETION_REWARD.points,
    reason: `Finished ${label} remediation`,
    referenceId: `${examId}:${subjectId}`,
    dedupeKey: `remediation:${studentId}:${examId}:${subjectId}`,
    achievementBadgeId: 'remediation-finisher',
  });
}

/** Demo settings only. The next student below moves ahead through the normal ledger. */
export function simulateClassmateOvertake(): string | null {
  const rows = getLeaderboard();
  const i = rows.findIndex((r) => r.isCurrent);
  const rival = rows[i + 1];
  if (!rival) return null;
  applyTransaction({
    studentId: rival.studentId,
    type: 'QUIZ_REWARD',
    coinAmount: 0,
    pointsAmount: rows[i].totalEarnedPoints - rival.totalEarnedPoints + 30,
    reason: 'Classmate activity (demo)',
    referenceId: null,
    dedupeKey: null,
  });
  return rival.name;
}

/** Demo settings only. Lets a presenter stage the low-balance scenario. */
export function setDemoCoins(target: number): void {
  const s = getState();
  const id = s.demoStudentId;
  const delta = Math.max(0, Math.floor(target)) - coinsOf(s, id);
  if (delta === 0) return;
  applyTransaction({
    studentId: id,
    type: 'DEMO_ADJUSTMENT',
    coinAmount: delta,
    pointsAmount: 0,
    reason: 'Coins set from demo settings',
    referenceId: null,
    dedupeKey: null,
  });
}

/** Demo settings only. Also drops threshold badges above the new total, so crossing them can be shown. */
export function setDemoPoints(target: number): void {
  const s = getState();
  const id = s.demoStudentId;
  const points = Math.max(0, Math.floor(target));
  const delta = points - earnedPointsOf(s, id);
  if (delta === 0) return;
  updateState((st) => ({
    ...st,
    studentBadges: st.studentBadges.filter(
      (b) => b.studentId !== id || !(BADGE_THRESHOLDS[b.badgeId] > points),
    ),
  }));
  applyTransaction({
    studentId: id,
    type: 'DEMO_ADJUSTMENT',
    coinAmount: 0,
    pointsAmount: delta,
    reason: 'Points set from demo settings',
    referenceId: null,
    dedupeKey: null,
  });
}
