import { beforeEach, describe, expect, it } from 'vitest';
import {
  BADGE_THRESHOLDS,
  FLASHCARD_QUESTION_COUNT,
  HINT_COST_COINS,
  QUIZ_REWARD,
  REMEDIATION_COMPLETION_REWARD,
} from '../config/rewards';
import {
  allBadges,
  avatars,
  chapters,
  descriptiveQuestions,
  exams,
  questionById,
  questions,
  revision,
  seedExtras,
  seedStudents,
  studentErrors,
  subjects,
  videos,
} from './catalog';
import { getLeaderboard, nearby } from './leaderboardService';
import { findHint, requestHint, setHintProvider, mockHintProvider } from './hintService';
import {
  applyTransaction,
  calculateQuizReward,
  InsufficientCoinsError,
  purchaseAvatar,
  setDemoCoins,
  setDemoPoints,
} from './pointsService';
import { bankForChapter, isRepeated, questionsForChapter } from './questionService';
import { completeQuiz, startQuiz, submitAnswer } from './quizService';
import {
  examsWithErrors,
  getRoadmap,
  isPass,
  setAssessmentAnswer,
  startAssessment,
  submitAssessment,
  subjectsWithErrors,
} from './remediationService';
import { createRoom, finishRoom, joinRoom, roomById, startRoom, tickRoom } from './roomService';
import { getState, resetDemo, updateState } from './store';
import { badgesOf, coinsOf, earnedPointsOf, equipAvatar, latestBadgeIdOf, setStudentContext } from './studentService';

const ME = 'STU-12M-001';
const coins = () => coinsOf(getState(), ME);
const points = () => earnedPointsOf(getState(), ME);
const myBadges = () => badgesOf(getState(), ME).map((b) => b.badgeId);

function answerAllCorrect(attemptId: string) {
  const attempt = getState().quizAttempts.find((a) => a.id === attemptId);
  attempt?.questionIds.forEach((id) => submitAnswer(attemptId, id, questionById(id)?.correctOptionId as string));
}

function passChapter(examId: string, subjectId: string, chapterId: string, correct = Infinity) {
  const start = startAssessment(examId, subjectId, chapterId);
  if (!start.ok) throw new Error(start.reason);
  start.attempt.questionIds.forEach((id, i) => {
    const q = questionById(id);
    const answer = i < correct ? q?.correctOptionId : q?.options.find((o) => o.id !== q.correctOptionId)?.id;
    setAssessmentAnswer(start.attempt.id, id, answer as string);
  });
  return submitAssessment(start.attempt.id);
}

beforeEach(() => {
  resetDemo();
  setHintProvider({ label: 'Test', getHint: async (c) => c.hintContext });
});

describe('seed data integrity (SRS 9.4)', () => {
  const chapterIds = new Set(chapters.map((c) => c.id));
  const subjectIds = new Set(subjects.map((s) => s.id));

  it('every question has exactly four distinct options and a valid answer', () => {
    for (const q of questions) {
      expect(q.options, q.id).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.text)).size, q.id).toBe(4);
      expect(q.options.map((o) => o.id), q.id).toContain(q.correctOptionId);
      expect([1, 2, 3], q.id).toContain(q.marks);
    }
  });

  it('question class, subject and chapter mappings agree', () => {
    for (const q of questions) {
      const chapter = chapters.find((c) => c.id === q.chapterId);
      expect(chapter?.subjectId, q.id).toBe(q.subjectId);
      expect(chapter?.class, q.id).toBe(q.class);
    }
  });

  it('ids are unique across the data files', () => {
    for (const list of [questions, descriptiveQuestions, chapters, subjects, videos, revision, studentErrors, avatars, seedStudents]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('error records reference an existing student, exam, subject, chapter and question', () => {
    expect(studentErrors.length).toBeGreaterThan(0);
    for (const e of studentErrors) {
      expect(seedStudents.some((s) => s.id === e.studentId), e.id).toBe(true);
      expect(exams.some((x) => x.id === e.examId), e.id).toBe(true);
      expect(subjectIds.has(e.subjectId), e.id).toBe(true);
      expect(chapterIds.has(e.chapterId), e.id).toBe(true);
      expect(descriptiveQuestions.some((q) => q.id === e.questionId) || questions.some((q) => q.id === e.questionId), e.id).toBe(true);
    }
  });

  it('a hint never contains the correct option text', () => {
    for (const q of questions) {
      const answer = q.options.find((o) => o.id === q.correctOptionId)?.text.toLowerCase() as string;
      if (answer.length > 3) expect(q.hintContext.toLowerCase().includes(answer), q.id).toBe(false);
    }
  });

  it('Classes 9 and 11 hold no CBSE PYQs; 10 and 12 hold some', () => {
    const all = [...questions, ...descriptiveQuestions];
    expect(all.filter((q) => [9, 11].includes(q.class) && q.source === 'CBSE PYQ')).toHaveLength(0);
    for (const cls of [10, 12]) expect(all.some((q) => q.class === cls && q.source === 'CBSE PYQ')).toBe(true);
  });

  it('every chapter reachable from an error has enough questions for an assessment', () => {
    for (const id of new Set(studentErrors.map((e) => e.chapterId))) {
      expect(questionsForChapter(id).length, id).toBeGreaterThanOrEqual(5);
    }
  });

  it('badges have thresholds from config', () => {
    for (const [id, t] of Object.entries(BADGE_THRESHOLDS)) {
      expect(allBadges().find((b) => b.id === id)?.threshold).toBe(t);
    }
  });

  it('remediation progress seed points at real errors', () => {
    for (const p of seedExtras.remediationProgress) {
      expect(studentErrors.some((e) => e.chapterId === p.chapterId && e.examId === p.examId)).toBe(true);
    }
  });

  it('the demo student matches the SRS profile example', () => {
    expect(coins()).toBe(1000);
    expect(points()).toBe(2450);
    expect(latestBadgeIdOf(getState(), ME)).toBe('quiz-champion');
  });
});

describe('points and transactions', () => {
  it('quiz reward formula reproduces the wireframe example of +120 for 10 correct', () => {
    expect(calculateQuizReward(10)).toEqual({ coins: 120, points: 120 });
  });

  it('a spend never touches earned points', () => {
    applyTransaction({ studentId: ME, type: 'HINT_PURCHASE', coinAmount: -100, pointsAmount: 0, reason: 'x', referenceId: null, dedupeKey: null });
    expect(coins()).toBe(900);
    expect(points()).toBe(2450);
  });

  it('refuses to take the balance below zero', () => {
    expect(() =>
      applyTransaction({ studentId: ME, type: 'HINT_PURCHASE', coinAmount: -1001, pointsAmount: 0, reason: 'x', referenceId: null, dedupeKey: null }),
    ).toThrow(InsufficientCoinsError);
    expect(coins()).toBe(1000);
  });

  it('a repeated dedupe key is ignored', () => {
    const input = { studentId: ME, type: 'QUIZ_REWARD' as const, coinAmount: 10, pointsAmount: 10, reason: 'x', referenceId: null, dedupeKey: 'k' };
    expect(applyTransaction(input)).not.toBeNull();
    expect(applyTransaction(input)).toBeNull();
    expect(coins()).toBe(1010);
  });

  it('every transaction records the required fields', () => {
    const result = applyTransaction({ studentId: ME, type: 'QUIZ_REWARD', coinAmount: 1, pointsAmount: 2, reason: 'because', referenceId: 'ref', dedupeKey: null });
    expect(result?.transaction).toMatchObject({ studentId: ME, type: 'QUIZ_REWARD', coinAmount: 1, pointsAmount: 2, reason: 'because', referenceId: 'ref' });
    expect(result?.transaction.id).toBeTruthy();
    expect(result?.transaction.createdAt).toBeTruthy();
  });
});

describe('badges', () => {
  it('crossing several thresholds at once awards all and the highest is latest', () => {
    setDemoPoints(50);
    expect(myBadges()).not.toContain('starter');
    const result = applyTransaction({ studentId: ME, type: 'REMEDIATION_REWARD', coinAmount: 0, pointsAmount: 260, reason: 'x', referenceId: null, dedupeKey: null });
    expect(result?.newBadges.map((b) => b.id)).toEqual(['starter', 'achiever', 'champion']);
    expect(latestBadgeIdOf(getState(), ME)).toBe('champion');
  });

  it('a badge is awarded only once', () => {
    setDemoPoints(95);
    applyTransaction({ studentId: ME, type: 'QUIZ_REWARD', coinAmount: 0, pointsAmount: 10, reason: 'x', referenceId: null, dedupeKey: null });
    applyTransaction({ studentId: ME, type: 'QUIZ_REWARD', coinAmount: 0, pointsAmount: 10, reason: 'x', referenceId: null, dedupeKey: null });
    expect(myBadges().filter((b) => b === 'starter')).toHaveLength(1);
  });
});

describe('leaderboard', () => {
  it('holds only the same class and section', () => {
    expect(getLeaderboard().every((r) => r.class === 12 && r.section === 'M')).toBe(true);
    setStudentContext(10, 'B');
    const rows = getLeaderboard();
    expect(rows.some((r) => r.studentId === ME)).toBe(true);
    expect(rows.every((r) => r.class === 10 && r.section === 'B')).toBe(true);
  });

  it('ranks by earned points, not coins', () => {
    setDemoCoins(999999);
    expect(getLeaderboard().find((r) => r.isCurrent)?.rank).toBe(3);
  });

  it('breaks ties by accuracy, then earlier achievement, then student id', () => {
    const add = (id: string, n: number) => applyTransaction({ studentId: id, type: 'QUIZ_REWARD', coinAmount: 0, pointsAmount: n, reason: 'x', referenceId: null, dedupeKey: null });
    add('STU-12M-009', 150);
    add('STU-12M-010', 240);
    const order = () => getLeaderboard().filter((r) => ['STU-12M-009', 'STU-12M-010'].includes(r.studentId)).map((r) => r.studentId);

    updateState((s) => ({ ...s, quizStats: { ...s.quizStats, 'STU-12M-009': { correct: 1, answered: 2 }, 'STU-12M-010': { correct: 3, answered: 4 } } }));
    expect(order()).toEqual(['STU-12M-010', 'STU-12M-009']);

    updateState((s) => ({
      ...s,
      quizStats: { ...s.quizStats, 'STU-12M-009': { correct: 1, answered: 2 }, 'STU-12M-010': { correct: 1, answered: 2 } },
      achievedAt: { ...s.achievedAt, 'STU-12M-009': '2026-02-01', 'STU-12M-010': '2026-01-01' },
    }));
    expect(order()).toEqual(['STU-12M-010', 'STU-12M-009']);

    updateState((s) => ({ ...s, achievedAt: { ...s.achievedAt, 'STU-12M-009': '2026-01-01', 'STU-12M-010': '2026-01-01' } }));
    expect(order()).toEqual(['STU-12M-009', 'STU-12M-010']);
  });

  it('nearby returns the student with neighbours', () => {
    const rows = nearby(getLeaderboard(), 1);
    expect(rows).toHaveLength(3);
    expect(rows[1].isCurrent).toBe(true);
  });
});

describe('flashcards', () => {
  const chapter = 'c12-chem-02';

  it('uses the configured count, without duplicates', () => {
    const attempt = startQuiz('c12-chem', chapter);
    expect(attempt?.questionIds).toHaveLength(FLASHCARD_QUESTION_COUNT);
    expect(new Set(attempt?.questionIds).size).toBe(FLASHCARD_QUESTION_COUNT);
  });

  it('uses the available count when a chapter is short', () => {
    expect(startQuiz('c12-chem', 'c12-chem-03')?.questionIds).toHaveLength(8);
  });

  it('a submitted answer cannot be changed', () => {
    const attempt = startQuiz('c12-chem', chapter);
    const id = attempt?.questionIds[0] as string;
    const q = questionById(id);
    const wrong = q?.options.find((o) => o.id !== q.correctOptionId)?.id as string;
    submitAnswer(attempt?.id as string, id, wrong);
    const again = submitAnswer(attempt?.id as string, id, q?.correctOptionId as string);
    expect(again?.selectedOptionId).toBe(wrong);
  });

  it('cannot be completed early, and pays once', () => {
    const attempt = startQuiz('c12-chem', chapter);
    const id = attempt?.id as string;
    expect(completeQuiz(id)).toBeNull();
    expect(coins()).toBe(1000);
    answerAllCorrect(id);
    completeQuiz(id);
    completeQuiz(id);
    const reward = QUIZ_REWARD.baseCoins + QUIZ_REWARD.coinsPerCorrect * FLASHCARD_QUESTION_COUNT;
    expect(coins()).toBe(1000 + reward);
    expect(getState().transactions.filter((t) => t.referenceId === id)).toHaveLength(1);
  });
});

describe('hints', () => {
  it('concurrent requests are charged once, and reopening is free', async () => {
    const attempt = startQuiz('c12-chem', 'c12-chem-02');
    const id = attempt?.id as string;
    const q = attempt?.questionIds[0] as string;
    await Promise.all([requestHint(id, q), requestHint(id, q), requestHint(id, q)]);
    expect(coins()).toBe(1000 - HINT_COST_COINS);
    await requestHint(id, q);
    expect(coins()).toBe(1000 - HINT_COST_COINS);
    expect(points()).toBe(2450);
    expect(getState().hintRequests).toHaveLength(1);
  });

  it('a new question or attempt is charged separately', async () => {
    const a = startQuiz('c12-chem', 'c12-chem-02');
    await requestHint(a?.id as string, a?.questionIds[0] as string);
    await requestHint(a?.id as string, a?.questionIds[1] as string);
    expect(coins()).toBe(1000 - 2 * HINT_COST_COINS);
  });

  it('does not call the provider without enough coins', async () => {
    let calls = 0;
    setHintProvider({ label: 'T', getHint: async () => { calls += 1; return 'x'; } });
    setDemoCoins(HINT_COST_COINS - 1);
    const a = startQuiz('c12-chem', 'c12-chem-02');
    const outcome = await requestHint(a?.id as string, a?.questionIds[0] as string);
    expect(outcome.status).toBe('insufficient');
    expect(calls).toBe(0);
    expect(coins()).toBe(HINT_COST_COINS - 1);
  });

  it('spending to exactly zero is allowed', async () => {
    setDemoCoins(HINT_COST_COINS);
    const a = startQuiz('c12-chem', 'c12-chem-02');
    const outcome = await requestHint(a?.id as string, a?.questionIds[0] as string);
    expect(outcome.status).toBe('shown');
    expect(coins()).toBe(0);
  });

  it('rejects a hint that reveals the answer, and survives a provider failure', async () => {
    const a = startQuiz('c12-chem', 'c12-chem-02');
    const id = a?.id as string;
    const [q1, q2] = a?.questionIds as string[];
    const question = questionById(q1);
    const answer = question?.options.find((o) => o.id === question.correctOptionId)?.text as string;
    setHintProvider({ label: 'T', getHint: async () => `The answer is ${answer}` });
    await requestHint(id, q1);
    expect(findHint(getState(), id, q1)?.hintText).toBe(question?.hintContext);

    setHintProvider({ label: 'T', getHint: async () => { throw new Error('down'); } });
    expect((await requestHint(id, q2)).status).toBe('shown');
    expect(findHint(getState(), id, q2)?.hintText).toBe(questionById(q2)?.hintContext);
  });

  it('screens short answers too, on every question in the bank', async () => {
    setDemoCoins(100000);
    const a = startQuiz('c12-chem', 'c12-chem-02');
    const id = a?.id as string;
    setHintProvider({
      label: 'T',
      getHint: async (c) => {
        const q = questions.find((x) => x.questionText === c.questionText);
        return `The answer is ${q?.options.find((o) => o.id === q.correctOptionId)?.text}.`;
      },
    });
    for (const q of a?.questionIds ?? []) {
      await requestHint(id, q);
      expect(findHint(getState(), id, q)?.hintText, q).toBe(questionById(q)?.hintContext);
    }
  });

  it('is unavailable once the question is answered', async () => {
    const a = startQuiz('c12-chem', 'c12-chem-02');
    const q = a?.questionIds[0] as string;
    submitAnswer(a?.id as string, q, questionById(q)?.correctOptionId as string);
    expect((await requestHint(a?.id as string, q)).status).toBe('unavailable');
    expect(coins()).toBe(1000);
  });

  it('the default provider returns the seeded context', async () => {
    const hint = await mockHintProvider.getHint({ questionText: 'q', subject: 's', chapter: 'c', marks: 1, hintContext: 'seeded' });
    expect(hint).toBe('seeded');
  });
});

describe('avatars', () => {
  it('buying deducts coins only and does not auto-equip', () => {
    const outcome = purchaseAvatar('scientist');
    expect(outcome.ok).toBe(true);
    expect(coins()).toBe(400);
    expect(points()).toBe(2450);
    expect(getState().avatarConfigs[ME].top).toBe('blue-hoodie');
  });

  it('blocks insufficient funds, repeat purchases and equipping unowned avatars', () => {
    expect(purchaseAvatar('super-learner')).toEqual({ ok: false, reason: 'insufficient' });
    expect(coins()).toBe(1000);
    expect(purchaseAvatar('blue-hoodie')).toEqual({ ok: false, reason: 'owned' });
    expect(equipAvatar('super-learner')).toBe(false);
    expect(getState().avatarConfigs[ME].top).toBe('blue-hoodie');
  });
});

describe('rooms', () => {
  it('codes are unique, and the host is the creator', () => {
    const codes = new Set(Array.from({ length: 50 }, () => createRoom('c12-chem', 'c12-chem-02')?.code));
    expect(codes.size).toBe(50);
    const room = createRoom('c12-chem', 'c12-chem-02');
    expect(room?.hostStudentId).toBe(ME);
  });

  it('enforces the minimum player count', () => {
    const room = createRoom('c12-chem', 'c12-chem-02');
    expect(startRoom(room?.id as string)).toMatch(/at least/);
    expect(roomById(getState(), room?.id as string)?.status).toBe('open');
  });

  it('only the host can start', () => {
    const outcome = joinRoom('CHEM12M');
    if (!outcome.ok) throw new Error(outcome.error);
    expect(startRoom(outcome.room.id)).toMatch(/host/i);
  });

  it('validates codes and class', () => {
    expect(joinRoom('').ok).toBe(false);
    expect(joinRoom('ZZZZZZ').ok).toBe(false);
    expect(joinRoom('PHYS12M').ok).toBe(false);
    setStudentContext(10, 'B');
    expect(joinRoom('CHEM12M').ok).toBe(false);
  });

  it('runs to results, rewarding every participant once and sharing tied ranks', () => {
    const room = createRoom('c12-chem', 'c12-chem-02') as NonNullable<ReturnType<typeof createRoom>>;
    let t = Date.now();
    for (let i = 0; i < 12; i += 1) {
      t += 2000;
      tickRoom(room.id, t);
    }
    expect(roomById(getState(), room.id)?.participants.length).toBeGreaterThanOrEqual(2);
    expect(startRoom(room.id)).toBeNull();

    const live = roomById(getState(), room.id);
    const attemptId = live?.attemptId as string;
    answerAllCorrect(attemptId);
    finishRoom(attemptId);
    finishRoom(attemptId);

    const paid = getState().transactions.filter((t2) => t2.type === 'MULTIPLAYER_REWARD' && t2.referenceId === room.id);
    expect(paid).toHaveLength(live?.participants.length as number);
    expect(new Set(paid.map((p) => p.studentId)).size).toBe(paid.length);
  });
});

describe('remediation', () => {
  const PRE = 'EX-PREBOARD';
  const CHEM = 'c12-chem';

  it('applies the pass rule exactly as the SRS examples', () => {
    expect(isPass(4, 5)).toBe(true);
    expect(isPass(3, 5)).toBe(false);
    expect(isPass(3, 4)).toBe(true);
    expect(isPass(2, 3)).toBe(false);
    expect(isPass(3, 3)).toBe(true);
  });

  it('lists only exams and subjects with errors', () => {
    expect(examsWithErrors().map((e) => e.name).sort()).toEqual(['Mid-term', 'Pre-board', 'Unit Test 1']);
    expect(subjectsWithErrors(PRE).map((s) => s.name)).toEqual(['Physics', 'Chemistry']);
  });

  it('the roadmap has every error chapter in syllabus order and no others', () => {
    const road = getRoadmap(getState(), PRE, CHEM);
    expect(road.total).toBe(10);
    const numbers = road.nodes.map((n) => n.chapter.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(getRoadmap(getState(), PRE, 'c12-bio').total).toBe(0);
  });

  it('assessments pick 5 bank questions, shuffle options, keep the answer mapping', () => {
    const start = startAssessment(PRE, CHEM, 'c12-chem-01');
    if (!start.ok) throw new Error(start.reason);
    expect(start.attempt.questions).toHaveLength(5);
    for (const q of start.attempt.questions) {
      const bank = questionById(q.questionId);
      expect(bank?.chapterId).toBe('c12-chem-01');
      expect([...q.optionIds].sort()).toEqual(bank?.options.map((o) => o.id).sort());
    }
  });

  it('refreshing mid-assessment keeps the same attempt', () => {
    const a = startAssessment(PRE, CHEM, 'c12-chem-01');
    const b = startAssessment(PRE, CHEM, 'c12-chem-01');
    if (!a.ok || !b.ok) throw new Error('start failed');
    expect(b.attempt.id).toBe(a.attempt.id);
  });

  it('locks later chapters at the service level too', () => {
    expect(startAssessment(PRE, CHEM, 'c12-chem-02')).toEqual({ ok: false, reason: 'locked' });
  });

  it('cannot submit a partly answered assessment', () => {
    const s = startAssessment(PRE, CHEM, 'c12-chem-01');
    if (!s.ok) throw new Error(s.reason);
    setAssessmentAnswer(s.attempt.id, s.attempt.questionIds[0], 'x');
    expect(submitAssessment(s.attempt.id)).toBeNull();
  });

  it('a fail leaves the chapter current, retries differ, and attempts are stored', () => {
    const r1 = passChapter(PRE, CHEM, 'c12-chem-01', 3);
    const r2 = passChapter(PRE, CHEM, 'c12-chem-01', 3);
    expect(r1?.attempt.passed).toBe(false);
    expect(r1?.attempt.questionIds.join()).not.toBe(r2?.attempt.questionIds.join());
    expect(getRoadmap(getState(), PRE, CHEM).nodes[0].state).toBe('current');
    expect(getState().remediationAttempts).toHaveLength(2);
  });

  it('a pass unlocks only the next chapter', () => {
    passChapter(PRE, CHEM, 'c12-chem-01', 4);
    const road = getRoadmap(getState(), PRE, CHEM);
    expect(road.nodes.slice(0, 3).map((n) => n.state)).toEqual(['completed', 'current', 'locked']);
    expect(road.percent).toBe(10);
    expect(coins()).toBe(1000);
  });

  it('pays once, only after the last chapter, per exam and subject', () => {
    const ids = getRoadmap(getState(), PRE, CHEM).nodes.map((n) => n.chapter.id);
    ids.slice(0, -1).forEach((id) => passChapter(PRE, CHEM, id));
    expect(coins()).toBe(1000);
    const last = passChapter(PRE, CHEM, ids.at(-1) as string);
    expect(last?.subjectCompleted).toBe(true);
    expect(coins()).toBe(1000 + REMEDIATION_COMPLETION_REWARD.coins);
    expect(points()).toBe(2450 + REMEDIATION_COMPLETION_REWARD.points);
    expect(getRoadmap(getState(), PRE, CHEM).percent).toBe(100);

    submitAssessment(last?.attempt.id as string);
    expect(coins()).toBe(1000 + REMEDIATION_COMPLETION_REWARD.coins);

    // The same subject in another exam is a separate reward.
    ['c12-chem-01', 'c12-chem-02'].forEach((id) => passChapter('EX-MIDTERM', CHEM, id));
    expect(coins()).toBe(1000 + 2 * REMEDIATION_COMPLETION_REWARD.coins);
  });

  it('progress in one exam does not leak into another', () => {
    passChapter(PRE, CHEM, 'c12-chem-01');
    expect(getRoadmap(getState(), 'EX-MIDTERM', CHEM).completed).toBe(0);
  });
});

describe('question bank labels', () => {
  it('Repeated needs at least two years of history', () => {
    expect(isRepeated({ years: [2023] })).toBe(false);
    expect(isRepeated({ years: [2019, 2023] })).toBe(true);
  });

  it('exam-only records stay out of Important Questions', () => {
    const items = chapters.flatMap((c) => bankForChapter(c.id));
    expect(items.some((i) => i.source === 'School exam')).toBe(false);
  });
});
