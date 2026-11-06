import { chapters, descriptiveQuestions, questions, revision, subjectById, videos } from './catalog';
import type { Chapter, Question, QuestionOption, RevisionSnippet, VideoResource } from '../types';

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function chaptersForSubject(subjectId: string): Chapter[] {
  const subject = subjectById(subjectId);
  return chapters
    .filter((c) => c.subjectId === subjectId && c.class === subject?.class)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export const questionsForChapter = (chapterId: string): Question[] =>
  questions.filter((q) => q.chapterId === chapterId);

export const videoForChapter = (chapterId: string): VideoResource | undefined =>
  videos.find((v) => v.chapterId === chapterId);

export const revisionForChapter = (chapterId: string): RevisionSnippet[] =>
  revision.filter((r) => r.chapterId === chapterId).sort((a, b) => a.displayOrder - b.displayOrder);

/** One row of the Important Questions page: MCQ or written. */
export interface BankItem {
  id: string;
  questionText: string;
  marks: number;
  questionType: string;
  source: Question['source'];
  years: number[];
  answer: string;
  options: QuestionOption[] | null;
  correctOptionId: string | null;
}

/** Only ever reads the seeded bank. Exam-only records stay out of this list. */
export function bankForChapter(chapterId: string): BankItem[] {
  const mcq: BankItem[] = questionsForChapter(chapterId).map((q) => ({
    id: q.id,
    questionText: q.questionText,
    marks: q.marks,
    questionType: 'MCQ',
    source: q.source,
    years: q.years,
    answer: q.explanation,
    options: q.options,
    correctOptionId: q.correctOptionId,
  }));
  const written: BankItem[] = descriptiveQuestions
    .filter((q) => q.chapterId === chapterId && q.source !== 'School exam')
    .map((q) => ({
      id: q.id,
      questionText: q.questionText,
      marks: q.marks,
      questionType: q.questionType,
      source: q.source,
      years: q.years,
      answer: q.answer,
      options: null,
      correctOptionId: null,
    }));
  return [...mcq, ...written].sort((a, b) => a.marks - b.marks);
}

/** The Repeated label needs at least two years of history behind it (SRS 5.7). */
export const isRepeated = (item: Pick<BankItem, 'years'>) => item.years.length >= 2;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function resourceSummary(chapterId: string): string {
  return [
    videoForChapter(chapterId) ? '1 video' : 'Video coming soon',
    plural(revisionForChapter(chapterId).length, 'revision note'),
    plural(bankForChapter(chapterId).length, 'question'),
  ].join(', ');
}
