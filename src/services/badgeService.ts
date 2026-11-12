import { BADGE_MARK_GOALS, BADGE_STREAK_GOALS, PLAN_KEEPER_SESSIONS } from '../config/rewards';
import { allBadges, marksLost, studentErrors } from './catalog';
import { getLeaderboard } from './leaderboardService';
import { pushNotification } from './notificationStore';
import { getState, nowIso, updateState, type AppState } from './store';
import { badgesOf, earnedPointsOf } from './studentService';
import type { Badge, StudentBadge } from '../types';

/**
 * Learning badges are worked out from what the student really did, never stored as counters.
 * Point milestones, Quiz Champion and Remediation Finisher are still awarded by the ledger.
 */

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The longest run of consecutive days among these timestamps. */
export function longestStreak(timestamps: string[]): number {
  const days = [...new Set(timestamps.map(dayKey))].sort().map((d) => Date.parse(`${d}T12:00:00Z`));
  let best = days.length > 0 ? 1 : 0;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = Math.round((days[i] - days[i - 1]) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

function learningStats(s: AppState, studentId: string) {
  const progress = s.remediationProgress.filter((p) => p.studentId === studentId);
  const completed = progress.filter((p) => p.status === 'completed');
  const marksFixed = studentErrors
    .filter((e) => e.studentId === studentId && completed.some((p) => p.examId === e.examId && p.chapterId === e.chapterId))
    .reduce((sum, e) => sum + marksLost(e), 0);

  const attemptsByProgress = progress.map((p) =>
    s.remediationAttempts.filter((a) => a.progressId === p.id && a.submittedAt),
  );
  const comeback = attemptsByProgress.some((list) => {
    const firstPass = list.findIndex((a) => a.passed);
    return firstPass > 0;
  });
  const firstTry = attemptsByProgress.some((list) => list[0]?.percent === 100);

  const finishedAt = [
    ...s.quizAttempts.filter((a) => a.studentId === studentId && a.completedAt).map((a) => a.completedAt as string),
    ...attemptsByProgress.flat().map((a) => a.submittedAt as string),
  ];

  return {
    chaptersFixed: completed.length,
    marksFixed,
    comeback,
    firstTry,
    sessionsDone: s.timetable.filter((e) => e.studentId === studentId && e.done).length,
    streak: longestStreak(finishedAt),
  };
}

export interface BadgeProgress {
  current: number;
  target: number;
}

/** Null for badges the ledger awards as they happen. */
function ruleProgress(badgeId: string, stats: ReturnType<typeof learningStats>): BadgeProgress | null {
  if (badgeId in BADGE_MARK_GOALS) return { current: stats.marksFixed, target: BADGE_MARK_GOALS[badgeId] };
  if (badgeId in BADGE_STREAK_GOALS) return { current: stats.streak, target: BADGE_STREAK_GOALS[badgeId] };
  if (badgeId === 'first-fix') return { current: stats.chaptersFixed, target: 1 };
  if (badgeId === 'comeback') return { current: stats.comeback ? 1 : 0, target: 1 };
  if (badgeId === 'first-try') return { current: stats.firstTry ? 1 : 0, target: 1 };
  if (badgeId === 'plan-keeper') return { current: stats.sessionsDone, target: PLAN_KEEPER_SESSIONS };
  return null;
}

/** Awards every learning badge the demo student now qualifies for. Safe to call after any action. */
export function awardEarnedBadges(): Badge[] {
  const s = getState();
  const id = s.demoStudentId;
  const stats = learningStats(s, id);
  const owned = new Set(badgesOf(s, id).map((b) => b.badgeId));
  const fresh = allBadges().filter((b) => {
    const rule = ruleProgress(b.id, stats);
    return rule !== null && rule.current >= rule.target && !owned.has(b.id);
  });
  if (fresh.length === 0) return [];

  const earnedAt = nowIso();
  const rows: StudentBadge[] = fresh.map((b) => ({ studentId: id, badgeId: b.id, earnedAt }));
  updateState((st) => ({ ...st, studentBadges: [...st.studentBadges, ...rows] }));
  for (const b of fresh) {
    pushNotification({
      type: 'achievement',
      title: 'Achievement unlocked!',
      body: `You've earned the ${b.name} badge.`,
      href: '/profile',
      dedupeKey: `badge:${b.id}:${id}`,
    });
  }
  return fresh;
}

export interface BadgeCard {
  badge: Badge;
  earnedAt: string | null;
  progress: BadgeProgress;
  /** How many students in the section have it, and how many there are. */
  holders: number;
  sectionSize: number;
}

export function badgeCards(s: AppState): BadgeCard[] {
  const id = s.demoStudentId;
  const stats = learningStats(s, id);
  const section = getLeaderboard(s).map((r) => r.studentId);
  return allBadges().map((badge) => {
    const earned = badgesOf(s, id).find((b) => b.badgeId === badge.id);
    const fallback = badge.threshold !== null
      ? { current: earnedPointsOf(s, id), target: badge.threshold }
      : { current: earned ? 1 : 0, target: 1 };
    return {
      badge,
      earnedAt: earned?.earnedAt ?? null,
      progress: ruleProgress(badge.id, stats) ?? fallback,
      holders: new Set(
        s.studentBadges.filter((b) => b.badgeId === badge.id && section.includes(b.studentId)).map((b) => b.studentId),
      ).size,
      sectionSize: section.length,
    };
  });
}
