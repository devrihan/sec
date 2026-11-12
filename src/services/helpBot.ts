import { companionLines } from './companionService';
import { getLeaderboard } from './leaderboardService';
import type { AppState } from './store';
import { coinsOf, earnedPointsOf } from './studentService';

/**
 * The help chat's brain: a guide to the app, matched by keywords, with a few answers
 * worked out from the student's own data. It runs entirely on this device. To use a
 * language model instead, call a server-side proxy from `askHelpBot` and fall back to
 * this guide when it fails, as hintService does for hints.
 */

export interface HelpLink {
  label: string;
  to: string;
}

export interface HelpAnswer {
  topicId: string;
  text: string;
  links: HelpLink[];
  /** Follow-up questions to offer as chips. */
  followUps: string[];
}

interface Topic {
  id: string;
  /** The question as shown on a chip. */
  question: string;
  keywords: string[];
  answer: (s: AppState) => Omit<HelpAnswer, 'topicId' | 'followUps'>;
  followUps?: string[];
}

const TOPICS: Topic[] = [
  {
    id: 'navigate',
    question: 'How do I find my way around?',
    keywords: ['navigate', 'navigation', 'around', 'way around', 'menu', 'sidebar', 'tour', 'everything', 'sections', 'lost', 'get started'],
    answer: () => ({
      text:
        'The menu on the left (or the bar at the bottom on a phone) has everything:\n' +
        '• Dashboard: your marks to win back, today\'s plan and what to do next\n' +
        '• Remediation: fix the mistakes from your exams, chapter by chapter\n' +
        '• Preparation: videos, revision notes and important questions\n' +
        '• Flashcards: quizzes, rooms with friends and Team Battle\n' +
        '• Timetable: plan your study sessions\n' +
        '• Leaderboard, Avatar store and My profile are under "Your progress".\n' +
        'The bell at the top shows notifications, and the coin counter shows your coins.',
      links: [
        { label: 'Remediation', to: '/remediation' },
        { label: 'Preparation', to: '/preparation' },
        { label: 'Flashcards', to: '/flashcards' },
      ],
    }),
    followUps: ['What should I do next?', 'Where are my mistakes to fix?', 'How do I earn coins?'],
  },
  {
    id: 'next',
    question: 'What should I do next?',
    keywords: ['next', 'should', 'todo', 'to do', 'suggest', 'recommend', 'today', 'now', 'bored'],
    answer: (s) => {
      const lines = companionLines(s).filter((l) => l.kind === 'nudge' || l.kind === 'practice').slice(0, 3);
      if (lines.length === 0) {
        return { text: "You're all caught up! Try a quick flashcard quiz to keep your streak going.", links: [{ label: 'Flashcards', to: '/flashcards' }] };
      }
      return {
        text: `Here's what I'd do, in order:\n${lines.map((l, i) => `${i + 1}. ${l.text}`).join('\n')}`,
        links: lines.filter((l) => l.href && l.cta).map((l) => ({ label: l.cta as string, to: l.href as string })),
      };
    },
    followUps: ['Where are my mistakes to fix?', 'How do I plan my study?'],
  },
  {
    id: 'remediation',
    question: 'Where are my mistakes to fix?',
    keywords: ['mistake', 'mistakes', 'fix', 'remediation', 'roadmap', 'exam', 'marks', 'wrong', 'weak', 'assessment', 'retry', 'win back'],
    answer: () => ({
      text:
        'Open Remediation. Pick an exam and a subject to see your roadmap: one stop per chapter where you lost marks, biggest wins first. ' +
        'In each chapter you review your mistakes, try the original question again, then pass a short check (75% or more) to unlock the next chapter. ' +
        'You can retry as many times as you like.',
      links: [
        { label: 'Open Remediation', to: '/remediation' },
        { label: 'Formula review', to: '/remediation/formulas' },
      ],
    }),
    followUps: ['How do I earn coins?', 'Where are revision notes?'],
  },
  {
    id: 'preparation',
    question: 'Where are revision notes?',
    keywords: ['revision', 'notes', 'video', 'videos', 'learn', 'study', 'chapter', 'important', 'questions', 'pyq', 'prepare', 'preparation', 'saved', 'written'],
    answer: () => ({
      text:
        'Go to Preparation, pick a subject, then a chapter. Each chapter has a video, revision notes (swipe left to save one), ' +
        'Important Questions with marks and source filters, and written practice. Your saved notes are under "Saved".',
      links: [
        { label: 'Preparation', to: '/preparation' },
        { label: 'Saved notes', to: '/preparation/saved' },
      ],
    }),
    followUps: ['How do flashcard quizzes work?', 'How do I plan my study?'],
  },
  {
    id: 'flashcards',
    question: 'How do flashcard quizzes work?',
    keywords: ['flashcard', 'flashcards', 'quiz', 'quizzes', 'mcq', 'hint', 'hints', 'practice', 'practise'],
    answer: () => ({
      text:
        'Flashcards → pick a subject and chapter → Start quiz. Answer each MCQ to flip the card and see why. ' +
        'Stuck? A hint costs 20 coins. Finish all the questions to collect your coins and points; unfinished quizzes wait for you on the dashboard.',
      links: [{ label: 'Flashcards', to: '/flashcards' }],
    }),
    followUps: ['How does Team Battle work?', 'How do I earn coins?'],
  },
  {
    id: 'battle',
    question: 'How does Team Battle work?',
    keywords: ['battle', 'team', 'friends', 'friend', 'my friends', 'with friends', 'multiplayer', 'room', 'rooms', 'compete', 'code', 'chat', 'voice'],
    answer: () => ({
      text:
        'Flashcards → Team Battle. Create a team, name it and share your team code with two friends (or join with a code). ' +
        'When both teams of three are ready, you get the same questions. All three of you must pick the same answer before you can lock it in. ' +
        'Talk it out in your private team chat or voice; the other team can\'t see or hear it. Most marks wins! ' +
        'Multiplayer rooms are the solo version: everyone answers alone.',
      links: [
        { label: 'Team Battle', to: '/flashcards/battle' },
        { label: 'Rooms', to: '/flashcards/rooms' },
      ],
    }),
    followUps: ['How do I earn coins?', 'How do I climb the leaderboard?'],
  },
  {
    id: 'coins',
    question: 'How do I earn coins?',
    keywords: ['coin', 'coins', 'earn', 'money', 'wallet', 'reward', 'rewards', 'points', 'balance'],
    answer: (s) => ({
      text:
        `You have ${coinsOf(s, s.demoStudentId).toLocaleString('en-IN')} coins and ${earnedPointsOf(s, s.demoStudentId).toLocaleString('en-IN')} points.\n` +
        'Every finished quiz, room, Team Battle and remediation subject gives you both. ' +
        'Points only count for the leaderboard and never go down. Coins are for spending: hints and avatars.',
      links: [
        { label: 'Take a quiz', to: '/flashcards' },
        { label: 'Avatar store', to: '/avatars' },
      ],
    }),
    followUps: ['How do I unlock heroes?', 'How do I climb the leaderboard?'],
  },
  {
    id: 'heroes',
    question: 'How do I unlock heroes?',
    keywords: ['hero', 'heroes', 'avatar', 'avatars', 'unlock', 'character', 'costume', 'outfit', 'store', 'shop', 'buy', 'look', 'dress'],
    answer: () => ({
      text:
        'Open the Avatar store. The Heroes tab shows every hero and how many more coins you need. When you have enough, tap Unlock, then "Become …" to wear it. ' +
        'Heroes stay yours for good. The other tabs let you change your own character\'s hair, face and clothes.',
      links: [{ label: 'Avatar store', to: '/avatars' }],
    }),
    followUps: ['How do I earn coins?'],
  },
  {
    id: 'leaderboard',
    question: 'How do I climb the leaderboard?',
    keywords: ['leaderboard', 'rank', 'ranking', 'position', 'top', 'first', 'beat', 'climb', 'class', 'section', 'badge', 'badges'],
    answer: (s) => {
      const board = getLeaderboard(s);
      const me = board.find((r) => r.isCurrent);
      const ahead = me && me.rank > 1 ? board[me.rank - 2] : null;
      const where = me
        ? ahead
          ? `You're #${me.rank} in your section, ${(ahead.totalEarnedPoints - me.totalEarnedPoints).toLocaleString('en-IN')} points behind ${ahead.name}. `
          : `You're #1 in your section! `
        : '';
      return {
        text: `${where}Points from quizzes, rooms, Team Battle and remediation move you up. Badges show on your row and in My profile.`,
        links: [
          { label: 'Leaderboard', to: '/leaderboard' },
          { label: 'My badges', to: '/profile' },
        ],
      };
    },
    followUps: ['What should I do next?'],
  },
  {
    id: 'timetable',
    question: 'How do I plan my study?',
    keywords: ['timetable', 'plan', 'schedule', 'session', 'sessions', 'calendar', 'holiday', 'holidays', 'reminder', 'time'],
    answer: () => ({
      text:
        'Open Timetable and add a study session: pick the day, time, subject and chapter. You get reminders 45 and 15 minutes before. ' +
        '"Suggested for you" lists chapters from your own exam mistakes. The month view shows holidays and exam dates.',
      links: [{ label: 'Timetable', to: '/timetable' }],
    }),
    followUps: ['What should I do next?'],
  },
  {
    id: 'notifications',
    question: 'Where are my notifications?',
    keywords: ['notification', 'notifications', 'bell', 'alert', 'alerts', 'message', 'messages'],
    answer: () => ({
      text: 'Tap the bell at the top right. It shows reminders, rewards, badges, exam dates and when someone overtakes you. Tap one to go straight there.',
      links: [{ label: 'All notifications', to: '/notifications' }],
    }),
  },
  {
    id: 'settings',
    question: 'How do I switch to dark mode?',
    keywords: ['dark', 'light', 'theme', 'mode', 'settings', 'setting', 'class', 'reset'],
    answer: () => ({
      text: 'Use the sun and moon switch at the top right for dark or light mode. Demo settings (top right) changes your class and section or resets the demo.',
      links: [{ label: 'Demo settings', to: '/settings' }],
    }),
  },
];

/** The questions shown when the chat opens. */
export const STARTER_QUESTIONS = ['How do I find my way around?', 'What should I do next?', 'Where are my mistakes to fix?', 'How do I earn coins?', 'How do I unlock heroes?', 'How does Team Battle work?'];

const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

function score(topic: Topic, query: string): number {
  const q = ` ${words(query).join(' ')} `;
  if (topic.question.toLowerCase() === query.trim().toLowerCase()) return 100;
  return topic.keywords.reduce((sum, k) => sum + (q.includes(` ${k} `) ? (k.includes(' ') ? 2 : 1) : 0), 0);
}

export function askHelpBot(s: AppState, query: string): HelpAnswer {
  const ranked = TOPICS.map((t) => ({ t, n: score(t, query) })).sort((a, b) => b.n - a.n);
  const best = ranked[0];
  if (!best || best.n === 0) {
    return {
      topicId: 'unknown',
      text: "I'm not sure about that one yet. I can help you find things in the app; try one of these:",
      links: [],
      followUps: STARTER_QUESTIONS.slice(0, 4),
    };
  }
  return { topicId: best.t.id, ...best.t.answer(s), followUps: best.t.followUps ?? [] };
}

export const helpTopicIds = () => TOPICS.map((t) => t.id);
