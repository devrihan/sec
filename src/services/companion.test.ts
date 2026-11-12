import { beforeEach, describe, expect, it } from 'vitest';
import { companionLines } from './companionService';
import { pushNotification } from './notificationStore';
import { startQuiz } from './quizService';
import { getState, resetDemo } from './store';

beforeEach(() => resetDemo());

describe('dashboard avatar messages', () => {
  it('greets the student by name for the time of day', () => {
    const [first] = companionLines(getState(), new Date('2026-11-12T08:30:00'));
    expect(first).toMatchObject({ kind: 'greet', text: 'Good morning, Aarav! How are you doing today?' });
    expect(companionLines(getState(), new Date('2026-11-12T19:00:00'))[0].text).toMatch(/^Good evening/);
  });

  it('reads out unread notifications with a link to them', () => {
    pushNotification({ type: 'achievement', title: 'Badge unlocked', body: 'Nice work.', href: '/profile', dedupeKey: 'test-badge' });
    const notify = companionLines(getState()).find((l) => l.kind === 'notify');
    expect(notify?.href).toBe('/profile');
    expect(notify?.text).toContain('Badge unlocked');
  });

  it('nudges to finish a quiz left halfway, and to fix the next mistake', () => {
    const attempt = startQuiz('c12-chem', 'c12-chem-02');
    const lines = companionLines(getState());
    expect(lines.find((l) => l.id === `quiz:${attempt?.id}`)?.href).toBe(`/flashcards/quiz/${attempt?.id}`);
    expect(lines.some((l) => l.kind === 'nudge' && l.text.startsWith('Do this next: fix'))).toBe(true);
  });

  it('suggests practice from recorded mistakes, and every link goes somewhere', () => {
    const lines = companionLines(getState());
    expect(lines.filter((l) => l.kind === 'practice').length).toBeGreaterThan(0);
    for (const l of lines) {
      if (l.href) expect(l.href.startsWith('/'), l.id).toBe(true);
      expect(Boolean(l.href) === Boolean(l.cta), l.id).toBe(true);
    }
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
  });
});
