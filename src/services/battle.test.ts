import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BATTLE_CALC_SECONDS, BATTLE_QUESTION_COUNT, BATTLE_SIMPLE_SECONDS, BATTLE_TEAM_SIZE, TEAM_BATTLE_REWARD } from '../config/rewards';
import { battleById, postTeamMessage, readTeamChannel, teamOf, voiceRoster } from './battleComms';
import {
  battleSummary,
  castVote,
  consensusOf,
  createBattle,
  DEMO_TEAM_CODE,
  finishBattle,
  joinBattle,
  lockInAnswer,
  roundView,
  scoreOf,
  secondsFor,
  setBattleRandom,
  setReady,
  setTeamName,
  spendLifeline,
  tickBattle,
} from './battleService';
import { questionById } from './catalog';
import { calculateTeamBattleReward } from './pointsService';
import { getState, resetDemo } from './store';
import type { TeamBattle } from '../types';

const ME = () => getState().demoStudentId;
const SUBJECT = 'c12-chem';

/** Seeded PRNG, so simulated friends behave the same every run. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let clock = 0;
const battle = (id: string) => battleById(getState(), id) as TeamBattle;

function advance(id: string, ms: number, step = 250) {
  for (let t = 0; t < ms; t += step) {
    clock += step;
    tickBattle(id, clock);
  }
}

/** Fills both teams, readies up and runs the countdown. */
function startBattle(): TeamBattle {
  const b = createBattle(SUBJECT, 'Mole Patrol', 0, clock) as TeamBattle;
  for (let i = 0; i < 40 && battle(b.id).status === 'forming'; i += 1) {
    advance(b.id, 1500);
    if (battle(b.id).teams.A.members.length === BATTLE_TEAM_SIZE) setReady(b.id, ME(), true, clock);
  }
  advance(b.id, 6000);
  expect(battle(b.id).status).toBe('in_progress');
  return battle(b.id);
}

/** Votes `pick` and waits for teammates to agree, then locks in. */
function playRound(id: string, pick: (b: TeamBattle) => string) {
  const index = battle(id).round?.index;
  castVote(id, ME(), pick(battle(id)), clock);
  for (let i = 0; i < 120 && !consensusOf(battle(id), 'A'); i += 1) advance(id, 500);
  expect(lockInAnswer(id, ME(), clock)).toBeNull();
  for (let i = 0; i < 200 && battle(id).status === 'in_progress' && battle(id).round?.index === index; i += 1) advance(id, 500);
}

const correctOf = (b: TeamBattle) => (questionById(b.questionIds[b.round?.index ?? 0]) as NonNullable<ReturnType<typeof questionById>>).correctOptionId;

beforeEach(() => {
  resetDemo();
  clock = 1_000_000;
  setBattleRandom(seeded(7));
});
afterEach(() => setBattleRandom(Math.random));

describe('team battle: setup', () => {
  it('makes the creator the leader, with unique codes and subject questions ordered by marks', () => {
    const b = createBattle(SUBJECT, 'Mole Patrol', 2, clock) as TeamBattle;
    expect(b.teams.A.leaderId).toBe(ME());
    expect(b.teams.A.name).toBe('Mole Patrol');
    expect(b.teams.A.code).not.toBe(b.teams.B.code);
    expect(b.teams.A.emblem).not.toBe(b.teams.B.emblem);
    expect(b.questionIds).toHaveLength(BATTLE_QUESTION_COUNT);
    expect(new Set(b.questionIds).size).toBe(b.questionIds.length);
    const qs = b.questionIds.map((id) => questionById(id));
    expect(qs.every((q) => q?.subjectId === SUBJECT && q.options.length === 4)).toBe(true);
    const marks = qs.map((q) => q?.marks ?? 0);
    expect(marks).toEqual([...marks].sort((x, y) => x - y));
  });

  it('gives calculation questions the longer timer', () => {
    expect(secondsFor({ marks: 1, difficulty: 'easy' })).toBe(BATTLE_SIMPLE_SECONDS);
    expect(secondsFor({ marks: 3, difficulty: 'medium' })).toBe(BATTLE_CALC_SECONDS);
    expect(secondsFor({ marks: 2, difficulty: 'hard' })).toBe(BATTLE_CALC_SECONDS);
  });

  it('checks team codes', () => {
    expect(joinBattle('').ok).toBe(false);
    expect(joinBattle('NOPE99')).toMatchObject({ ok: false, error: expect.stringMatching(/No team/) });
    const demo = joinBattle(DEMO_TEAM_CODE);
    expect(demo.ok).toBe(true);
    if (!demo.ok) return;
    expect(demo.battle.teams.A.members.map((m) => m.studentId)).toContain(ME());
    expect(demo.battle.teams.A.leaderId).not.toBe(ME());
    // Joining again returns the same battle instead of a new one.
    expect(joinBattle(DEMO_TEAM_CODE)).toMatchObject({ ok: true, battle: { id: demo.battle.id } });
    expect(joinBattle(demo.battle.teams.B.code)).toMatchObject({ ok: false, error: expect.stringMatching(/already on/) });
  });

  it('validates team names and locks them once the battle starts', () => {
    const b = createBattle(SUBJECT, 'Mole Patrol', 0, clock) as TeamBattle;
    expect(setTeamName(b.id, ME(), 'x')).toMatch(/2 to 24/);
    expect(setTeamName(b.id, ME(), b.teams.B.name)).toMatch(/already has/);
    expect(setTeamName(b.id, ME(), '  Valence   Vipers ')).toBeNull();
    expect(battle(b.id).teams.A.name).toBe('Valence Vipers');
    expect(setTeamName(b.id, b.teams.B.leaderId, 'Sneaky Rename')).toBeNull();
    expect(battle(b.id).teams.A.name).toBe('Valence Vipers');
    setReady(b.id, ME(), false, clock);
    const started = startBattle();
    expect(setTeamName(started.id, ME(), 'Too Late')).toMatch(/locked/);
  });

  it("doesn't start until both teams have three ready members", () => {
    const b = createBattle(SUBJECT, 'Mole Patrol', 0, clock) as TeamBattle;
    advance(b.id, 30_000);
    const waiting = battle(b.id);
    expect(waiting.teams.A.members).toHaveLength(3);
    expect(waiting.teams.B.members).toHaveLength(3);
    expect(waiting.status).toBe('forming');
    setReady(b.id, ME(), true, clock);
    expect(battle(b.id).status).toBe('countdown');
    setReady(b.id, ME(), false, clock);
    expect(battle(b.id).status).toBe('forming');
  });
});

describe('team battle: private communication', () => {
  it('keeps each team chat to its own members', () => {
    const b = startBattle();
    const rivalId = b.teams.B.members[0].studentId;
    const outsider = 'S-NOT-IN-BATTLE';

    expect(postTeamMessage(b.id, ME(), 'Answer is B, trust me', 'text', clock).ok).toBe(true);
    expect(postTeamMessage(b.id, rivalId, 'They will never know', 'text', clock).ok).toBe(true);

    const mine = readTeamChannel(getState(), b.id, ME()) ?? [];
    const theirs = readTeamChannel(getState(), b.id, rivalId) ?? [];
    expect(mine.some((m) => m.text === 'Answer is B, trust me')).toBe(true);
    expect(mine.some((m) => m.text === 'They will never know')).toBe(false);
    expect(theirs.some((m) => m.text === 'They will never know')).toBe(true);
    expect(theirs.some((m) => m.text === 'Answer is B, trust me')).toBe(false);
    expect(mine.every((m) => m.senderId === 'system' || teamOf(b, m.senderId) === 'A')).toBe(true);

    expect(readTeamChannel(getState(), b.id, outsider)).toBeNull();
    expect(postTeamMessage(b.id, outsider, 'hi', 'text', clock).ok).toBe(false);
  });

  it('puts only teammates in the voice channel', () => {
    const b = startBattle();
    const roster = voiceRoster(b, ME()) ?? [];
    expect(roster[0]).toBe(ME());
    expect(roster.sort()).toEqual(b.teams.A.members.map((m) => m.studentId).sort());
    expect(roster.some((id) => b.teams.B.members.some((m) => m.studentId === id))).toBe(false);
    expect(voiceRoster(b, 'S-NOT-IN-BATTLE')).toBeNull();
  });

  it("hides the other team's picks until the answer is revealed", () => {
    const b = startBattle();
    advance(b.id, 12_000);
    const view = roundView(battle(b.id), ME());
    const rivals = b.teams.B.members.map((m) => m.studentId);
    expect(Object.keys(view?.votes ?? {}).some((id) => rivals.includes(id))).toBe(false);
    expect(view?.answers.rival).toBeNull();
  });

  it('shows message counts for your own team only', () => {
    const b = startBattle();
    for (let i = 0; i < b.questionIds.length; i += 1) playRound(b.id, correctOf);
    const summary = battleSummary(getState(), battle(b.id), ME());
    expect(summary?.mine.members.every((m) => m.messages !== null)).toBe(true);
    expect(summary?.rival.members.every((m) => m.messages === null)).toBe(true);
  });
});

describe('team battle: rounds', () => {
  it('shows both teams the same question at the same time', () => {
    const b = startBattle();
    const rivalId = b.teams.B.members[0].studentId;
    expect(roundView(b, ME())?.question.id).toBe(b.questionIds[0]);
    expect(roundView(b, rivalId)?.question.id).toBe(b.questionIds[0]);
  });

  it('only locks in when all three agree', () => {
    const b = startBattle();
    const q = questionById(b.questionIds[0]);
    const wrong = q?.options.find((o) => o.id !== q.correctOptionId)?.id as string;
    castVote(b.id, ME(), wrong, clock);
    expect(lockInAnswer(b.id, ME(), clock)).toMatch(/same answer/);
  });

  it('scores nothing when the timer runs out without agreement', () => {
    const b = startBattle();
    advance(b.id, (secondsFor(questionById(b.questionIds[0]) as never) + 1) * 1000, 1000);
    const answer = battle(b.id).answers.A[0];
    expect(answer.optionId).toBeNull();
    expect(answer.marks).toBe(0);
  });

  it('allows each lifeline once per battle', () => {
    const b = startBattle();
    const q = questionById(b.questionIds[0]);
    expect(spendLifeline(b.id, ME(), 'fifty', clock)).toBeNull();
    const hidden = battle(b.id).round?.hidden.A ?? [];
    expect(hidden).toHaveLength(2);
    expect(hidden).not.toContain(q?.correctOptionId);
    expect(castVote(b.id, ME(), hidden[0], clock)).toMatch(/not available/);
    const before = battle(b.id).round?.endsAt.A ?? 0;
    expect(spendLifeline(b.id, ME(), 'time', clock)).toBeNull();
    expect(battle(b.id).round?.endsAt.A).toBe(before + 30_000);
    expect(battle(b.id).round?.endsAt.B).toBe(before);
    expect(spendLifeline(b.id, ME(), 'fifty', clock)).toMatch(/already used/);
  });
});

describe('team battle: results and rewards', () => {
  it('rewards all six players once, with the winner bonus for the winning team', () => {
    const b = startBattle();
    for (let i = 0; i < b.questionIds.length; i += 1) playRound(b.id, correctOf);
    const done = battle(b.id);
    expect(done.status).toBe('finished');

    finishBattle(b.id);
    const paid = getState().transactions.filter((t) => t.type === 'TEAM_BATTLE_REWARD' && t.referenceId === b.id);
    expect(paid).toHaveLength(6);
    expect(new Set(paid.map((t) => t.studentId)).size).toBe(6);

    const a = scoreOf(done, 'A');
    const bScore = scoreOf(done, 'B');
    const totalMarks = done.questionIds.reduce((s, id) => s + (questionById(id)?.marks ?? 0), 0);
    expect(a).toBe(totalMarks);
    expect(a).toBeGreaterThanOrEqual(bScore);
    const outcome = a > bScore ? 'won' : 'draw';
    const mine = paid.find((t) => t.studentId === ME());
    expect(mine?.pointsAmount).toBe(calculateTeamBattleReward(a, outcome).points);
    if (outcome === 'won') {
      expect(calculateTeamBattleReward(a, 'won').points - calculateTeamBattleReward(a, 'lost').points).toBe(TEAM_BATTLE_REWARD.winBonusPoints);
    }
    const badges = getState().studentBadges.filter((x) => x.studentId === ME()).map((x) => x.badgeId);
    expect(badges).toContain('dream-team');
    if (outcome === 'won') expect(badges).toContain('team-victory');

    const summary = battleSummary(getState(), done, ME());
    expect(summary?.rounds).toHaveLength(done.questionIds.length);
    expect(summary?.mine.correct).toBe(done.questionIds.length);
  });
});
