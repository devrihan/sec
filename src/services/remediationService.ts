import {
  REMEDIATION_MAX_QUESTIONS,
  REMEDIATION_MIN_QUESTIONS,
  REMEDIATION_PASS_PERCENT,
  REMEDIATION_QUESTION_COUNT,
} from '../config/rewards';
import { chapterById, exams, questionById, studentErrors, subjectById } from './catalog';
import { completeRemediationSubject } from './pointsService';
import { questionsForChapter, shuffled } from './questionService';
import { getState, newId, nowIso, pushPopup, updateState, type AppState } from './store';
import { currentStudent, subjectsForClass } from './studentService';
import type {
  Chapter,
  Exam,
  RemediationAttempt,
  RemediationProgress,
  StudentError,
  Subject,
} from '../types';

export type NodeState = 'completed' | 'current' | 'locked';

export interface RoadmapNode {
  chapter: Chapter;
  position: number;
  errorCount: number;
  state: NodeState;
  bestScore: number;
  attempts: number;
}

export interface Roadmap {
  nodes: RoadmapNode[];
  completed: number;
  total: number;
  percent: number;
  isComplete: boolean;
  current: RoadmapNode | undefined;
}

/** Errors for the current student, limited to subjects of their current class. */
export function myErrors(s: AppState): StudentError[] {
  const me = currentStudent(s);
  return studentErrors.filter(
    (e) => e.studentId === me.id && subjectById(e.subjectId)?.class === me.class,
  );
}

export function examsWithErrors(s: AppState = getState()): Exam[] {
  const ids = new Set(myErrors(s).map((e) => e.examId));
  return exams
    .filter((e) => ids.has(e.id))
    .sort((a, b) => b.examDate.localeCompare(a.examDate));
}

export function subjectsWithErrors(examId: string, s: AppState = getState()): Subject[] {
  const ids = new Set(myErrors(s).filter((e) => e.examId === examId).map((e) => e.subjectId));
  return subjectsForClass(currentStudent(s).class).filter((subject) => ids.has(subject.id));
}

export function subjectsWithoutErrors(examId: string, s: AppState = getState()): Subject[] {
  const withErrors = new Set(subjectsWithErrors(examId, s).map((x) => x.id));
  return subjectsForClass(currentStudent(s).class).filter((subject) => !withErrors.has(subject.id));
}

export function errorsForChapter(s: AppState, examId: string, chapterId: string): StudentError[] {
  return myErrors(s).filter((e) => e.examId === examId && e.chapterId === chapterId);
}

function progressRecord(s: AppState, examId: string, chapterId: string): RemediationProgress | undefined {
  return s.remediationProgress.find(
    (p) => p.studentId === s.demoStudentId && p.examId === examId && p.chapterId === chapterId,
  );
}

export function getRoadmapStatusForChapter(s: AppState, examId: string, _subjectId: string, chapterId: string) {
  return progressRecord(s, examId, chapterId)?.status ?? 'not_started';
}

/** Every chapter with at least one error appears; none other can (FR-032, SRS 9.4). */
export function getRoadmap(s: AppState, examId: string, subjectId: string): Roadmap {
  const errors = myErrors(s).filter((e) => e.examId === examId && e.subjectId === subjectId);
  const chapters = [...new Set(errors.map((e) => e.chapterId))]
    .map((id) => chapterById(id))
    .filter((c): c is Chapter => c !== undefined)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  let foundCurrent = false;
  const nodes: RoadmapNode[] = chapters.map((chapter, i) => {
    const progress = progressRecord(s, examId, chapter.id);
    let state: NodeState;
    if (progress?.status === 'completed') {
      state = 'completed';
    } else if (!foundCurrent) {
      state = 'current';
      foundCurrent = true;
    } else {
      state = 'locked';
    }
    return {
      chapter,
      position: i + 1,
      errorCount: errors.filter((e) => e.chapterId === chapter.id).length,
      state,
      bestScore: progress?.bestScore ?? 0,
      attempts: progress
        ? s.remediationAttempts.filter((a) => a.progressId === progress.id && a.submittedAt).length
        : 0,
    };
  });

  const completed = nodes.filter((n) => n.state === 'completed').length;
  const total = nodes.length;
  return {
    nodes,
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    isComplete: total > 0 && completed === total,
    current: nodes.find((n) => n.state === 'current'),
  };
}

export function isPass(score: number, total: number): boolean {
  // Whole numbers on purpose: 3 of 4 must be exactly 75 with no rounding involved.
  return total > 0 && score * 100 >= REMEDIATION_PASS_PERCENT * total;
}

function assessmentSize(poolSize: number): number {
  const wanted = Math.min(
    REMEDIATION_MAX_QUESTIONS,
    Math.max(REMEDIATION_MIN_QUESTIONS, REMEDIATION_QUESTION_COUNT),
  );
  return Math.min(wanted, poolSize);
}

export const attemptById = (s: AppState, id: string) => s.remediationAttempts.find((a) => a.id === id);

export function openAttempt(s: AppState, examId: string, chapterId: string): RemediationAttempt | undefined {
  const progress = progressRecord(s, examId, chapterId);
  if (!progress) return undefined;
  return s.remediationAttempts.find((a) => a.progressId === progress.id && !a.submittedAt);
}

export function attemptHistory(s: AppState, examId: string, chapterId: string): RemediationAttempt[] {
  const progress = progressRecord(s, examId, chapterId);
  if (!progress) return [];
  return s.remediationAttempts.filter((a) => a.progressId === progress.id && a.submittedAt);
}

function pickQuestions(chapterId: string, previous: string | undefined) {
  const pool = questionsForChapter(chapterId);
  const size = assessmentSize(pool.length);
  // A retry always differs from the previous attempt when the pool allows it.
  let ids: string[] = [];
  for (let i = 0; i < 25; i += 1) {
    ids = shuffled(pool)
      .slice(0, size)
      .map((q) => q.id);
    if (ids.join() !== previous) break;
  }
  return ids.map((questionId) => ({
    questionId,
    optionIds: shuffled((questionById(questionId)?.options ?? []).map((o) => o.id)),
  }));
}

export type StartOutcome =
  | { ok: true; attempt: RemediationAttempt }
  | { ok: false; reason: 'locked' | 'completed' | 'no-questions' };

export function startAssessment(examId: string, subjectId: string, chapterId: string): StartOutcome {
  const s = getState();
  const node = getRoadmap(s, examId, subjectId).nodes.find((n) => n.chapter.id === chapterId);
  if (!node || node.state === 'locked') return { ok: false, reason: 'locked' };
  if (node.state === 'completed') return { ok: false, reason: 'completed' };

  const open = openAttempt(s, examId, chapterId);
  if (open) return { ok: true, attempt: open };

  const history = attemptHistory(s, examId, chapterId);
  const questions = pickQuestions(chapterId, history.at(-1)?.questionIds.join());
  if (questions.length < REMEDIATION_MIN_QUESTIONS) return { ok: false, reason: 'no-questions' };

  const existing = progressRecord(s, examId, chapterId);
  const progress: RemediationProgress = existing ?? {
    id: `RP-${s.demoStudentId}-${examId}-${chapterId}`,
    studentId: s.demoStudentId,
    examId,
    subjectId,
    chapterId,
    status: 'in_progress',
    bestScore: 0,
    completedAt: null,
  };
  const attempt: RemediationAttempt = {
    id: newId('RA'),
    progressId: progress.id,
    questions,
    questionIds: questions.map((q) => q.questionId),
    answers: {},
    score: 0,
    total: questions.length,
    percent: 0,
    passed: false,
    attemptedAt: nowIso(),
    submittedAt: null,
  };
  updateState((st) => ({
    ...st,
    remediationProgress: existing ? st.remediationProgress : [...st.remediationProgress, progress],
    remediationAttempts: [...st.remediationAttempts, attempt],
  }));
  return { ok: true, attempt };
}

export function setAssessmentAnswer(attemptId: string, questionId: string, optionId: string): void {
  updateState((s) => ({
    ...s,
    remediationAttempts: s.remediationAttempts.map((a) =>
      a.id === attemptId && !a.submittedAt
        ? { ...a, answers: { ...a.answers, [questionId]: optionId } }
        : a,
    ),
  }));
}

export function scoreAttempt(attempt: RemediationAttempt): number {
  return attempt.questionIds.filter(
    (id) => attempt.answers[id] === questionById(id)?.correctOptionId,
  ).length;
}

export interface SubmitResult {
  attempt: RemediationAttempt;
  subjectCompleted: boolean;
  nextChapterTitle: string | null;
}

/** Marks the chapter on a pass, and pays out once when the last chapter is passed. */
export function submitAssessment(attemptId: string): SubmitResult | null {
  const s = getState();
  const attempt = attemptById(s, attemptId);
  if (!attempt) return null;
  const progress = s.remediationProgress.find((p) => p.id === attempt.progressId);
  if (!progress) return null;
  if (!attempt.submittedAt && Object.keys(attempt.answers).length < attempt.total) return null;

  if (!attempt.submittedAt) {
    const score = scoreAttempt(attempt);
    const percent = Math.round((score / attempt.total) * 100);
    const passed = isPass(score, attempt.total);
    const submittedAt = nowIso();
    updateState((st) => ({
      ...st,
      remediationAttempts: st.remediationAttempts.map((a) =>
        a.id === attemptId ? { ...a, score, percent, passed, submittedAt } : a,
      ),
      remediationProgress: st.remediationProgress.map((p) =>
        p.id === progress.id
          ? {
              ...p,
              status: passed ? 'completed' : p.status,
              bestScore: Math.max(p.bestScore, percent),
              completedAt: passed ? submittedAt : p.completedAt,
            }
          : p,
      ),
    }));
  }

  const after = getState();
  const roadmap = getRoadmap(after, progress.examId, progress.subjectId);
  if (roadmap.isComplete) {
    const exam = exams.find((e) => e.id === progress.examId)?.name ?? '';
    const subject = subjectById(progress.subjectId)?.name ?? '';
    const result = completeRemediationSubject(
      after.demoStudentId,
      progress.examId,
      progress.subjectId,
      `${subject} ${exam}`.trim(),
    );
    if (result) pushPopup(result);
  }

  return {
    attempt: attemptById(getState(), attemptId) as RemediationAttempt,
    subjectCompleted: roadmap.isComplete,
    nextChapterTitle: roadmap.current?.chapter.title ?? null,
  };
}

/** For the dashboard: every roadmap with progress still to make. */
export function activeRoadmaps(s: AppState) {
  return examsWithErrors(s).flatMap((exam) =>
    subjectsWithErrors(exam.id, s).map((subject) => ({
      exam,
      subject,
      roadmap: getRoadmap(s, exam.id, subject.id),
    })),
  );
}
