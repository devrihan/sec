/** Read-only seed data, typed once here. Nothing in this file changes at runtime. */
import { BADGE_THRESHOLDS } from '../config/rewards';
import avatarsJson from '../data/avatars.json';
import badgesJson from '../data/badges.json';
import chaptersJson from '../data/chapters.json';
import descriptiveJson from '../data/descriptive-questions.json';
import examScheduleJson from '../data/exam-schedule.json';
import examsJson from '../data/exams.json';
import fixChecksJson from '../data/fix-checks.json';
import mistakeFixesJson from '../data/mistake-fixes.json';
import holidaysJson from '../data/holidays.json';
import questionsJson from '../data/questions.json';
import remediationJson from '../data/remediation.json';
import revisionJson from '../data/revision.json';
import roomsJson from '../data/rooms.json';
import errorsJson from '../data/student-errors.json';
import studentsJson from '../data/students.json';
import subjectsJson from '../data/subjects.json';
import timetableSeedJson from '../data/timetable-seed.json';
import videosJson from '../data/videos.json';
import type {
  Avatar,
  Badge,
  Chapter,
  DescriptiveQuestion,
  Exam,
  FixCheck,
  MistakeFix,
  Holiday,
  Question,
  QuizRoom,
  RemediationProgress,
  RevisionSnippet,
  StudentAvatar,
  StudentError,
  StudentSeed,
  Subject,
  VideoResource,
} from '../types';

export const seedStudents = studentsJson.students as StudentSeed[];
export const subjects = subjectsJson as Subject[];
export const chapters = chaptersJson as Chapter[];
export const videos = videosJson as VideoResource[];
export const revision = revisionJson as RevisionSnippet[];
export const questions = questionsJson as Question[];
export const descriptiveQuestions = descriptiveJson as DescriptiveQuestion[];
export const avatars = avatarsJson as Avatar[];
export const exams = examsJson as Exam[];
export const studentErrors = errorsJson as StudentError[];
export const fixChecks = fixChecksJson as FixCheck[];
export const mistakeFixes = mistakeFixesJson as MistakeFix[];
export const seedRooms = roomsJson as QuizRoom[];
export const holidays = holidaysJson as Holiday[];
export const examSchedule = examScheduleJson;
export const timetableSeed = timetableSeedJson;

export const seedExtras = {
  demoHistory: studentsJson.demoHistory,
  ownedAvatars: studentsJson.ownedAvatars as StudentAvatar[],
  remediationProgress: remediationJson as RemediationProgress[],
};

/** Art and names come from badges.json; thresholds come from the config module. */
export function allBadges(): Badge[] {
  return (badgesJson as Omit<Badge, 'threshold'>[]).map((b) => ({
    ...b,
    threshold: BADGE_THRESHOLDS[b.id] ?? null,
  }));
}

export const subjectById = (id: string) => subjects.find((s) => s.id === id);
export const chapterById = (id: string) => chapters.find((c) => c.id === id);
export const avatarById = (id: string) => avatars.find((a) => a.id === id);
export const badgeById = (id: string) => allBadges().find((b) => b.id === id);
export const questionById = (id: string) => questions.find((q) => q.id === id);
export const descriptiveById = (id: string) => descriptiveQuestions.find((q) => q.id === id);

/** Records hold no partial credit, so a wrong answer counts as the question's full marks. */
export const marksLost = (error: StudentError) =>
  descriptiveById(error.questionId)?.marks ?? questionById(error.questionId)?.marks ?? 0;
export const seedStudentById = (id: string) => seedStudents.find((s) => s.id === id);
