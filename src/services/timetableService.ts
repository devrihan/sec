import { REMINDER_LEAD_MINUTES } from '../config/rewards';
import { addDaysKey, combine, daysBetween, parseDateKey, toDateKey } from '../lib/dates';
import { studentMistake } from '../lib/student-mistakes';
import { chapterById, examSchedule, exams, holidays, subjectById } from './catalog';
import { awardEarnedBadges } from './badgeService';
import { getRoadmapStatusForChapter, myErrors } from './remediationService';
import { getState, newId, nowIso, updateState, type AppState } from './store';
import { currentStudent } from './studentService';
import type { Holiday, ScheduledExam, TimetableEntry } from '../types';

export interface SessionInput {
  date: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  chapterId: string;
  topic: string;
}

export type SessionOutcome = { ok: true; entry: TimetableEntry } | { ok: false; error: string };

export const sessionsFor = (s: AppState): TimetableEntry[] =>
  s.timetable
    .filter((e) => e.studentId === s.demoStudentId)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

export const sessionsOn = (s: AppState, date: string) => sessionsFor(s).filter((e) => e.date === date);

const label = (e: Pick<TimetableEntry, 'chapterId'>) => chapterById(e.chapterId)?.title ?? 'that session';

function validate(input: SessionInput, ignoreId: string | null, now: Date): string | null {
  if (!input.date) return 'Choose a date.';
  if (!input.startTime || !input.endTime) return 'Choose a start and end time.';
  if (input.endTime <= input.startTime) return 'The end time must be after the start time.';
  if (combine(input.date, input.startTime) <= now) return 'Pick a time that is still ahead of you.';

  const subject = subjectById(input.subjectId);
  if (!subject || subject.class !== currentStudent().class) return 'Choose a subject from your class.';
  const chapter = chapterById(input.chapterId);
  if (!chapter || chapter.subjectId !== subject.id) return 'Choose a chapter from this subject.';

  const clash = sessionsOn(getState(), input.date).find(
    (e) => e.id !== ignoreId && input.startTime < e.endTime && e.startTime < input.endTime,
  );
  return clash ? `This overlaps with ${label(clash)}. Pick another time.` : null;
}

export function addSession(input: SessionInput, now: Date = new Date()): SessionOutcome {
  const error = validate(input, null, now);
  if (error) return { ok: false, error };
  const entry: TimetableEntry = {
    id: newId('TT'),
    studentId: getState().demoStudentId,
    ...input,
    topic: input.topic.trim(),
    done: false,
    createdAt: nowIso(),
  };
  updateState((s) => ({ ...s, timetable: [...s.timetable, entry] }));
  return { ok: true, entry };
}

/** Editing and rescheduling are the same operation; reminders re-arm from the new time. */
export function updateSession(id: string, input: SessionInput, now: Date = new Date()): SessionOutcome {
  const existing = getState().timetable.find((e) => e.id === id);
  if (!existing) return { ok: false, error: 'This session no longer exists.' };
  const error = validate(input, id, now);
  if (error) return { ok: false, error };
  const entry: TimetableEntry = { ...existing, ...input, topic: input.topic.trim() };
  updateState((s) => ({ ...s, timetable: s.timetable.map((e) => (e.id === id ? entry : e)) }));
  return { ok: true, entry };
}

export function deleteSession(id: string): void {
  updateState((s) => ({ ...s, timetable: s.timetable.filter((e) => e.id !== id) }));
}

export function toggleSessionDone(id: string): void {
  updateState((s) => ({ ...s, timetable: s.timetable.map((e) => (e.id === id ? { ...e, done: !e.done } : e)) }));
  awardEarnedBadges();
}

/** Mock exams are stored as offsets from the seed date, so a demo always has some ahead. */
export function examsForClass(s: AppState): ScheduledExam[] {
  const cls = currentStudent(s).class;
  return examSchedule.flatMap((e) => {
    const subject = subjectById(`c${cls}-${SUBJECT_SLUG[e.subjectName]}`);
    if (!subject) return [];
    return [{
      id: e.id,
      name: e.name,
      subjectId: subject.id,
      subjectName: subject.name,
      date: addDaysKey(s.seedDate, e.daysFromSeed),
      startTime: e.startTime,
      endTime: e.endTime,
    }];
  });
}

const SUBJECT_SLUG: Record<string, string> = { Mathematics: 'math', Physics: 'phys', Chemistry: 'chem', Biology: 'bio', Science: 'sci' };

export function upcomingExams(s: AppState, now: Date = new Date()): ScheduledExam[] {
  const today = toDateKey(now);
  return examsForClass(s).filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function upcomingHolidays(now: Date = new Date()): Holiday[] {
  const today = toDateKey(now);
  return holidays.filter((h) => h.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export const holidayOn = (date: string) => holidays.find((h) => h.startDate <= date && date <= h.endDate);
export const examsOn = (s: AppState, date: string) => examsForClass(s).filter((e) => e.date === date);

export interface StudySuggestion {
  chapterId: string;
  subjectId: string;
  chapterTitle: string;
  subjectName: string;
  errorCount: number;
  examNames: string[];
  mistakeLabel: string;
  message: string;
  repeated: boolean;
  remediationPending: boolean;
  /** Future study time already planned for this chapter. */
  plannedMinutes: number;
  daysToExam: number | null;
}

const minutesOf = (e: TimetableEntry) =>
  (combine(e.date, e.endTime).getTime() - combine(e.date, e.startTime).getTime()) / 60000;

/**
 * Built only from this student's recorded exam errors and remediation progress.
 * A chapter with no recorded error is never suggested (the brief's key requirement).
 */
export function suggestionsFor(s: AppState, now: Date = new Date(), limit = 5): StudySuggestion[] {
  const today = toDateKey(now);
  const byChapter = new Map<string, ReturnType<typeof myErrors>>();
  for (const e of myErrors(s)) byChapter.set(e.chapterId, [...(byChapter.get(e.chapterId) ?? []), e]);

  const rows = [...byChapter.entries()].flatMap(([chapterId, errors]) => {
    const chapter = chapterById(chapterId);
    const subject = chapter ? subjectById(chapter.subjectId) : undefined;
    if (!chapter || !subject) return [];

    const examIds = [...new Set(errors.map((e) => e.examId))];
    const examNames = examIds.map((id) => exams.find((x) => x.id === id)?.name ?? '').filter(Boolean);
    const repeated = examIds.length > 1;
    const remediationPending = examIds.some((id) => getRoadmapStatusForChapter(s, id, subject.id, chapterId) !== 'completed');
    const plannedMinutes = sessionsFor(s)
      .filter((e) => e.chapterId === chapterId && e.date >= today && !e.done)
      .reduce((sum, e) => sum + minutesOf(e), 0);
    const nextExam = upcomingExams(s, now).find((e) => e.subjectId === subject.id);
    const daysToExam = nextExam ? daysBetween(now, parseDateKey(nextExam.date)) : null;

    const counts = new Map<string, number>();
    for (const e of errors) counts.set(e.errorType, (counts.get(e.errorType) ?? 0) + 1);
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const score =
      errors.length * 2 +
      (repeated ? 6 : 0) +
      (remediationPending ? 2 : 0) +
      (daysToExam !== null && daysToExam <= 14 ? 3 : 0);

    return [{
      score,
      suggestion: {
        chapterId,
        subjectId: subject.id,
        chapterTitle: chapter.title,
        subjectName: subject.name,
        errorCount: errors.length,
        examNames,
        mistakeLabel: studentMistake(dominant).label,
        message: repeated
          ? `Your previous exam performance indicates that ${chapter.title} needs more attention. Consider allocating additional study time to this chapter.`
          : `You lost marks in ${chapter.title} in your ${examNames[0]}. A focused session would help.`,
        repeated,
        remediationPending,
        plannedMinutes,
        daysToExam,
      },
    }];
  });

  const ranked = rows
    .sort((a, b) => b.score - a.score || a.suggestion.chapterTitle.localeCompare(b.suggestion.chapterTitle))
    .map((r) => r.suggestion);

  // Planning a chapter moves the next one up. Planned ones stay at the end as confirmation.
  return [
    ...ranked.filter((s) => s.plannedMinutes === 0).slice(0, limit),
    ...ranked.filter((s) => s.plannedMinutes > 0).slice(0, 2),
  ];
}

export const REMINDER_LEADS = [...REMINDER_LEAD_MINUTES].sort((a, b) => a - b);
