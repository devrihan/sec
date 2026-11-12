import { chapterById, revision, subjectById } from './catalog';
import { getState, updateState, type AppState } from './store';
import type { Chapter, RevisionSnippet, Subject } from '../types';

export const savedSnippetIds = (s: AppState = getState()): string[] => s.savedSnippetIds ?? [];

export const isSnippetSaved = (s: AppState, id: string) => savedSnippetIds(s).includes(id);

export function saveSnippet(id: string): void {
  updateState((s) => (isSnippetSaved(s, id) ? s : { ...s, savedSnippetIds: [...savedSnippetIds(s), id] }));
}

export function unsaveSnippet(id: string): void {
  updateState((s) => ({ ...s, savedSnippetIds: savedSnippetIds(s).filter((x) => x !== id) }));
}

export interface SavedGroup {
  subject: Subject;
  chapters: { chapter: Chapter; snippets: RevisionSnippet[] }[];
  count: number;
}

/** Saved snippets grouped subject → chapter, in syllabus order. */
export function savedBySubject(s: AppState): SavedGroup[] {
  const ids = new Set(savedSnippetIds(s));
  const saved = revision.filter((r) => ids.has(r.id));
  const bySubject = new Map<string, SavedGroup>();
  for (const snippet of saved) {
    const chapter = chapterById(snippet.chapterId);
    const subject = chapter && subjectById(chapter.subjectId);
    if (!chapter || !subject) continue;
    const group = bySubject.get(subject.id) ?? { subject, chapters: [], count: 0 };
    let entry = group.chapters.find((c) => c.chapter.id === chapter.id);
    if (!entry) {
      entry = { chapter, snippets: [] };
      group.chapters.push(entry);
    }
    entry.snippets.push(snippet);
    group.count += 1;
    bySubject.set(subject.id, group);
  }
  const groups = [...bySubject.values()];
  for (const g of groups) {
    g.chapters.sort((a, b) => a.chapter.displayOrder - b.chapter.displayOrder);
    for (const c of g.chapters) c.snippets.sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return groups.sort((a, b) => a.subject.name.localeCompare(b.subject.name));
}
