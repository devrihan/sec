import {
  BATTLE_CALC_SECONDS,
  BATTLE_COUNTDOWN_MS,
  BATTLE_LIFELINE_EXTRA_SECONDS,
  BATTLE_MIN_QUESTIONS,
  BATTLE_QUESTION_COUNT,
  BATTLE_REVEAL_MS,
  BATTLE_SIM_STEP_MS,
  BATTLE_SIMPLE_SECONDS,
  BATTLE_TEAM_SIZE,
} from '../config/rewards';
import { awardEarnedBadges } from './badgeService';
import { announceToTeam, battleById, messageCounts, postTeamMessage, SYSTEM_SENDER, teamOf } from './battleComms';
import { questionById, questions, seedStudentById, seedStudents, subjectById, subjects } from './catalog';
import { accuracyOf } from './leaderboardService';
import { awardTeamBattleReward, type BattleOutcome } from './pointsService';
import { shuffled } from './questionService';
import { getState, newId, nowIso, pushPopup, updateState, type AppState } from './store';
import { currentStudent } from './studentService';
import type {
  BattleLifeline,
  BattleRound,
  BattleTeam,
  BattleTeamAnswer,
  BattleTeamId,
  Question,
  TeamBattle,
} from '../types';

/**
 * Team Battle (Play with Friends). Two teams of three answer the same MCQs in the same
 * order; each team agrees on one answer per question. Friends and the opposing team are
 * simulated on this device, like rooms. To go real-time, keep these signatures: the
 * actions become messages to a server, and tickBattle becomes the server's game loop.
 */

export const DEMO_TEAM_CODE = 'SQUAD7';
export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 24;
export const EMBLEM_COUNT = 6;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LETTERS = ['A', 'B', 'C', 'D'];

let random: () => number = Math.random;
/** Tests only: makes the simulation predictable. */
export function setBattleRandom(fn: () => number): void {
  random = fn;
}

const between = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo));
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
export const rivalOf = (t: BattleTeamId): BattleTeamId => (t === 'A' ? 'B' : 'A');
const TEAMS: BattleTeamId[] = ['A', 'B'];

/* ---------- Names and codes ---------- */

const NAME_FIRST = ['Quantum', 'Valence', 'Neutron', 'Sigma', 'Atomic', 'Turbo', 'Prime', 'Vector', 'Cosmic', 'Photon', 'Infinite', 'Catalyst'];
const NAME_SECOND = ['Quokkas', 'Vipers', 'Ninjas', 'Squad', 'Owls', 'Comets', 'Rhinos', 'Wizards', 'Pandas', 'Falcons', 'Titans', 'Mavericks'];

export function randomTeamName(avoid: string[] = []): string {
  for (let i = 0; i < 20; i += 1) {
    const name = `${pick(NAME_FIRST)} ${pick(NAME_SECOND)}`;
    if (!avoid.includes(name)) return name;
  }
  return `Team ${between(10, 99)}`;
}

const liveBattles = (s: AppState) => (s.battles ?? []).filter((b) => b.status !== 'finished' && b.status !== 'closed');

function generateTeamCode(taken: Set<string>): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
    if (!taken.has(code) && code !== DEMO_TEAM_CODE) return code;
  }
}

const takenCodes = (s: AppState) => new Set(liveBattles(s).flatMap((b) => [b.teams.A.code, b.teams.B.code]));

/* ---------- Questions ---------- */

/** Problem-solving questions get the longer timer. */
export const isCalculation = (q: Pick<Question, 'marks' | 'difficulty'>) => q.marks >= 3 || q.difficulty === 'hard';
export const secondsFor = (q: Pick<Question, 'marks' | 'difficulty'>) => (isCalculation(q) ? BATTLE_CALC_SECONDS : BATTLE_SIMPLE_SECONDS);

const subjectPool = (subjectId: string) => questions.filter((q) => q.subjectId === subjectId);

/** Subjects of this class with enough MCQs for a battle. */
export function battleSubjects(cls: number) {
  return subjects
    .filter((s) => s.class === cls && subjectPool(s.id).length >= BATTLE_MIN_QUESTIONS)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** A random set from the whole subject, ordered 1 mark → 3 marks so the last round is the boss round. */
export function battleQuestionIds(subjectId: string): string[] {
  return shuffled(subjectPool(subjectId), random)
    .slice(0, BATTLE_QUESTION_COUNT)
    .sort((a, b) => a.marks - b.marks)
    .map((q) => q.id);
}

export interface BattleDetails {
  count: number;
  totalSeconds: number;
  totalMarks: number;
  calculations: number;
}

export function battleDetails(battle: Pick<TeamBattle, 'questionIds'>): BattleDetails {
  const qs = battle.questionIds.map(questionById).filter((q): q is Question => Boolean(q));
  return {
    count: qs.length,
    totalSeconds: qs.reduce((sum, q) => sum + secondsFor(q), 0),
    totalMarks: qs.reduce((sum, q) => sum + q.marks, 0),
    calculations: qs.filter(isCalculation).length,
  };
}

/* ---------- Teams ---------- */

/** Section classmates first, then the rest of the class, then anyone, so small sections still get two teams. */
function friendPool(meId: string, cls: number, section: string): string[] {
  const others = seedStudents.filter((s) => s.id !== meId);
  const section_ = others.filter((s) => s.class === cls && s.section === section);
  const cls_ = others.filter((s) => s.class === cls && s.section !== section);
  const rest = others.filter((s) => s.class !== cls);
  return [...shuffled(section_, random), ...shuffled(cls_, random), ...shuffled(rest, random)].map((s) => s.id);
}

const isSimulated = (studentId: string) => studentId !== getState().demoStudentId;
const nameOf = (id: string) => seedStudentById(id)?.name ?? id;
const isFull = (t: BattleTeam) => t.members.length >= BATTLE_TEAM_SIZE;

function makeTeam(id: BattleTeamId, code: string, leaderId: string, name: string, emblem: number, others: string[], pending: string[]): BattleTeam {
  return {
    id,
    code,
    name,
    emblem,
    leaderId,
    members: [leaderId, ...others].map((studentId) => ({ studentId, ready: isSimulated(studentId) && studentId === leaderId })),
    pendingStudentIds: pending,
    lifelinesUsed: [],
  };
}

function patchBattle(id: string, recipe: (b: TeamBattle) => TeamBattle): void {
  updateState((s) => ({ ...s, battles: (s.battles ?? []).map((b) => (b.id === id ? recipe(b) : b)) }));
}

function insertBattle(battle: TeamBattle): void {
  updateState((s) => ({ ...s, battles: [...(s.battles ?? []), battle] }));
}

function newBattle(subjectId: string, teamA: BattleTeam, teamB: BattleTeam, now: number): TeamBattle {
  return {
    id: newId('BTL'),
    status: 'forming',
    subjectId,
    class: currentStudent().class,
    questionIds: battleQuestionIds(subjectId),
    teams: { A: teamA, B: teamB },
    homeTeam: 'A',
    nextSimEventAt: now + BATTLE_SIM_STEP_MS,
    countdownEndsAt: null,
    round: null,
    answers: { A: [], B: [] },
    createdAt: nowIso(),
    finishedAt: null,
  };
}

/** The student creates a team and becomes its leader. The opposing team forms at the same time. */
export function createBattle(subjectId: string, teamName?: string, emblem = 0, now: number = Date.now()): TeamBattle | null {
  const me = currentStudent();
  if (!subjectById(subjectId) || subjectPool(subjectId).length < BATTLE_MIN_QUESTIONS) return null;
  const friends = friendPool(me.id, me.class, me.section);
  if (friends.length < BATTLE_TEAM_SIZE * 2 - 1) return null;

  const taken = takenCodes(getState());
  const codeA = generateTeamCode(taken);
  const codeB = generateTeamCode(new Set([...taken, codeA]));
  const name = cleanName(teamName ?? '') ?? randomTeamName();
  const teamA = makeTeam('A', codeA, me.id, name, emblem % EMBLEM_COUNT, [], friends.slice(0, 2));
  const teamB = makeTeam('B', codeB, friends[2], randomTeamName([name]), (emblem + 3) % EMBLEM_COUNT, [], friends.slice(3, 5));
  const battle = newBattle(subjectId, teamA, teamB, now);
  insertBattle(battle);
  announceToTeam(battle.id, 'A', `Team created. Share code ${codeA} with two friends to fill your team.`, now);
  return battle;
}

export type BattleJoinOutcome = { ok: true; battle: TeamBattle } | { ok: false; error: string };

/** Joins a friend's team by its code. DEMO_TEAM_CODE stands in for a code a friend shared. */
export function joinBattle(rawCode: string, now: number = Date.now()): BattleJoinOutcome {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a team code.' };
  const s = getState();
  const me = currentStudent(s);

  const live = liveBattles(s).find((b) => b.teams.A.code === code || b.teams.B.code === code);
  if (live) {
    const team = live.teams.A.code === code ? live.teams.A : live.teams.B;
    const mine = teamOf(live, me.id);
    if (mine === team.id) return { ok: true, battle: live };
    if (mine) return { ok: false, error: `You're already on ${live.teams[mine].name} in this battle.` };
    if (live.status !== 'forming') return { ok: false, error: `${team.name} has already started. Ask for a new code.` };
    return { ok: false, error: `${team.name} is full.` };
  }

  if (code !== DEMO_TEAM_CODE) {
    const ended = (s.battles ?? []).some((b) => b.teams.A.code === code || b.teams.B.code === code);
    return {
      ok: false,
      error: ended ? `The battle for team ${code} has finished. Create a new team to play again.` : `No team has the code ${code}. Check it and try again.`,
    };
  }

  const subject = battleSubjects(me.class)[0];
  const friends = friendPool(me.id, me.class, me.section);
  if (!subject || friends.length < BATTLE_TEAM_SIZE * 2 - 1) {
    return { ok: false, error: `Team battles need at least ${BATTLE_MIN_QUESTIONS} MCQs in one of your subjects.` };
  }
  const taken = takenCodes(s);
  const name = randomTeamName();
  const teamA = makeTeam('A', DEMO_TEAM_CODE, friends[0], name, 1, [friends[1], me.id], []);
  teamA.members = teamA.members.map((m) => ({ ...m, ready: m.studentId !== me.id }));
  const teamB = makeTeam('B', generateTeamCode(taken), friends[2], randomTeamName([name]), 4, [], friends.slice(3, 5));
  const battle = newBattle(subject.id, teamA, teamB, now);
  insertBattle(battle);
  announceToTeam(battle.id, 'A', `You joined ${name} with code ${DEMO_TEAM_CODE}.`, now);
  postTeamMessage(battle.id, friends[0], `Welcome! I picked ${subject.name}. Ready up when you're set.`, 'text', now);
  return { ok: true, battle };
}

function cleanName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim();
  return name.length >= TEAM_NAME_MIN && name.length <= TEAM_NAME_MAX ? name : null;
}

/** Any member can rename their own team before the battle starts. Returns an error or null. */
export function setTeamName(battleId: string, viewerId: string, raw: string): string | null {
  const battle = battleById(getState(), battleId);
  if (!battle) return 'This battle no longer exists.';
  const team = teamOf(battle, viewerId);
  if (!team) return 'Only team members can rename the team.';
  if (battle.status !== 'forming' && battle.status !== 'countdown') return 'Names are locked once the battle starts.';
  const name = cleanName(raw);
  if (!name) return `Use ${TEAM_NAME_MIN} to ${TEAM_NAME_MAX} characters.`;
  if (name.toLowerCase() === battle.teams[rivalOf(team)].name.toLowerCase()) return 'The other team already has that name.';
  patchBattle(battleId, (b) => ({ ...b, teams: { ...b.teams, [team]: { ...b.teams[team], name } } }));
  return null;
}

export function setTeamEmblem(battleId: string, viewerId: string, emblem: number): void {
  const battle = battleById(getState(), battleId);
  const team = battle && teamOf(battle, viewerId);
  if (!battle || !team || battle.status !== 'forming') return;
  const next = emblem % EMBLEM_COUNT;
  if (battle.teams[rivalOf(team)].emblem === next) return;
  patchBattle(battleId, (b) => ({ ...b, teams: { ...b.teams, [team]: { ...b.teams[team], emblem: next } } }));
}

const allReady = (b: TeamBattle) => TEAMS.every((t) => isFull(b.teams[t]) && b.teams[t].members.every((m) => m.ready));

export function setReady(battleId: string, viewerId: string, ready: boolean, now: number = Date.now()): void {
  const battle = battleById(getState(), battleId);
  const team = battle && teamOf(battle, viewerId);
  if (!battle || !team || (battle.status !== 'forming' && battle.status !== 'countdown')) return;
  patchBattle(battleId, (b) => {
    const next: TeamBattle = {
      ...b,
      teams: {
        ...b.teams,
        [team]: { ...b.teams[team], members: b.teams[team].members.map((m) => (m.studentId === viewerId ? { ...m, ready } : m)) },
      },
    };
    if (!ready) return { ...next, status: 'forming', countdownEndsAt: null };
    return allReady(next) ? { ...next, status: 'countdown', countdownEndsAt: now + BATTLE_COUNTDOWN_MS } : next;
  });
}

/** Leaving before the start closes the battle, since the other players are simulated. */
export function leaveBattle(battleId: string): void {
  const battle = battleById(getState(), battleId);
  if (!battle || (battle.status !== 'forming' && battle.status !== 'countdown')) return;
  patchBattle(battleId, (b) => ({ ...b, status: 'closed' }));
}

/* ---------- Simulation ---------- */

function skillOf(s: AppState, studentId: string, q: Question): number {
  const base = Math.min(0.88, Math.max(0.45, accuracyOf(s, studentId) || 0.6));
  return isCalculation(q) ? base - 0.12 : base;
}

/** A simulated pick: right with probability `skill`, otherwise a visible wrong option. */
function simPick(q: Question, skill: number, hidden: string[]): string {
  if (random() < skill) return q.correctOptionId;
  const wrong = q.options.filter((o) => o.id !== q.correctOptionId && !hidden.includes(o.id));
  return wrong.length ? pick(wrong).id : q.correctOptionId;
}

const letterOf = (q: Question, optionId: string) => LETTERS[q.options.findIndex((o) => o.id === optionId)] ?? '?';

function lobbyStep(b: TeamBattle, now: number): TeamBattle {
  type Event = { team: BattleTeamId; kind: 'join' | 'ready'; studentId: string };
  const events: Event[] = [];
  for (const t of TEAMS) {
    const team = b.teams[t];
    if (team.pendingStudentIds.length && !isFull(team)) events.push({ team: t, kind: 'join', studentId: team.pendingStudentIds[0] });
    for (const m of team.members) if (!m.ready && isSimulated(m.studentId)) events.push({ team: t, kind: 'ready', studentId: m.studentId });
  }
  if (events.length === 0) return { ...b, nextSimEventAt: null };

  const e = pick(events);
  const team = b.teams[e.team];
  let next: BattleTeam;
  if (e.kind === 'join') {
    next = { ...team, members: [...team.members, { studentId: e.studentId, ready: false }], pendingStudentIds: team.pendingStudentIds.slice(1) };
    announceToTeam(b.id, e.team, `${nameOf(e.studentId)} joined with code ${team.code}.`, now);
  } else {
    next = { ...team, members: team.members.map((m) => (m.studentId === e.studentId ? { ...m, ready: true } : m)) };
    if (e.team === homeTeamOf(b)) {
      postTeamMessage(b.id, e.studentId, pick(["Ready! Let's win this.", 'Ready. I call dibs on the calculations.', 'In! Talk it through before we lock anything.', 'Ready when you are.']), 'text', now);
    }
  }
  const updated: TeamBattle = { ...b, teams: { ...b.teams, [e.team]: next }, nextSimEventAt: now + BATTLE_SIM_STEP_MS };
  return allReady(updated) ? { ...updated, status: 'countdown', countdownEndsAt: now + BATTLE_COUNTDOWN_MS } : updated;
}

/** The team the student on this device plays for. */
export function homeTeamOf(b: TeamBattle): BattleTeamId {
  return teamOf(b, getState().demoStudentId) ?? b.homeTeam;
}

function startRound(b: TeamBattle, index: number, now: number): BattleRound {
  const q = questionById(b.questionIds[index]) as Question;
  const ms = secondsFor(q) * 1000;
  const simAt: Record<string, number> = {};
  for (const t of TEAMS) {
    for (const m of b.teams[t].members) if (isSimulated(m.studentId)) simAt[`vote:${m.studentId}`] = now + between(3000, 11000);
    const allSim = b.teams[t].members.every((m) => isSimulated(m.studentId));
    if (allSim) {
      simAt[`lock:${t}`] = now + between(14000, Math.max(16000, Math.round(ms * 0.45)));
      if (isCalculation(q) && !b.teams[t].lifelinesUsed.includes('fifty') && random() < 0.5) simAt[`fifty:${t}`] = now + between(4000, 9000);
    }
  }
  return {
    index,
    startedAt: now,
    endsAt: { A: now + ms, B: now + ms },
    votes: { A: {}, B: {} },
    firstPicks: { A: {}, B: {} },
    locked: { A: false, B: false },
    hidden: { A: [], B: [] },
    simAt,
    sways: {},
    revealUntil: null,
  };
}

/** The option all members picked, or null while they disagree or someone hasn't picked. */
export function consensusOf(b: TeamBattle, team: BattleTeamId): string | null {
  const votes = b.round?.votes[team] ?? {};
  const ids = b.teams[team].members.map((m) => votes[m.studentId]);
  return ids.every((id) => id && id === ids[0]) ? (ids[0] as string) : null;
}

function lockTeam(b: TeamBattle, team: BattleTeamId, optionId: string | null, now: number): void {
  const r = b.round as BattleRound;
  const q = questionById(b.questionIds[r.index]) as Question;
  const correct = optionId === q.correctOptionId;
  const answer: BattleTeamAnswer = {
    questionId: q.id,
    optionId,
    correct,
    marks: correct ? q.marks : 0,
    secondsUsed: Math.max(0, Math.round((Math.min(now, r.endsAt[team]) - r.startedAt) / 1000)),
    firstPicks: { ...r.firstPicks[team] },
  };
  b.answers[team] = [...b.answers[team], answer];
  r.locked[team] = true;
  // Once one team has locked, the simulated team doesn't keep everyone waiting.
  const rival = rivalOf(team);
  const key = `lock:${rival}`;
  if (!r.locked[rival] && r.simAt[key]) r.simAt[key] = Math.min(r.simAt[key], now + between(1500, 5000));
}

function applyFifty(b: TeamBattle, team: BattleTeamId, now: number): string[] {
  const r = b.round as BattleRound;
  const q = questionById(b.questionIds[r.index]) as Question;
  const wrong = shuffled(q.options.filter((o) => o.id !== q.correctOptionId), random).slice(0, 2).map((o) => o.id);
  r.hidden[team] = wrong;
  for (const [id, opt] of Object.entries(r.votes[team])) {
    if (!wrong.includes(opt)) continue;
    delete r.votes[team][id];
    // A simulated teammate whose pick was removed picks again.
    if (isSimulated(id)) r.simAt[`vote:${id}`] = now + between(1500, 4000);
  }
  b.teams[team] = { ...b.teams[team], lifelinesUsed: [...b.teams[team].lifelinesUsed, 'fifty'] };
  return wrong;
}

function simVote(s: AppState, b: TeamBattle, studentId: string, now: number): void {
  const r = b.round as BattleRound;
  const team = teamOf(b, studentId) as BattleTeamId;
  const q = questionById(b.questionIds[r.index]) as Question;
  if (r.locked[team]) return;
  const option = simPick(q, skillOf(s, studentId, q), r.hidden[team]);
  r.votes[team][studentId] = option;
  r.firstPicks[team][studentId] ??= option;
  if (team !== homeTeamOf(b)) return;

  const letter = letterOf(q, option);
  const firstSpeaker = Object.keys(r.firstPicks[team]).filter((id) => isSimulated(id)).length === 1;
  const lines = [`I'm going with ${letter}.`, `${letter} looks right to me.`, `Pretty sure it's ${letter}.`, `My pick: ${letter}. Anyone disagree?`];
  const reasoning = firstSpeaker && q.hintContext && random() < 0.4 ? ` ${q.hintContext}` : '';
  postTeamMessage(b.id, studentId, `${pick(lines)}${reasoning}`, 'text', now);
  const human = r.votes[team][getState().demoStudentId];
  if (human && human !== option) r.simAt[`sway:${studentId}`] = now + between(2500, 6000);
}

function simSway(b: TeamBattle, studentId: string, now: number): void {
  const r = b.round as BattleRound;
  const team = teamOf(b, studentId) as BattleTeamId;
  const human = r.votes[team][getState().demoStudentId];
  const mine = r.votes[team][studentId];
  if (r.locked[team] || !human || human === mine) return;
  const q = questionById(b.questionIds[r.index]) as Question;
  const tries = (r.sways[studentId] ?? 0) + 1;
  r.sways[studentId] = tries;
  if (tries >= 2 || random() < 0.6) {
    r.votes[team][studentId] = human;
    postTeamMessage(b.id, studentId, pick([`OK, switching to ${letterOf(q, human)}.`, `Fair point. ${letterOf(q, human)} it is.`, `Fine, going with you on ${letterOf(q, human)}.`]), 'text', now);
  } else {
    postTeamMessage(b.id, studentId, pick([`Hmm, I still think ${letterOf(q, mine)}. Can you explain yours?`, `Not sure about ${letterOf(q, human)}. Check it once more?`]), 'text', now);
    r.simAt[`sway:${studentId}`] = now + between(5000, 9000);
  }
}

function simLock(s: AppState, b: TeamBattle, team: BattleTeamId, now: number): void {
  const r = b.round as BattleRound;
  if (r.locked[team]) return;
  const q = questionById(b.questionIds[r.index]) as Question;
  const ids = b.teams[team].members.map((m) => m.studentId);
  const teamSkill = Math.min(0.92, ids.reduce((sum, id) => sum + skillOf(s, id, q), 0) / ids.length + 0.1);
  const option = simPick(q, teamSkill, r.hidden[team]);
  for (const id of ids) {
    r.votes[team][id] = option;
    r.firstPicks[team][id] ??= option;
  }
  lockTeam(b, team, option, now);
}

function roundStep(b: TeamBattle, now: number): TeamBattle | 'finish' {
  const r = b.round as BattleRound;
  if (r.revealUntil !== null) {
    if (now < r.revealUntil) return b;
    if (r.index + 1 >= b.questionIds.length) return 'finish';
    return { ...b, round: startRound(b, r.index + 1, now) };
  }

  const s = getState();
  const due = Object.entries(r.simAt).filter(([, at]) => at <= now).sort((x, y) => x[1] - y[1]);
  for (const [key, at] of due) {
    delete r.simAt[key];
    const [kind, target] = key.split(':');
    if (kind === 'vote') simVote(s, b, target, at);
    else if (kind === 'sway') simSway(b, target, at);
    else if (kind === 'lock') simLock(s, b, target as BattleTeamId, at);
    else if (kind === 'fifty' && !r.locked[target as BattleTeamId]) applyFifty(b, target as BattleTeamId, at);
  }

  for (const t of TEAMS) {
    if (r.locked[t] || now < r.endsAt[t]) continue;
    const agreed = consensusOf(b, t);
    lockTeam(b, t, agreed, r.endsAt[t]);
    announceToTeam(b.id, t, agreed ? "Time's up. Your agreed answer was submitted." : "Time's up. The team hadn't agreed, so no marks this round.", now);
  }
  if (r.locked.A && r.locked.B) r.revealUntil = now + BATTLE_REVEAL_MS;
  return b;
}

/** Advances the battle. Safe to call often: it only writes when something is due. */
export function tickBattle(battleId: string, now: number = Date.now()): void {
  const battle = battleById(getState(), battleId);
  if (!battle) return;

  if (battle.status === 'forming') {
    if (battle.nextSimEventAt !== null && now >= battle.nextSimEventAt) {
      const next = lobbyStep(battle, now);
      patchBattle(battleId, () => next);
    }
    return;
  }
  if (battle.status === 'countdown') {
    if (battle.countdownEndsAt !== null && now >= battle.countdownEndsAt) {
      patchBattle(battleId, (b) => ({ ...b, status: 'in_progress', countdownEndsAt: null, round: startRound(b, 0, now) }));
    }
    return;
  }
  if (battle.status !== 'in_progress' || !battle.round) return;

  const r = battle.round;
  const somethingDue =
    (r.revealUntil !== null && now >= r.revealUntil) ||
    (r.revealUntil === null && (Object.values(r.simAt).some((at) => at <= now) || TEAMS.some((t) => !r.locked[t] && now >= r.endsAt[t])));
  if (!somethingDue) return;

  const result = roundStep(structuredClone(battle), now);
  if (result === 'finish') finishBattle(battleId);
  else patchBattle(battleId, () => result);
}

/* ---------- The student's actions ---------- */

type Guard = { battle: TeamBattle; team: BattleTeamId; round: BattleRound; q: Question } | string;

function guard(battleId: string, viewerId: string): Guard {
  const battle = battleById(getState(), battleId);
  if (!battle) return 'This battle no longer exists.';
  const team = teamOf(battle, viewerId);
  if (!team) return "You aren't on a team in this battle.";
  if (battle.status !== 'in_progress' || !battle.round) return 'The battle is not in progress.';
  if (battle.round.revealUntil !== null || battle.round.locked[team]) return 'Your team has already answered this question.';
  return { battle, team, round: battle.round, q: questionById(battle.questionIds[battle.round.index]) as Question };
}

/** The student's own pick. Teammates who disagree will argue or come round. */
export function castVote(battleId: string, viewerId: string, optionId: string, now: number = Date.now()): string | null {
  const g = guard(battleId, viewerId);
  if (typeof g === 'string') return g;
  if (!g.q.options.some((o) => o.id === optionId) || g.round.hidden[g.team].includes(optionId)) return 'That option is not available.';
  const b = structuredClone(g.battle);
  const r = b.round as BattleRound;
  r.votes[g.team][viewerId] = optionId;
  r.firstPicks[g.team][viewerId] ??= optionId;
  for (const m of b.teams[g.team].members) {
    const id = m.studentId;
    if (id !== viewerId && r.votes[g.team][id] && r.votes[g.team][id] !== optionId && !r.simAt[`sway:${id}`]) {
      r.simAt[`sway:${id}`] = now + between(2500, 6000);
    }
  }
  patchBattle(battleId, () => b);
  return null;
}

/** Submits the team's answer. All three members must have picked the same option. */
export function lockInAnswer(battleId: string, viewerId: string, now: number = Date.now()): string | null {
  const g = guard(battleId, viewerId);
  if (typeof g === 'string') return g;
  const agreed = consensusOf(g.battle, g.team);
  if (!agreed) return 'All three teammates need to pick the same answer first.';
  const b = structuredClone(g.battle);
  lockTeam(b, g.team, agreed, now);
  const r = b.round as BattleRound;
  if (r.locked.A && r.locked.B) r.revealUntil = now + BATTLE_REVEAL_MS;
  patchBattle(battleId, () => b);
  return null;
}

export const LIFELINE_LABEL: Record<BattleLifeline, string> = { fifty: '50:50', time: `+${BATTLE_LIFELINE_EXTRA_SECONDS}s` };

/** Each team has one of each per battle. */
export function spendLifeline(battleId: string, viewerId: string, kind: BattleLifeline, now: number = Date.now()): string | null {
  const g = guard(battleId, viewerId);
  if (typeof g === 'string') return g;
  if (g.battle.teams[g.team].lifelinesUsed.includes(kind)) return `Your team has already used ${LIFELINE_LABEL[kind]}.`;
  const b = structuredClone(g.battle);
  const r = b.round as BattleRound;
  if (kind === 'fifty') {
    applyFifty(b, g.team, now);
  } else {
    r.endsAt[g.team] += BATTLE_LIFELINE_EXTRA_SECONDS * 1000;
    b.teams[g.team] = { ...b.teams[g.team], lifelinesUsed: [...b.teams[g.team].lifelinesUsed, 'time'] };
  }
  patchBattle(battleId, () => b);
  announceToTeam(battleId, g.team, `${nameOf(viewerId)} used ${LIFELINE_LABEL[kind]}.`, now);
  return null;
}

/* ---------- What a viewer may see ---------- */

/**
 * The round as one team sees it: their own votes and options, and only whether the
 * other team has locked in. The other team's picks stay hidden until the reveal.
 */
export interface RoundView {
  index: number;
  question: Question;
  team: BattleTeamId;
  votes: Record<string, string>;
  hidden: string[];
  endsAt: number;
  startedAt: number;
  lockedMine: boolean;
  lockedRival: boolean;
  consensus: string | null;
  revealed: boolean;
  /** Both answers, only once revealed. */
  answers: { mine: BattleTeamAnswer | null; rival: BattleTeamAnswer | null };
}

export function roundView(b: TeamBattle, viewerId: string): RoundView | null {
  const team = teamOf(b, viewerId);
  const r = b.round;
  if (!team || !r) return null;
  const revealed = r.revealUntil !== null;
  const rival = rivalOf(team);
  return {
    index: r.index,
    question: questionById(b.questionIds[r.index]) as Question,
    team,
    votes: r.votes[team],
    hidden: r.hidden[team],
    endsAt: r.endsAt[team],
    startedAt: r.startedAt,
    lockedMine: r.locked[team],
    lockedRival: r.locked[rival],
    consensus: consensusOf(b, team),
    revealed,
    answers: {
      mine: r.locked[team] ? (b.answers[team][r.index] ?? null) : null,
      rival: revealed ? (b.answers[rival][r.index] ?? null) : null,
    },
  };
}

/** Rounds whose result both teams can see. */
export function revealedCount(b: TeamBattle): number {
  if (b.status === 'finished') return b.questionIds.length;
  if (!b.round) return 0;
  return b.round.index + (b.round.revealUntil !== null ? 1 : 0);
}

export function scoreOf(b: TeamBattle, team: BattleTeamId): number {
  return b.answers[team].slice(0, revealedCount(b)).reduce((sum, a) => sum + a.marks, 0);
}

/** Correct answers in a row, ending with the latest revealed round. */
export function streakOf(b: TeamBattle, team: BattleTeamId): number {
  const seen = b.answers[team].slice(0, revealedCount(b));
  let n = 0;
  for (let i = seen.length - 1; i >= 0 && seen[i].correct; i -= 1) n += 1;
  return n;
}

/* ---------- Finish and results ---------- */

export function outcomeFor(b: TeamBattle, team: BattleTeamId): BattleOutcome {
  const mine = b.answers[team].reduce((s, a) => s + a.marks, 0);
  const theirs = b.answers[rivalOf(team)].reduce((s, a) => s + a.marks, 0);
  return mine > theirs ? 'won' : mine === theirs ? 'draw' : 'lost';
}

export function battlesWonBy(s: AppState, studentId: string): number {
  return (s.battles ?? []).filter((b) => {
    const team = b.status === 'finished' ? teamOf(b, studentId) : null;
    return team !== null && outcomeFor(b, team) === 'won';
  }).length;
}

/** Runs once, after the last question. Every player is rewarded through the ledger, once each. */
export function finishBattle(battleId: string): TeamBattle | null {
  const battle = battleById(getState(), battleId);
  if (!battle) return null;
  if (battle.status === 'finished') return battle;
  patchBattle(battleId, (b) => ({ ...b, status: 'finished', round: null, finishedAt: nowIso() }));
  const done = battleById(getState(), battleId) as TeamBattle;
  const me = getState().demoStudentId;

  const awards = TEAMS.flatMap((t) => {
    const outcome = outcomeFor(done, t);
    const marks = done.answers[t].reduce((s, a) => s + a.marks, 0);
    const perfect = done.answers[t].length === done.questionIds.length && done.answers[t].every((a) => a.correct);
    const badges = [...(outcome === 'won' ? ['team-victory'] : []), ...(perfect ? ['dream-team'] : [])];
    return done.teams[t].members.map((m) => ({ studentId: m.studentId, team: done.teams[t], outcome, marks, badges }));
  });
  // The student's own reward goes last, so the popup shows the leaderboard after everyone's points.
  awards.sort((a, b) => Number(a.studentId === me) - Number(b.studentId === me));
  for (const a of awards) {
    const result = awardTeamBattleReward(a.studentId, battleId, a.team.name, a.marks, a.outcome, a.badges);
    if (a.studentId === me && result) pushPopup({ ...result, newBadges: [...result.newBadges, ...awardEarnedBadges()] });
  }
  return done;
}

export interface MemberSummary {
  studentId: string;
  name: string;
  isLeader: boolean;
  isCurrent: boolean;
  /** Questions where their own first pick was right. */
  firstPickCorrect: number;
  /** Null for the other team: their chat stays private. */
  messages: number | null;
  coins: number;
  points: number;
}

export interface TeamSummary {
  team: BattleTeam;
  outcome: BattleOutcome;
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  members: MemberSummary[];
  mvpId: string | null;
}

export interface BattleSummary {
  mine: TeamSummary;
  rival: TeamSummary;
  rounds: { question: Question; mine: BattleTeamAnswer | undefined; rival: BattleTeamAnswer | undefined }[];
}

export function battleSummary(s: AppState, b: TeamBattle, viewerId: string): BattleSummary | null {
  const team = teamOf(b, viewerId);
  if (!team) return null;
  const counts = messageCounts(s, b.id, viewerId) ?? {};

  const summarise = (t: BattleTeamId): TeamSummary => {
    const answers = b.answers[t];
    const members = b.teams[t].members.map((m) => {
      const txn = s.transactions.find((x) => x.dedupeKey === `battle:${b.id}:${m.studentId}`);
      return {
        studentId: m.studentId,
        name: nameOf(m.studentId),
        isLeader: m.studentId === b.teams[t].leaderId,
        isCurrent: m.studentId === viewerId,
        firstPickCorrect: answers.filter((a) => a.firstPicks[m.studentId] && a.firstPicks[m.studentId] === questionById(a.questionId)?.correctOptionId).length,
        messages: t === team ? (counts[m.studentId] ?? 0) : null,
        coins: txn?.coinAmount ?? 0,
        points: txn?.pointsAmount ?? 0,
      };
    });
    const best = [...members].sort((x, y) => y.firstPickCorrect - x.firstPickCorrect || (y.messages ?? 0) - (x.messages ?? 0))[0];
    return {
      team: b.teams[t],
      outcome: outcomeFor(b, t),
      score: answers.reduce((sum, a) => sum + a.marks, 0),
      correct: answers.filter((a) => a.correct).length,
      incorrect: answers.filter((a) => a.optionId && !a.correct).length,
      unanswered: answers.filter((a) => !a.optionId).length,
      members,
      mvpId: best && best.firstPickCorrect > 0 ? best.studentId : null,
    };
  };

  return {
    mine: summarise(team),
    rival: summarise(rivalOf(team)),
    rounds: b.questionIds.map((id, i) => ({ question: questionById(id) as Question, mine: b.answers[team][i], rival: b.answers[rivalOf(team)][i] })),
  };
}

export { SYSTEM_SENDER };
