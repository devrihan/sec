/* Domain entities, following SRS 9.1. */

/** 'hero' is a full character that replaces the student's own build while it is on. */
export type AvatarSlot = 'hair' | 'hat' | 'top' | 'bottom' | 'shoes' | 'glasses' | 'bag' | 'hero';

/** Everything needed to rebuild a student's 3D character. */
export interface AvatarConfig {
  skin: string;
  hairColor: string;
  eyes: string;
  mouth: string;
  hair: string;
  hat: string | null;
  top: string;
  bottom: string;
  shoes: string;
  glasses: string | null;
  bag: string | null;
  /** A hero avatar worn over everything else. Optional so older saves still load. */
  hero?: string | null;
}

export interface Student {
  id: string;
  name: string;
  class: number;
  section: string;
  academicYear: string;
  avatar: AvatarConfig;
}

/** A row of students.json: identity plus the opening balances for the demo. */
export interface StudentSeed extends Omit<Student, 'academicYear' | 'avatar'> {
  /** Seed outfit: the id of a top in avatars.json. */
  activeAvatarId: string;
  openingCoins: number;
  openingPoints: number;
  /** Lifetime answered/correct, used only for the tie-break. */
  quizCorrect: number;
  quizAnswered: number;
  achievedAt: string;
  extraBadgeIds?: string[];
  isDemoStudent?: boolean;
}

export interface Subject {
  id: string;
  class: number;
  name: string;
  displayOrder: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  class: number;
  number: number;
  title: string;
  displayOrder: number;
}

export interface VideoResource {
  id: string;
  chapterId: string;
  title: string;
  provider: string;
  /** Set only for a verified video. Without it, Play opens videoUrl in a new tab. */
  videoId: string | null;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string | null;
  /** Video length, needed to place concepts on the timeline rail. */
  lengthSeconds?: number;
  /** Where each concept starts, taken from the chapter list in the video's YouTube description. */
  timeline?: VideoConcept[];
}

export interface VideoConcept {
  /** Seconds from the start of the video. */
  time: number;
  label: string;
}

export type SnippetType = 'concept' | 'definition' | 'formula' | 'reaction' | 'ncert';

export interface RevisionSnippet {
  id: string;
  chapterId: string;
  title: string;
  content: string | null;
  bullets: string[] | null;
  contentType: SnippetType;
  formula: string | null;
  displayOrder: number;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionSource = 'CBSE PYQ' | 'Important' | 'NCERT' | 'School exam';

/** MCQ bank. Always exactly four options (SRS 9.4). */
export interface Question {
  id: string;
  class: number;
  subjectId: string;
  chapterId: string;
  questionText: string;
  marks: number;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  hintContext: string;
  source: QuestionSource;
  years: number[];
  difficulty: Difficulty;
}

/**
 * Written-answer part of the question bank. Kept apart from Question so the
 * "exactly four options" rule stays true while Important Questions can still
 * show 3 and 5 mark items (SRS 5.2, 5.7).
 */
export interface DescriptiveQuestion {
  id: string;
  class: number;
  subjectId: string;
  chapterId: string;
  questionText: string;
  marks: number;
  questionType: string;
  answer: string;
  source: QuestionSource;
  years: number[];
}

export type QuizMode = 'solo' | 'multiplayer';

export interface QuizAnswer {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  mode: QuizMode;
  subjectId: string;
  chapterId: string;
  questionIds: string[];
  answers: QuizAnswer[];
  score: number;
  startedAt: string;
  completedAt: string | null;
  rewardClaimed: boolean;
  roomId: string | null;
}

export interface HintRequest {
  id: string;
  studentId: string;
  questionId: string;
  quizAttemptId: string;
  coinCost: number;
  hintText: string;
  createdAt: string;
}

export type TransactionType =
  | 'OPENING_BALANCE'
  | 'QUIZ_REWARD'
  | 'MULTIPLAYER_REWARD'
  | 'TEAM_BATTLE_REWARD'
  | 'HINT_PURCHASE'
  | 'AVATAR_PURCHASE'
  | 'REMEDIATION_REWARD'
  | 'DEMO_ADJUSTMENT';

/**
 * One ledger for both currencies, with the two amounts kept in separate fields
 * (SRS 2.4). Spending only ever touches coinAmount.
 */
export interface PointTransaction {
  id: string;
  studentId: string;
  type: TransactionType;
  coinAmount: number;
  pointsAmount: number;
  reason: string;
  referenceId: string | null;
  academicYear: string;
  createdAt: string;
  /** Unique per rewardable event. A second write with the same key is refused. */
  dedupeKey: string | null;
}

export interface Badge {
  id: string;
  name: string;
  /** Null for optional achievement badges. Filled from config for threshold badges. */
  threshold: number | null;
  imageUrl: string;
  /** How to earn it. */
  description: string;
  /** Why it matters, shown when the badge is opened. */
  meaning: string;
  group: 'fix' | 'practice' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold' | 'legendary';
  /** Names what the progress counts, for badges with more than one step. */
  unit?: string;
}

export interface StudentBadge {
  studentId: string;
  badgeId: string;
  earnedAt: string;
}

/** A marketplace item. A price of 0 means everyone has it from the start. */
export interface Avatar {
  id: string;
  name: string;
  slot: AvatarSlot;
  price: number;
  isAvailable: boolean;
  description: string;
  /** Heroes only: which collection it belongs to, from HERO_SERIES. */
  series?: string;
}

export interface StudentAvatar {
  studentId: string;
  avatarId: string;
  purchasedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  class: number;
  section: string;
  academicYear: string;
  avatar: AvatarConfig;
  latestBadgeId: string | null;
  totalEarnedPoints: number;
  accuracy: number;
  isCurrent: boolean;
}

export type RoomStatus = 'open' | 'in_progress' | 'finished' | 'closed';
export type ParticipantState = 'waiting' | 'ready';

export interface RoomParticipant {
  studentId: string;
  state: ParticipantState;
  isHost: boolean;
  /** Simulated players only: the score they finish on. */
  simulatedScore: number | null;
}

export interface QuizRoom {
  id: string;
  code: string;
  hostStudentId: string;
  status: RoomStatus;
  subjectId: string;
  chapterId: string;
  class: number;
  questionIds: string[];
  participants: RoomParticipant[];
  /** Simulated classmates still to arrive, in order. */
  pendingStudentIds: string[];
  nextSimEventAt: number | null;
  hostStartAt: number | null;
  attemptId: string | null;
}

export interface Exam {
  id: string;
  studentId: string;
  name: string;
  examDate: string;
}

export interface StudentError {
  id: string;
  studentId: string;
  examId: string;
  subjectId: string;
  chapterId: string;
  questionId: string;
  studentAnswer: string;
  expectedAnswer: string;
  errorType: string;
  explanation: string;
  formula: string | null;
  concept: string;
}

export type RemediationStatus = 'in_progress' | 'completed';

export interface RemediationProgress {
  id: string;
  studentId: string;
  examId: string;
  subjectId: string;
  chapterId: string;
  status: RemediationStatus;
  bestScore: number;
  completedAt: string | null;
}

export interface AssessmentQuestion {
  questionId: string;
  /** Option order for this attempt. Ids are unchanged, so correctOptionId still holds. */
  optionIds: string[];
}

/** How a re-asked or twin question is marked. */
export interface NumericPart {
  label: string;
  answer: number;
  unit: string;
}

export type FixMarking =
  /** Typed numbers, marked automatically with a small rounding tolerance (never on the sign). */
  | { kind: 'numeric'; parts: NumericPart[] }
  /** Free text, self-marked by ticking the marking points it covers. */
  | { kind: 'written'; keyPoints: string[] };

export type TwinQuestion = FixMarking & {
  id: string;
  questionText: string;
  /** Worked answer shown after marking. */
  solution: string;
};

/** For one recorded exam mistake: how to re-ask it, and twin questions on the same concept and format. */
export interface FixCheck {
  errorId: string;
  retry: FixMarking;
  twins: TwinQuestion[];
}

/** A student's answer to a numeric or written item. */
export interface FixResponse {
  /** Numeric: one entry per part. */
  values?: string[];
  /** Written: what the student wrote. */
  text?: string;
  /** Written: indexes of the marking points the student says they covered. */
  ticked?: number[];
  /** Written: the student has compared with the marking points, so the item is answered. */
  marked?: boolean;
  /** Indexes of "before you submit" checklist items ticked, for sign and unit slips. */
  checked?: number[];
}

export interface FormulaCard {
  id: string;
  front: string;
  back: string;
}

export interface SlipDrill {
  id: string;
  /** A worked line that may hide the same kind of slip. */
  working: string;
  correct: boolean;
  explanation: string;
}

export interface SchemeStep {
  step: string;
  marks: number;
  /** Whether the student's exam answer covered this step. */
  inExam: boolean;
}

/** The fix route for one recorded mistake; which parts it has depends on the kind of mistake. */
export interface MistakeFix {
  errorId: string;
  /** Conceptual: where to re-learn it. */
  concept?: { videoTime: number | null; snippetIds: string[] };
  /** Formula recall: cards reviewed on a spaced schedule. */
  formulaCards?: FormulaCard[];
  /** Sign or unit slip: a before-you-submit checklist and spot-the-slip drills. */
  checklist?: string[];
  drills?: SlipDrill[];
  /** Incomplete answer: the step-by-step marking scheme. */
  scheme?: SchemeStep[];
}

/** Spaced-repetition state of one formula card. */
export interface FormulaReview {
  /** 0 = new or forgotten; each "got it" moves it up a box and spaces the next review further out. */
  box: number;
  /** Date key (YYYY-MM-DD) the card is next due. */
  due: string;
  reviewedAt: string;
}

/** The re-ask of an original exam question, done before the answer is shown. */
export interface MistakeRetry {
  errorId: string;
  /** null when the student chose to see the answer without trying. */
  score: number | null;
  response: FixResponse | null;
  at: string;
}

export interface CheckTwin {
  twinId: string;
  errorId: string;
}

export interface RemediationAttempt {
  id: string;
  progressId: string;
  /** Twin questions for each mistake, asked first. Missing on attempts made before fix checks existed. */
  twins?: CheckTwin[];
  /** Answers to the twin questions, by twin id. */
  responses?: Record<string, FixResponse>;
  /** MCQ top-up (or, for chapters without fix data, the whole check). */
  questions: AssessmentQuestion[];
  questionIds: string[];
  answers: Record<string, string>;
  /** Can be fractional: written answers earn partial credit per marking point. */
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  attemptedAt: string;
  submittedAt: string | null;
}

export interface TimetableEntry {
  id: string;
  studentId: string;
  date: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  chapterId: string;
  topic: string;
  done: boolean;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: string;
}

export interface ScheduledExam {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export type NotificationType = 'timetable' | 'leaderboard' | 'learning' | 'achievement' | 'exam' | 'holiday';

export interface AppNotification {
  id: string;
  studentId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  dedupeKey: string;
  createdAt: string;
  readAt: string | null;
}

/** What the transaction popup shows (SRS 4.2). */
export interface TransactionResult {
  transaction: PointTransaction;
  previousCoins: number;
  newCoins: number;
  previousPoints: number;
  newPoints: number;
  previousRank: number;
  newRank: number;
  newBadges: Badge[];
}

/* Team Battle: two teams of three answer the same questions together. */

export type BattleStatus = 'forming' | 'countdown' | 'in_progress' | 'finished' | 'closed';
export type BattleTeamId = 'A' | 'B';
export type BattleLifeline = 'fifty' | 'time';

export interface BattleMember {
  studentId: string;
  ready: boolean;
}

export interface BattleTeam {
  id: BattleTeamId;
  code: string;
  name: string;
  /** Index into the emblem list: the team's colour and icon. */
  emblem: number;
  leaderId: string;
  members: BattleMember[];
  /** Simulated friends still to arrive, in order. */
  pendingStudentIds: string[];
  lifelinesUsed: BattleLifeline[];
}

/** What a team agreed on for one question. Null option means the timer ran out. */
export interface BattleTeamAnswer {
  questionId: string;
  optionId: string | null;
  correct: boolean;
  marks: number;
  secondsUsed: number;
  /** Each member's first pick, for the participation summary. */
  firstPicks: Record<string, string>;
}

/** Live state of the question on screen. */
export interface BattleRound {
  index: number;
  startedAt: number;
  /** Per team, since a +30s lifeline extends only that team's clock. */
  endsAt: Record<BattleTeamId, number>;
  /** Current pick per member of each team. */
  votes: Record<BattleTeamId, Record<string, string>>;
  firstPicks: Record<BattleTeamId, Record<string, string>>;
  locked: Record<BattleTeamId, boolean>;
  /** Options removed by a 50:50, per team. */
  hidden: Record<BattleTeamId, string[]>;
  /** Simulated actions due, in ms timestamps. */
  simAt: Record<string, number>;
  /** How often each simulated teammate has been asked to change their pick. */
  sways: Record<string, number>;
  /** Set when the round is over and the answer is on screen. */
  revealUntil: number | null;
}

export interface TeamBattle {
  id: string;
  status: BattleStatus;
  subjectId: string;
  class: number;
  questionIds: string[];
  teams: Record<BattleTeamId, BattleTeam>;
  /** Which team the student on this device belongs to. */
  homeTeam: BattleTeamId;
  nextSimEventAt: number | null;
  countdownEndsAt: number | null;
  round: BattleRound | null;
  answers: Record<BattleTeamId, BattleTeamAnswer[]>;
  createdAt: string;
  finishedAt: string | null;
}

/** One message on a team's private channel. Stored per team, never in a shared list. */
export interface TeamMessage {
  id: string;
  senderId: string;
  text: string;
  /** Quick reactions render as chips. */
  kind: 'text' | 'reaction' | 'system';
  at: number;
}
