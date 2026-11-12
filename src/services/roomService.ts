import {
  ROOM_MAX_PARTICIPANTS,
  ROOM_MIN_PARTICIPANTS,
  ROOM_QUESTION_COUNT,
  ROOM_SIM_HOST_START_MS,
  ROOM_SIM_STEP_MS,
} from '../config/rewards';
import { awardEarnedBadges } from './badgeService';
import { chapterById, seedStudentById, seedStudents, subjectById } from './catalog';
import { awardMultiplayerReward } from './pointsService';
import { accuracyOf } from './leaderboardService';
import { questionsForChapter, shuffled } from './questionService';
import { attemptById, createAttempt, sealAttempt, patchAttempt } from './quizService';
import { getState, newId, pushPopup, updateState, type AppState } from './store';
import { currentStudent } from './studentService';
import type { AvatarConfig, QuizRoom, RoomParticipant } from '../types';

/**
 * Simulated rooms (SRS A-06, 6.10). Classmates here are driven by timers on this
 * device. Nothing crosses the network. To go real-time, keep these function
 * signatures and replace tickRoom with WebSocket events.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const roomById = (s: AppState, id: string) => s.rooms.find((r) => r.id === id);

export function generateRoomCode(subjectName: string, taken: Set<string>): string {
  const prefix = subjectName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
  for (;;) {
    let suffix = '';
    for (let i = 0; i < 3; i += 1) {
      suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const code = `${prefix}${suffix}`;
    if (!taken.has(code)) return code;
  }
}

function roomQuestionIds(chapterId: string): string[] {
  return shuffled(questionsForChapter(chapterId))
    .slice(0, ROOM_QUESTION_COUNT)
    .map((q) => q.id);
}

function patchRoom(id: string, recipe: (r: QuizRoom) => QuizRoom): void {
  updateState((s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === id ? recipe(r) : r)) }));
}

function classmatesFor(studentId: string): string[] {
  const me = currentStudent();
  return seedStudents
    .filter((s) => s.class === me.class && s.section === me.section && s.id !== studentId)
    .map((s) => s.id);
}

export function createRoom(subjectId: string, chapterId: string): QuizRoom | null {
  const me = currentStudent();
  const subject = subjectById(subjectId);
  if (!subject || questionsForChapter(chapterId).length === 0) return null;

  const taken = new Set(getState().rooms.map((r) => r.code));
  const pending = shuffled(classmatesFor(me.id)).slice(0, 3);
  const room: QuizRoom = {
    id: newId('ROOM'),
    code: generateRoomCode(subject.name, taken),
    hostStudentId: me.id,
    status: 'open',
    subjectId,
    chapterId,
    class: me.class,
    questionIds: roomQuestionIds(chapterId),
    participants: [{ studentId: me.id, state: 'ready', isHost: true, simulatedScore: null }],
    pendingStudentIds: pending,
    nextSimEventAt: Date.now() + ROOM_SIM_STEP_MS,
    hostStartAt: null,
    attemptId: null,
  };
  updateState((s) => ({ ...s, rooms: [...s.rooms, room] }));
  return room;
}

export type JoinOutcome = { ok: true; room: QuizRoom } | { ok: false; error: string };

export function joinRoom(rawCode: string): JoinOutcome {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a room code.' };

  const s = getState();
  const me = currentStudent(s);
  const room = s.rooms.find((r) => r.code === code);
  if (!room) return { ok: false, error: `No room has the code ${code}. Check it and try again.` };

  if (room.participants.some((p) => p.studentId === me.id)) {
    return room.status === 'open' || room.status === 'in_progress'
      ? { ok: true, room }
      : { ok: false, error: `Room ${code} has finished. Create a new room to play again.` };
  }
  if (room.status !== 'open') {
    return { ok: false, error: `Room ${code} is no longer open. Ask your friend for a new code.` };
  }
  if (room.class !== me.class) {
    return { ok: false, error: `Room ${code} is for Class ${room.class} students.` };
  }
  if (room.participants.length >= ROOM_MAX_PARTICIPANTS) {
    return { ok: false, error: `Room ${code} is full.` };
  }

  const now = Date.now();
  patchRoom(room.id, (r) => ({
    ...r,
    questionIds: r.questionIds.length > 0 ? r.questionIds : roomQuestionIds(r.chapterId),
    participants: [...r.participants, { studentId: me.id, state: 'ready', isHost: false, simulatedScore: null }],
    nextSimEventAt: now + ROOM_SIM_STEP_MS,
    hostStartAt: now + ROOM_SIM_HOST_START_MS,
  }));
  return { ok: true, room: roomById(getState(), room.id) as QuizRoom };
}

/** Advances the simulation: one classmate joins or readies up per step. */
export function tickRoom(roomId: string, now: number = Date.now()): void {
  const room = roomById(getState(), roomId);
  if (!room || room.status !== 'open') return;

  if (room.hostStartAt !== null && now >= room.hostStartAt) {
    launch(room);
    return;
  }
  if (room.nextSimEventAt === null || now < room.nextSimEventAt) return;

  const waiting = room.participants.find((p) => p.state === 'waiting');
  const next = room.pendingStudentIds[0];
  if (waiting) {
    patchRoom(roomId, (r) => ({
      ...r,
      participants: r.participants.map((p) =>
        p.studentId === waiting.studentId ? { ...p, state: 'ready' } : p,
      ),
      nextSimEventAt: now + ROOM_SIM_STEP_MS,
    }));
  } else if (next && room.participants.length < ROOM_MAX_PARTICIPANTS) {
    const joined: RoomParticipant = { studentId: next, state: 'waiting', isHost: false, simulatedScore: null };
    patchRoom(roomId, (r) => ({
      ...r,
      participants: [...r.participants, joined],
      pendingStudentIds: r.pendingStudentIds.slice(1),
      nextSimEventAt: now + ROOM_SIM_STEP_MS,
    }));
  } else {
    patchRoom(roomId, (r) => ({ ...r, nextSimEventAt: null }));
  }
}

export function startBlockedReason(room: QuizRoom, studentId: string): string | null {
  if (room.hostStudentId !== studentId) return 'Only the host can start the quiz.';
  if (room.participants.length < ROOM_MIN_PARTICIPANTS) {
    return `Needs at least ${ROOM_MIN_PARTICIPANTS} players to start.`;
  }
  return null;
}

function simulatedScore(s: AppState, studentId: string, total: number): number {
  const skill = accuracyOf(s, studentId) || 0.6;
  let score = 0;
  for (let i = 0; i < total; i += 1) {
    if (Math.random() < skill) score += 1;
  }
  return score;
}

function launch(room: QuizRoom): void {
  const s = getState();
  const attempt = createAttempt('multiplayer', room.subjectId, room.chapterId, room.questionIds, room.id);
  patchRoom(room.id, (r) => ({
    ...r,
    status: 'in_progress',
    attemptId: attempt.id,
    participants: r.participants.map((p) =>
      p.studentId === s.demoStudentId
        ? p
        : { ...p, state: 'ready', simulatedScore: simulatedScore(s, p.studentId, r.questionIds.length) },
    ),
  }));
}

/** Host only. The check lives here, not just in the UI (FR-022). */
export function startRoom(roomId: string): string | null {
  const s = getState();
  const room = roomById(s, roomId);
  if (!room || room.status !== 'open') return 'This room is not open.';
  const blocked = startBlockedReason(room, s.demoStudentId);
  if (blocked) return blocked;
  launch(room);
  return null;
}

export function leaveRoom(roomId: string): void {
  const s = getState();
  const room = roomById(s, roomId);
  if (!room || room.status !== 'open') return;
  if (room.hostStudentId === s.demoStudentId) {
    patchRoom(roomId, (r) => ({ ...r, status: 'closed' }));
  } else {
    patchRoom(roomId, (r) => ({
      ...r,
      hostStartAt: null,
      participants: r.participants.filter((p) => p.studentId !== s.demoStudentId),
    }));
  }
}

export interface RoomStanding {
  rank: number;
  studentId: string;
  name: string;
  avatar: AvatarConfig;
  score: number;
  total: number;
  isCurrent: boolean;
}

/** Equal scores share a rank; stable id keeps the row order deterministic. */
export function roomStandings(s: AppState, room: QuizRoom): RoomStanding[] {
  const attempt = room.attemptId ? attemptById(s, room.attemptId) : undefined;
  const total = room.questionIds.length;
  const rows = room.participants
    .map((p) => {
      const isCurrent = p.studentId === s.demoStudentId;
      return {
        rank: 0,
        studentId: p.studentId,
        name: seedStudentById(p.studentId)?.name ?? p.studentId,
        avatar: s.avatarConfigs[p.studentId],
        score: isCurrent ? (attempt?.score ?? 0) : (p.simulatedScore ?? 0),
        total,
        isCurrent,
      };
    })
    .sort((a, b) => b.score - a.score || a.studentId.localeCompare(b.studentId));
  return rows.map((row) => ({ ...row, rank: rows.findIndex((r) => r.score === row.score) + 1 }));
}

/** Runs after the whole quiz. Rewards go through the ledger for every participant, once each. */
export function finishRoom(attemptId: string): QuizRoom | null {
  const attempt = sealAttempt(attemptId);
  if (!attempt?.roomId) return null;
  const room = roomById(getState(), attempt.roomId);
  if (!room) return null;
  if (room.status === 'finished') return room;

  patchRoom(room.id, (r) => ({ ...r, status: 'finished' }));
  const finished = roomById(getState(), room.id) as QuizRoom;
  const title = chapterById(room.chapterId)?.title ?? 'chapter';

  for (const row of roomStandings(getState(), finished)) {
    const result = awardMultiplayerReward(row.studentId, room.id, row.score, row.rank === 1, title);
    if (row.isCurrent && result) pushPopup({ ...result, newBadges: [...result.newBadges, ...awardEarnedBadges()] });
  }
  patchAttempt(attemptId, (a) => ({ ...a, rewardClaimed: true }));
  return finished;
}
