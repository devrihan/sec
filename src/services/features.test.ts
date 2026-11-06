import { beforeEach, describe, expect, it } from 'vitest';
import { BUILDABLE, buildAvatar } from '../avatar3d/buildAvatar';
import { withItem } from '../avatar3d/options';
import { addDaysKey, combine, monthGrid, startOfWeek, toDateKey } from '../lib/dates';
import { avatarById, avatars, studentErrors } from './catalog';
import { getLeaderboard } from './leaderboardService';
import { runNotificationChecks } from './notificationService';
import { markAllRead, markRead, sortedNotifications } from './notificationStore';
import { applyTransaction, purchaseAvatar, setDemoCoins, setDemoPoints, simulateClassmateOvertake } from './pointsService';
import { startQuiz } from './quizService';
import { getState, resetDemo, updateState } from './store';
import { coinsOf, earnedPointsOf, equipAvatar, ownsAvatar, removeFromSlot, setStudentContext } from './studentService';
import {
  addSession,
  deleteSession,
  examsOn,
  holidayOn,
  sessionsFor,
  suggestionsFor,
  updateSession,
  upcomingExams,
} from './timetableService';

const ME = 'STU-12M-001';
const coins = () => coinsOf(getState(), ME);
const points = () => earnedPointsOf(getState(), ME);
const notes = () => getState().notifications;
const bodies = () => notes().map((n) => n.body);

const session = (date: string, startTime: string, endTime: string, chapterId = 'c12-math-01') => ({
  date,
  startTime,
  endTime,
  subjectId: chapterId.slice(0, chapterId.lastIndexOf('-')),
  chapterId,
  topic: '',
});

beforeEach(() => resetDemo());

describe('timetable', () => {
  // A far-off day with no seeded sessions.
  const day = () => addDaysKey(toDateKey(new Date()), 3);

  it('adds a session with date, time slots, subject and chapter', () => {
    const before = sessionsFor(getState()).length;
    const outcome = addSession({ ...session(day(), '15:00', '17:00'), topic: 'Bijections' });
    expect(outcome.ok).toBe(true);
    expect(sessionsFor(getState())).toHaveLength(before + 1);
  });

  it('allows back-to-back slots like the brief, but rejects overlaps', () => {
    expect(addSession(session(day(), '15:00', '17:00')).ok).toBe(true);
    expect(addSession(session(day(), '17:00', '18:00', 'c12-chem-01')).ok).toBe(true);
    expect(addSession(session(day(), '18:00', '19:00', 'c12-phys-03')).ok).toBe(true);
    const clash = addSession(session(day(), '16:30', '17:30', 'c12-chem-02'));
    expect(clash).toMatchObject({ ok: false });
    if (!clash.ok) expect(clash.error).toMatch(/overlaps/);
  });

  it('rejects bad times, past sessions and chapters from another subject', () => {
    expect(addSession(session(day(), '17:00', '15:00')).ok).toBe(false);
    expect(addSession(session('2020-01-01', '15:00', '16:00')).ok).toBe(false);
    expect(addSession({ ...session(day(), '15:00', '16:00'), chapterId: 'c12-chem-01' }).ok).toBe(false);
  });

  it('only accepts subjects from the current class', () => {
    setStudentContext(10, 'B');
    expect(addSession(session(day(), '15:00', '16:00')).ok).toBe(false);
  });

  it('edits, reschedules and deletes', () => {
    const added = addSession(session(day(), '15:00', '16:00'));
    if (!added.ok) throw new Error(added.error);
    const moved = updateSession(added.entry.id, { ...session(addDaysKey(day(), 1), '09:00', '10:00'), topic: 'Moved' });
    expect(moved).toMatchObject({ ok: true });
    expect(sessionsFor(getState()).find((e) => e.id === added.entry.id)?.startTime).toBe('09:00');
    deleteSession(added.entry.id);
    expect(sessionsFor(getState()).some((e) => e.id === added.entry.id)).toBe(false);
  });

  it('a session does not clash with itself when edited', () => {
    const added = addSession(session(day(), '15:00', '16:00'));
    if (!added.ok) throw new Error(added.error);
    expect(updateSession(added.entry.id, session(day(), '15:30', '16:30')).ok).toBe(true);
  });

  it('finds holidays across a date range', () => {
    expect(holidayOn('2026-11-09')?.name).toBe('Diwali break');
    expect(holidayOn('2027-01-01')?.name).toBe('Winter vacation');
    expect(holidayOn('2026-11-15')).toBeUndefined();
  });

  it('shows exams for the student class only, soonest first', () => {
    const exams = upcomingExams(getState());
    expect(exams.map((e) => e.subjectName)).toEqual(['Mathematics', 'Physics', 'Chemistry', 'Biology']);
    setStudentContext(10, 'B');
    expect(upcomingExams(getState()).map((e) => e.subjectName)).toEqual(['Mathematics', 'Science']);
    expect(examsOn(getState(), exams[0].date).length).toBeGreaterThan(0);
  });

  it('date helpers start weeks on Monday and fill six-week grids', () => {
    expect(startOfWeek(new Date(2026, 10, 8)).getDay()).toBe(1);
    expect(monthGrid(2026, 10)).toHaveLength(42);
    expect(toDateKey(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
  });
});

describe('personalised suggestions', () => {
  it('only suggests chapters with recorded errors', () => {
    const errorChapters = new Set(studentErrors.map((e) => e.chapterId));
    const list = suggestionsFor(getState());
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) expect(errorChapters.has(s.chapterId), s.chapterId).toBe(true);
  });

  it('uses the brief wording for a chapter with mistakes in repeated exams', () => {
    const top = suggestionsFor(getState())[0];
    expect(top.repeated).toBe(true);
    expect(top.examNames.length).toBeGreaterThan(1);
    expect(top.message).toBe(`Your previous exam performance indicates that ${top.chapterTitle} needs more attention. Consider allocating additional study time to this chapter.`);
  });

  it('ranks a repeated weak chapter above a single-exam one', () => {
    const list = suggestionsFor(getState(), new Date(), 100).filter((s) => s.plannedMinutes === 0);
    const firstSingle = list.findIndex((s) => !s.repeated);
    const lastRepeated = list.map((s) => s.repeated).lastIndexOf(true);
    expect(lastRepeated).toBeLessThan(firstSingle);
  });

  it('moves a chapter down once study time is planned for it', () => {
    const top = suggestionsFor(getState())[0];
    expect(top.plannedMinutes).toBe(0);
    const added = addSession(session(addDaysKey(toDateKey(new Date()), 3), '10:00', '11:30', top.chapterId));
    expect(added.ok).toBe(true);
    const after = suggestionsFor(getState(), new Date(), 100);
    expect(after[0].chapterId).not.toBe(top.chapterId);
    expect(after.find((s) => s.chapterId === top.chapterId)?.plannedMinutes).toBe(90);
  });

  it('suggests nothing for a class with no exam errors, rather than inventing some', () => {
    setStudentContext(9, 'A');
    expect(suggestionsFor(getState())).toEqual([]);
  });
});

describe('3D avatar marketplace', () => {
  it('every item in avatars.json has a 3D model, and every model is sold', () => {
    for (const [slot, ids] of Object.entries(BUILDABLE)) {
      const sold = avatars.filter((a) => a.slot === slot).map((a) => a.id).sort();
      expect(sold, slot).toEqual([...ids].sort());
    }
  });

  it('builds real meshes for every item on the character', () => {
    const base = getState().avatarConfigs[ME];
    const count = (c: typeof base) => {
      let n = 0;
      buildAvatar(c).traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) n += 1; });
      return n;
    };
    for (const item of avatars) expect(count(withItem(base, item)), item.id).toBeGreaterThan(20);
    expect(count({ ...base, hat: 'gold-crown' })).toBeGreaterThan(count(base));
  });

  it('keeps the SRS avatar names and prices as purchasable outfits', () => {
    expect(avatarById('blue-hoodie')?.price).toBe(500);
    expect(avatarById('scientist')?.price).toBe(600);
    expect(avatarById('super-learner')?.price).toBe(1500);
  });

  it('spends coins consistently and never touches leaderboard points', () => {
    const beforePoints = points();
    const rank = getLeaderboard().find((r) => r.isCurrent)?.rank;
    expect(purchaseAvatar('baseball-cap').ok).toBe(true);
    expect(coins()).toBe(800);
    expect(points()).toBe(beforePoints);
    expect(getLeaderboard().find((r) => r.isCurrent)?.rank).toBe(rank);
    expect(getState().transactions.at(-1)).toMatchObject({ type: 'AVATAR_PURCHASE', coinAmount: -200, pointsAmount: 0 });
  });

  it('a bought item stays in the inventory after it is taken off', () => {
    purchaseAvatar('baseball-cap');
    equipAvatar('baseball-cap');
    expect(getState().avatarConfigs[ME].hat).toBe('baseball-cap');
    removeFromSlot('hat');
    expect(getState().avatarConfigs[ME].hat).toBeNull();
    expect(ownsAvatar(getState(), ME, 'baseball-cap')).toBe(true);
    expect(purchaseAvatar('baseball-cap')).toEqual({ ok: false, reason: 'owned' });
    expect(coins()).toBe(800);
  });

  it('free items are owned from the start; paid ones must be bought first', () => {
    expect(ownsAvatar(getState(), ME, 'soft-bob')).toBe(true);
    expect(equipAvatar('soft-bob')).toBe(true);
    expect(equipAvatar('spiky')).toBe(false);
    expect(getState().avatarConfigs[ME].hair).toBe('soft-bob');
  });

  it('required slots cannot be emptied', () => {
    removeFromSlot('top');
    expect(getState().avatarConfigs[ME].top).toBe('blue-hoodie');
  });

  it('a dress replaces the top, and choosing a top takes the dress off', () => {
    setDemoCoins(5000);
    purchaseAvatar('summer-dress');
    equipAvatar('summer-dress');
    expect(getState().avatarConfigs[ME].bottom).toBe('summer-dress');
    equipAvatar('plain-tee');
    expect(getState().avatarConfigs[ME]).toMatchObject({ top: 'plain-tee', bottom: 'blue-jeans' });
  });

  it('classmates get varied, stable avatars', () => {
    const configs = Object.values(getState().avatarConfigs);
    expect(new Set(configs.map((c) => `${c.skin}${c.hair}${c.top}`)).size).toBeGreaterThan(10);
    resetDemo();
    expect(Object.values(getState().avatarConfigs)).toEqual(configs);
  });
});

describe('notifications: timetable reminders', () => {
  it('reminds at 2:15 PM for a 3:00 PM session, as in the brief', () => {
    const date = addDaysKey(toDateKey(new Date()), 3);
    addSession(session(date, '15:00', '17:00'));
    runNotificationChecks(combine(date, '14:14'));
    expect(bodies().filter((b) => b.includes('study session starts'))).toEqual([]);
    runNotificationChecks(combine(date, '14:15'));
    expect(bodies()).toContain('Your Mathematics study session starts in 45 minutes. Ready to go?');
  });

  it('sends the second reminder as the session is about to begin', () => {
    const date = addDaysKey(toDateKey(new Date()), 3);
    addSession(session(date, '15:00', '16:00'));
    runNotificationChecks(combine(date, '14:45'));
    expect(bodies()).toContain("Your study session starts in 15 minutes. Let's get started!");
  });

  it('never repeats a reminder, however often the check runs', () => {
    const date = addDaysKey(toDateKey(new Date()), 3);
    addSession(session(date, '15:00', '16:00'));
    for (const t of ['14:15', '14:16', '14:20', '14:30']) runNotificationChecks(combine(date, t));
    expect(notes().filter((n) => n.type === 'timetable')).toHaveLength(1);
  });

  it('rescheduling re-arms the reminder for the new time', () => {
    const date = addDaysKey(toDateKey(new Date()), 3);
    const added = addSession(session(date, '15:00', '16:00'));
    if (!added.ok) throw new Error(added.error);
    runNotificationChecks(combine(date, '14:15'));
    updateSession(added.entry.id, session(date, '18:00', '19:00'));
    runNotificationChecks(combine(date, '17:20'));
    expect(notes().filter((n) => n.type === 'timetable')).toHaveLength(2);
  });

  it('stays silent for finished, deleted and past sessions', () => {
    const date = addDaysKey(toDateKey(new Date()), 3);
    const added = addSession(session(date, '15:00', '16:00'));
    if (!added.ok) throw new Error(added.error);
    runNotificationChecks(combine(date, '15:30'));
    deleteSession(added.entry.id);
    runNotificationChecks(combine(date, '14:30'));
    expect(notes().filter((n) => n.type === 'timetable')).toHaveLength(0);
  });
});

describe('notifications: leaderboard and rewards', () => {
  it('fires when a classmate passes the student, with their name', () => {
    const name = simulateClassmateOvertake();
    expect(name).toBe('Ishita');
    expect(bodies()).toContain('Ishita has moved ahead of you on the leaderboard. Complete a flashcard challenge to earn more points!');
    expect(notes().find((n) => n.type === 'leaderboard')?.title).toBe("You've been overtaken!");
  });

  it('stays quiet if a classmate gains points without passing', () => {
    applyTransaction({ studentId: 'STU-12M-010', type: 'QUIZ_REWARD', coinAmount: 0, pointsAmount: 10, reason: 'x', referenceId: null, dedupeKey: null });
    expect(notes().filter((n) => n.type === 'leaderboard')).toHaveLength(0);
  });

  it('stays quiet for a student in another section', () => {
    applyTransaction({ studentId: 'STU-12N-001', type: 'QUIZ_REWARD', coinAmount: 0, pointsAmount: 9000, reason: 'x', referenceId: null, dedupeKey: null });
    expect(notes().filter((n) => n.type === 'leaderboard')).toHaveLength(0);
  });

  it('announces a new badge', () => {
    setDemoPoints(95);
    applyTransaction({ studentId: ME, type: 'QUIZ_REWARD', coinAmount: 20, pointsAmount: 20, reason: 'Quiz', referenceId: null, dedupeKey: null });
    expect(bodies()).toContain("You've earned the Starter badge.");
    expect(notes().some((n) => n.title === 'Achievement unlocked!')).toBe(true);
  });

  it('announces rewards but not spending', () => {
    applyTransaction({ studentId: ME, type: 'QUIZ_REWARD', coinAmount: 120, pointsAmount: 120, reason: 'Quiz done', referenceId: null, dedupeKey: null });
    expect(notes().filter((n) => n.title === '+120 coins earned')).toHaveLength(1);
    purchaseAvatar('beanie');
    expect(notes().filter((n) => n.type === 'achievement')).toHaveLength(1);
  });
});

describe('notifications: learning and academic', () => {
  it('uses the brief wording for flashcards and remediation', () => {
    runNotificationChecks();
    expect(bodies()).toContain('Your flashcards are waiting! Complete a quick quiz and earn points.');
    expect(bodies().some((b) => /^You still have \d+ chapters to master\. Keep going!$/.test(b))).toBe(true);
  });

  it('does not nag about flashcards right after a quiz', () => {
    updateState((s) => ({
      ...s,
      transactions: [...s.transactions, { ...s.transactions[0], id: 'T', studentId: ME, type: 'QUIZ_REWARD', createdAt: new Date().toISOString() }],
    }));
    runNotificationChecks();
    expect(bodies()).not.toContain('Your flashcards are waiting! Complete a quick quiz and earn points.');
  });

  it('counts remediation chapters that are really left, and links to a roadmap', () => {
    runNotificationChecks();
    const n = notes().find((x) => x.title === 'Your roadmap is waiting');
    expect(n?.body).toContain('19 chapters');
    expect(n?.href).toMatch(/^\/remediation\//);
  });

  it('nudges about an unfinished quiz only after a while', () => {
    const attempt = startQuiz('c12-chem', 'c12-chem-02');
    runNotificationChecks(new Date());
    expect(notes().some((n) => n.dedupeKey === `quiz-pending:${attempt?.id}`)).toBe(false);
    runNotificationChecks(new Date(Date.now() + 31 * 60000));
    const n = notes().find((x) => x.dedupeKey === `quiz-pending:${attempt?.id}`);
    expect(n?.href).toBe(`/flashcards/quiz/${attempt?.id}`);
  });

  it('reminds about an exam within a week, using the brief wording', () => {
    const exam = upcomingExams(getState())[0];
    runNotificationChecks();
    expect(bodies()).toContain(`Your ${exam.subjectName} exam is approaching. Have you completed your revision?`);
  });

  it('reminds again as the exam gets closer, but once per stage', () => {
    const exam = upcomingExams(getState())[0];
    const on = (offset: number) => combine(addDaysKey(exam.date, offset), '09:00');
    runNotificationChecks(on(-7));
    runNotificationChecks(on(-6));
    runNotificationChecks(on(-3));
    runNotificationChecks(on(-1));
    expect(notes().filter((n) => n.dedupeKey.startsWith(`exam:${exam.id}`))).toHaveLength(3);
  });

  it('announces a holiday three days ahead', () => {
    runNotificationChecks(combine('2026-12-22', '09:00'));
    expect(bodies()).toContain('Christmas starts in 3 days. Plan your study time around it.');
  });

  it('marks one or all as read, and persists in state', () => {
    runNotificationChecks();
    const [first] = notes();
    markRead(first.id);
    expect(notes().find((n) => n.id === first.id)?.readAt).toBeTruthy();
    expect(notes().some((n) => !n.readAt)).toBe(true);
    markAllRead();
    expect(notes().every((n) => n.readAt)).toBe(true);
  });

  it('lists the newest first', () => {
    runNotificationChecks();
    simulateClassmateOvertake();
    expect(sortedNotifications(notes())[0].type).toBe('leaderboard');
  });

  it('reset clears notifications', () => {
    runNotificationChecks();
    expect(notes().length).toBeGreaterThan(0);
    resetDemo();
    expect(notes()).toEqual([]);
  });
});
