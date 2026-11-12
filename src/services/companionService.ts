import { combine, daysBetween, formatTime, parseDateKey, toDateKey } from '../lib/dates';
import { avatars, chapterById, seedStudentById, subjectById } from './catalog';
import { getLeaderboard } from './leaderboardService';
import { nextFix } from './remediationService';
import type { AppState } from './store';
import { coinsOf, ownsAvatar } from './studentService';
import { sessionsOn, suggestionsFor, upcomingExams } from './timetableService';

/**
 * What the dashboard avatar says. Every line comes from the student's real data:
 * notifications, plans, unfinished work, exam mistakes, rank and coins. Nothing is
 * invented, so a nudge always points somewhere useful.
 */

export type CompanionKind = 'greet' | 'notify' | 'nudge' | 'practice' | 'cheer';

export interface CompanionLine {
  id: string;
  kind: CompanionKind;
  text: string;
  /** Where the bubble's link goes. */
  href?: string;
  cta?: string;
}

function greeting(name: string, now: Date): string {
  const h = now.getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}! How are you doing today?`;
}

export function companionLines(s: AppState, now: Date = new Date()): CompanionLine[] {
  const me = s.demoStudentId;
  const name = seedStudentById(me)?.name ?? 'there';
  const lines: CompanionLine[] = [{ id: 'greet', kind: 'greet', text: greeting(name, now) }];

  const unread = s.notifications
    .filter((n) => n.studentId === me && !n.readAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (unread.length > 0) {
    const n = unread[0];
    lines.push({
      id: `notify:${n.id}`,
      kind: 'notify',
      text: unread.length > 1 ? `You have ${unread.length} new notifications. Latest: ${n.title}` : `New notification: ${n.title}. ${n.body}`,
      href: n.href ?? '/notifications',
      cta: 'Open it',
    });
  }

  const unfinished = s.quizAttempts.find((a) => a.studentId === me && a.mode === 'solo' && !a.completedAt);
  if (unfinished) {
    const left = unfinished.questionIds.length - unfinished.answers.length;
    lines.push({
      id: `quiz:${unfinished.id}`,
      kind: 'nudge',
      text: `You left the ${chapterById(unfinished.chapterId)?.title} quiz with ${left} ${left === 1 ? 'question' : 'questions'} to go. Let's finish it!`,
      href: `/flashcards/quiz/${unfinished.id}`,
      cta: 'Resume quiz',
    });
  }

  const nextSession = sessionsOn(s, toDateKey(now))
    .filter((e) => !e.done && combine(e.date, e.endTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  if (nextSession) {
    lines.push({
      id: `session:${nextSession.id}`,
      kind: 'nudge',
      text: `You planned ${subjectById(nextSession.subjectId)?.name}: ${chapterById(nextSession.chapterId)?.title} at ${formatTime(nextSession.startTime)}. Ready?`,
      href: '/timetable',
      cta: 'See my plan',
    });
  }

  const fix = nextFix(s);
  if (fix) {
    lines.push({
      id: `fix:${fix.node.chapter.id}`,
      kind: 'nudge',
      text: `Do this next: fix ${fix.node.chapter.title}. It cost you ${fix.node.marks} ${fix.node.marks === 1 ? 'mark' : 'marks'} in ${fix.exam.name}.`,
      href: `/remediation/${fix.exam.id}/${fix.subject.id}/${fix.node.chapter.id}`,
      cta: 'Fix it now',
    });
  }

  for (const sug of suggestionsFor(s, now, 2)) {
    lines.push({
      id: `practice:${sug.chapterId}`,
      kind: 'practice',
      text: `Practise ${sug.chapterTitle} to fix the ${sug.mistakeLabel.toLowerCase()} mistakes you made there.`,
      href: `/flashcards/${sug.subjectId}/${sug.chapterId}`,
      cta: 'Practise',
    });
  }

  const exam = upcomingExams(s, now)[0];
  if (exam) {
    const days = daysBetween(now, parseDateKey(exam.date));
    if (days <= 7) {
      lines.push({
        id: `exam:${exam.id}`,
        kind: 'nudge',
        text: days === 0 ? `${exam.name} is today. You've got this!` : `${exam.name} is in ${days} ${days === 1 ? 'day' : 'days'}. A quick revision will help.`,
        href: `/preparation/${exam.subjectId}`,
        cta: 'Revise',
      });
    }
  }

  const board = getLeaderboard(s);
  const mine = board.find((r) => r.isCurrent);
  if (mine) {
    const ahead = board[mine.rank - 2];
    lines.push(
      ahead && mine.rank > 1
        ? {
            id: 'rank',
            kind: 'cheer',
            text: `You're #${mine.rank}, just ${(ahead.totalEarnedPoints - mine.totalEarnedPoints).toLocaleString('en-IN')} points behind ${ahead.name}. One good quiz could do it!`,
            href: '/flashcards',
            cta: 'Take a quiz',
          }
        : { id: 'rank', kind: 'cheer', text: `You're top of your class! Keep practising to stay there.`, href: '/leaderboard', cta: 'Leaderboard' },
    );
  }

  const coins = coinsOf(s, me);
  const hero = avatars
    .filter((a) => a.slot === 'hero' && a.isAvailable && !ownsAvatar(s, me, a.id))
    .sort((a, b) => a.price - b.price)[0];
  if (hero) {
    lines.push(
      coins >= hero.price
        ? { id: `hero:${hero.id}`, kind: 'cheer', text: `You have enough coins to unlock ${hero.name}! Want to transform?`, href: '/avatars', cta: 'Unlock' }
        : { id: `hero:${hero.id}`, kind: 'cheer', text: `Save ${(hero.price - coins).toLocaleString('en-IN')} more coins and you can become ${hero.name}.`, href: '/avatars', cta: 'See heroes' },
    );
  }

  lines.push({ id: 'tip', kind: 'cheer', text: 'Small steps every day add up. Even ten minutes of practice counts!' });
  return lines;
}
