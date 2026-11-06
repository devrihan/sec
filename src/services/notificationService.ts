import {
  EXAM_REMINDER_DAYS,
  FLASHCARD_INACTIVE_DAYS,
  HOLIDAY_REMINDER_DAYS,
  PENDING_QUIZ_AFTER_MINUTES,
} from '../config/rewards';
import { combine, daysBetween, parseDateKey, startOfWeek, toDateKey } from '../lib/dates';
import { chapterById, subjectById } from './catalog';
import { pushNotification } from './notificationStore';
import { activeRoadmaps } from './remediationService';
import { getState, type AppState } from './store';
import { REMINDER_LEADS, sessionsFor, upcomingExams, upcomingHolidays } from './timetableService';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function checkSessions(s: AppState, now: Date): void {
  for (const e of sessionsFor(s)) {
    if (e.done) continue;
    const minutes = Math.ceil((combine(e.date, e.startTime).getTime() - now.getTime()) / 60000);
    if (minutes <= 0) continue;
    const lead = REMINDER_LEADS.find((l) => minutes <= l);
    if (lead === undefined) continue;

    const subject = subjectById(e.subjectId)?.name ?? 'study';
    const near = lead === REMINDER_LEADS[0];
    pushNotification({
      type: 'timetable',
      title: near ? "Time to get ready" : 'Study session coming up',
      body: near
        ? `Your study session starts in ${plural(minutes, 'minute')}. Let's get started!`
        : `Your ${subject} study session starts in ${plural(minutes, 'minute')}. Ready to go?`,
      href: '/timetable',
      // The start time is in the key, so rescheduling re-arms the reminder.
      dedupeKey: `session:${e.id}:${e.date}T${e.startTime}:${lead}`,
      announce: true,
    }, now);
  }
}

function checkExams(s: AppState, now: Date): void {
  for (const exam of upcomingExams(s, now)) {
    const days = daysBetween(now, parseDateKey(exam.date));
    const lead = [...EXAM_REMINDER_DAYS].sort((a, b) => a - b).find((d) => days <= d);
    if (lead === undefined) continue;
    pushNotification({
      type: 'exam',
      title: 'Exam on the horizon',
      body: `Your ${exam.subjectName} exam is approaching. Have you completed your revision?`,
      href: '/timetable',
      dedupeKey: `exam:${exam.id}:${exam.date}:${lead}`,
    }, now);
  }
}

function checkHolidays(now: Date): void {
  for (const h of upcomingHolidays(now)) {
    const days = daysBetween(now, parseDateKey(h.startDate));
    if (days < 0 || days > HOLIDAY_REMINDER_DAYS) continue;
    pushNotification({
      type: 'holiday',
      title: 'A break is coming up',
      body: days === 0 ? `${h.name} starts today. Enjoy it, and keep a little revision in your plan.` : `${h.name} starts in ${plural(days, 'day')}. Plan your study time around it.`,
      href: '/timetable',
      dedupeKey: `holiday:${h.id}`,
    }, now);
  }
}

function checkPendingQuizzes(s: AppState, now: Date): void {
  for (const a of s.quizAttempts) {
    if (a.studentId !== s.demoStudentId || a.completedAt || a.mode !== 'solo') continue;
    const age = (now.getTime() - new Date(a.startedAt).getTime()) / 60000;
    if (age < PENDING_QUIZ_AFTER_MINUTES) continue;
    const left = a.questionIds.length - a.answers.length;
    pushNotification({
      type: 'learning',
      title: 'Finish what you started',
      body: `${chapterById(a.chapterId)?.title}: ${plural(left, 'question')} left in your quiz. Finish it to collect your points!`,
      href: `/flashcards/quiz/${a.id}`,
      dedupeKey: `quiz-pending:${a.id}`,
    }, now);
  }
}

function checkFlashcardActivity(s: AppState, now: Date): void {
  const last = s.quizAttempts
    .filter((a) => a.studentId === s.demoStudentId && a.completedAt)
    .map((a) => a.completedAt as string)
    .concat(s.transactions.filter((t) => t.studentId === s.demoStudentId && t.type === 'QUIZ_REWARD').map((t) => t.createdAt))
    .sort()
    .at(-1);
  if (last && daysBetween(new Date(last), now) < FLASHCARD_INACTIVE_DAYS) return;
  pushNotification({
    type: 'learning',
    title: 'Time for a quick quiz',
    body: 'Your flashcards are waiting! Complete a quick quiz and earn points.',
    href: '/flashcards',
    dedupeKey: `inactive:${toDateKey(now)}`,
  }, now);
}

function checkRemediation(s: AppState, now: Date): void {
  const open = activeRoadmaps(s).filter((r) => !r.roadmap.isComplete);
  if (open.length === 0) return;
  const left = open.reduce((sum, r) => sum + r.roadmap.total - r.roadmap.completed, 0);
  const first = open.find((r) => r.roadmap.completed > 0) ?? open[0];
  pushNotification({
    type: 'learning',
    title: 'Your roadmap is waiting',
    body: `You still have ${plural(left, 'chapter')} to master. Keep going!`,
    href: `/remediation/${first.exam.id}/${first.subject.id}`,
    dedupeKey: `remediation:${toDateKey(now)}`,
  }, now);
}

function checkConsistency(s: AppState, now: Date): void {
  const since = now.getTime() - 7 * 86400000;
  const days = new Set(
    s.transactions
      .filter((t) => t.studentId === s.demoStudentId && t.coinAmount > 0 && t.type !== 'OPENING_BALANCE' && t.type !== 'DEMO_ADJUSTMENT' && new Date(t.createdAt).getTime() >= since)
      .map((t) => toDateKey(new Date(t.createdAt))),
  );
  sessionsFor(s).filter((e) => e.done && combine(e.date, e.startTime).getTime() >= since).forEach((e) => days.add(e.date));
  if (days.size === 0) return;
  pushNotification({
    type: 'learning',
    title: 'Nice rhythm',
    body: `You've studied on ${plural(days.size, 'day')} this week. One more session keeps the habit going!`,
    href: '/timetable',
    dedupeKey: `consistency:${toDateKey(startOfWeek(now))}`,
  }, now);
}

/** Safe to run at any time: each trigger has a dedupe key, so repeats add nothing. */
export function runNotificationChecks(now: Date = new Date()): void {
  checkHolidays(now);
  checkExams(getState(), now);
  checkRemediation(getState(), now);
  checkFlashcardActivity(getState(), now);
  checkConsistency(getState(), now);
  checkPendingQuizzes(getState(), now);
  checkSessions(getState(), now);
}
