/* Domain entities, following SRS 9.1. */

export type AvatarSlot = 'hair' | 'hat' | 'top' | 'bottom' | 'shoes' | 'glasses' | 'bag';

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
  description: string;
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

export interface RemediationAttempt {
  id: string;
  progressId: string;
  questions: AssessmentQuestion[];
  questionIds: string[];
  answers: Record<string, string>;
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
