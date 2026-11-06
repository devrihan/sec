import { seedStudents } from './catalog';
import { getState, type AppState } from './store';
import { earnedPointsOf, latestBadgeIdOf, studentOf } from './studentService';
import type { LeaderboardEntry } from '../types';

export function accuracyOf(s: AppState, id: string): number {
  const stat = s.quizStats[id];
  return stat && stat.answered > 0 ? stat.correct / stat.answered : 0;
}

/**
 * Same class and section only. Ranked by cumulative earned points, never coins.
 * Ties: higher quiz accuracy, then earlier achievement, then stable student id (SRS 4.3).
 */
export function getLeaderboard(s: AppState = getState()): LeaderboardEntry[] {
  const me = studentOf(s, s.demoStudentId);
  const rows = seedStudents
    .map((seed) => studentOf(s, seed.id))
    .filter((st) => st.class === me.class && st.section === me.section)
    .map((st) => ({
      rank: 0,
      studentId: st.id,
      name: st.name,
      class: st.class,
      section: st.section,
      academicYear: st.academicYear,
      avatar: st.avatar,
      latestBadgeId: latestBadgeIdOf(s, st.id),
      totalEarnedPoints: earnedPointsOf(s, st.id),
      accuracy: accuracyOf(s, st.id),
      isCurrent: st.id === s.demoStudentId,
    }));

  rows.sort(
    (a, b) =>
      b.totalEarnedPoints - a.totalEarnedPoints ||
      b.accuracy - a.accuracy ||
      (s.achievedAt[a.studentId] ?? '').localeCompare(s.achievedAt[b.studentId] ?? '') ||
      a.studentId.localeCompare(b.studentId),
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function rankOf(s: AppState, id: string): number {
  return getLeaderboard(s).find((r) => r.studentId === id)?.rank ?? 0;
}

/** The current student with the students just above and below. */
export function nearby(rows: LeaderboardEntry[], radius = 2): LeaderboardEntry[] {
  const i = rows.findIndex((r) => r.isCurrent);
  if (i < 0) return rows.slice(0, radius * 2 + 1);
  return rows.slice(Math.max(0, i - radius), i + radius + 1);
}
