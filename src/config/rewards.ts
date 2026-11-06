/**
 * The single home for every tunable value (SRS 12.3, Appendix A, A-07).
 *
 * Values marked PLACEHOLDER are demonstration numbers. The SRS deliberately
 * leaves them open ("do not invent final business values"), so change them here
 * and nowhere else.
 */

export const DEFAULT_CLASS = 12;
export const DEFAULT_SECTION = 'M';
export const DEFAULT_ACADEMIC_YEAR = '2026–27';

/** Target 10–15. If a chapter has fewer questions, the available count is used. */
export const FLASHCARD_QUESTION_COUNT = 12;

export const HINT_COST_COINS = 20;
/** Simulated latency so the hint loading state is visible in the demo. */
export const HINT_LATENCY_MS = 600;

/** Allowed range 3–5 (SRS 7.8). */
export const REMEDIATION_QUESTION_COUNT = 5;
export const REMEDIATION_MIN_QUESTIONS = 3;
export const REMEDIATION_MAX_QUESTIONS = 5;
export const REMEDIATION_PASS_PERCENT = 75;
export const REMEDIATION_COMPLETION_REWARD = { coins: 250, points: 250 };

/** PLACEHOLDER. With these values, 10/12 correct gives +120, matching the SRS wireframe. */
export const QUIZ_REWARD = {
  baseCoins: 20,
  coinsPerCorrect: 10,
  basePoints: 20,
  pointsPerCorrect: 10,
};

/** PLACEHOLDER. */
export const MULTIPLAYER_REWARD = {
  baseCoins: 30,
  coinsPerCorrect: 10,
  basePoints: 30,
  pointsPerCorrect: 10,
  winnerBonusCoins: 50,
  winnerBonusPoints: 50,
};

/** Badge id to cumulative earned points needed. Names and art live in badges.json. */
export const BADGE_THRESHOLDS: Record<string, number> = {
  starter: 100,
  achiever: 200,
  champion: 300,
};

/** Wallet shows its low-balance state below this. */
export const LOW_BALANCE_COINS = 100;

export const ROOM_MIN_PARTICIPANTS = 2;
export const ROOM_MAX_PARTICIPANTS = 6;
export const ROOM_QUESTION_COUNT = 10;
/** Delay before each simulated classmate joins or readies up in the lobby. */
export const ROOM_SIM_STEP_MS = 1500;
/** Delay before a simulated host starts a room the student joined. */
export const ROOM_SIM_HOST_START_MS = 7000;

/** Reminders before a study session, in minutes. 45 before 3:00 PM is the brief's 2:15 PM. */
export const REMINDER_LEAD_MINUTES = [45, 15];
/** Days before an exam that a reminder is sent. */
export const EXAM_REMINDER_DAYS = [7, 3, 1];
export const HOLIDAY_REMINDER_DAYS = 3;
/** An unfinished quiz older than this gets a nudge. */
export const PENDING_QUIZ_AFTER_MINUTES = 30;
/** Days without a finished quiz before the "flashcards are waiting" nudge. */
export const FLASHCARD_INACTIVE_DAYS = 3;
/** How often time-based notifications are checked while the app is open. */
export const NOTIFICATION_TICK_MS = 15000;

/** Simulated latency so the leaderboard loading state is visible. */
export const LEADERBOARD_LATENCY_MS = 250;
