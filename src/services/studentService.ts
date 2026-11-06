import { OPTIONAL_SLOTS, withItem } from '../avatar3d/options';
import { HINT_COST_COINS, LOW_BALANCE_COINS } from '../config/rewards';
import { avatarById, seedStudentById, seedStudents, subjects } from './catalog';
import { getState, updateState, useAppState, type AppState } from './store';
import type { AvatarConfig, AvatarSlot, Student, StudentBadge } from '../types';

/** The demo student's class and section are configurable; classmates' are fixed. */
export function studentOf(s: AppState, id: string): Student {
  const seed = seedStudentById(id);
  if (!seed) throw new Error(`Unknown student ${id}`);
  const isDemo = id === s.demoStudentId;
  return {
    id,
    name: seed.name,
    class: isDemo ? s.studentClass : seed.class,
    section: isDemo ? s.studentSection : seed.section,
    academicYear: s.academicYear,
    avatar: s.avatarConfigs[id],
  };
}

export const currentStudent = (s: AppState = getState()): Student => studentOf(s, s.demoStudentId);

export function coinsOf(s: AppState, id: string): number {
  return s.transactions.reduce((sum, t) => (t.studentId === id ? sum + t.coinAmount : sum), 0);
}

export function earnedPointsOf(s: AppState, id: string): number {
  return s.transactions.reduce(
    (sum, t) => (t.studentId === id && t.academicYear === s.academicYear ? sum + t.pointsAmount : sum),
    0,
  );
}

export function badgesOf(s: AppState, id: string): StudentBadge[] {
  return s.studentBadges.filter((b) => b.studentId === id);
}

/** Records are in award order, so the last one is the latest (SRS 4.4). */
export function latestBadgeIdOf(s: AppState, id: string): string | null {
  return badgesOf(s, id).at(-1)?.badgeId ?? null;
}

/** Free items belong to everyone; bought items stay in the inventory for good. */
export function ownsAvatar(s: AppState, studentId: string, avatarId: string): boolean {
  if (avatarById(avatarId)?.price === 0) return true;
  return s.studentAvatars.some((a) => a.studentId === studentId && a.avatarId === avatarId);
}

export function useStudent(): Student {
  const id = useAppState((s) => s.demoStudentId);
  const cls = useAppState((s) => s.studentClass);
  const section = useAppState((s) => s.studentSection);
  const avatar = useAppState((s) => s.avatarConfigs[s.demoStudentId]);
  const year = useAppState((s) => s.academicYear);
  return {
    id,
    name: seedStudentById(id)?.name ?? '',
    class: cls,
    section,
    academicYear: year,
    avatar,
  };
}

export const useCoins = () => useAppState((s) => coinsOf(s, s.demoStudentId));
export const useEarnedPoints = () => useAppState((s) => earnedPointsOf(s, s.demoStudentId));

export type WalletState = 'normal' | 'low' | 'insufficient';

export function walletState(coins: number): WalletState {
  if (coins < HINT_COST_COINS) return 'insufficient';
  return coins < LOW_BALANCE_COINS ? 'low' : 'normal';
}

export function subjectsForClass(cls: number) {
  return subjects.filter((s) => s.class === cls).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function sectionsForClass(cls: number): string[] {
  return [...new Set(seedStudents.filter((s) => s.class === cls).map((s) => s.section))].sort();
}

export const availableClasses = (): number[] =>
  [...new Set(subjects.map((s) => s.class))].sort((a, b) => a - b);

export function setStudentContext(cls: number, section: string): void {
  updateState((s) => ({ ...s, studentClass: cls, studentSection: section }));
}

function patchMyAvatar(patch: Partial<AvatarConfig>): void {
  updateState((st) => ({
    ...st,
    avatarConfigs: { ...st.avatarConfigs, [st.demoStudentId]: { ...st.avatarConfigs[st.demoStudentId], ...patch } },
  }));
}

/** Only owned items can be equipped (SRS 4.5). */
export function equipAvatar(avatarId: string): boolean {
  const s = getState();
  const item = avatarById(avatarId);
  if (!item || !ownsAvatar(s, s.demoStudentId, avatarId)) return false;
  patchMyAvatar(withItem(s.avatarConfigs[s.demoStudentId], item));
  return true;
}

export function removeFromSlot(slot: AvatarSlot): void {
  if (OPTIONAL_SLOTS.includes(slot)) patchMyAvatar({ [slot]: null });
}

/** Skin tone, hair colour, eyes and mouth are free choices, not marketplace items. */
export function setAvatarLook(patch: Pick<Partial<AvatarConfig>, 'skin' | 'hairColor' | 'eyes' | 'mouth'>): void {
  patchMyAvatar(patch);
}

export function toggleVideoCompleted(videoId: string): void {
  updateState((s) => ({
    ...s,
    completedVideoIds: s.completedVideoIds.includes(videoId)
      ? s.completedVideoIds.filter((v) => v !== videoId)
      : [...s.completedVideoIds, videoId],
  }));
}
