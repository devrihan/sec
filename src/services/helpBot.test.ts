import { beforeEach, describe, expect, it } from 'vitest';
import { askHelpBot, helpTopicIds, STARTER_QUESTIONS } from './helpBot';
import { getState, resetDemo } from './store';

beforeEach(() => resetDemo());

describe('help chat', () => {
  it('answers every starter question with its own topic', () => {
    const ids = STARTER_QUESTIONS.map((q) => askHelpBot(getState(), q).topicId);
    expect(ids).not.toContain('unknown');
    expect(new Set(ids).size).toBe(STARTER_QUESTIONS.length);
  });

  it('understands everyday wording', () => {
    const topic = (q: string) => askHelpBot(getState(), q).topicId;
    expect(topic('where are the videos?')).toBe('preparation');
    expect(topic('how can i fix my exam mistakes')).toBe('remediation');
    expect(topic('play a quiz with my friends')).toBe('battle');
    expect(topic('how to get more coins')).toBe('coins');
    expect(topic('change my avatar')).toBe('heroes');
    expect(topic('where is the bell')).toBe('notifications');
  });

  it('personalises coins, rank and next steps', () => {
    expect(askHelpBot(getState(), 'How do I earn coins?').text).toContain('You have 1,000 coins');
    expect(askHelpBot(getState(), 'How do I climb the leaderboard?').text).toMatch(/You're #3 in your section, \d+ points behind/);
    const next = askHelpBot(getState(), 'What should I do next?');
    expect(next.text).toContain('Do this next: fix');
    expect(next.links.length).toBeGreaterThan(0);
  });

  it('admits when it does not know, and offers starter questions', () => {
    const a = askHelpBot(getState(), 'what is the capital of peru');
    expect(a.topicId).toBe('unknown');
    expect(a.followUps.length).toBeGreaterThan(0);
  });

  it('only links to pages that exist', () => {
    const routes = /^\/(|remediation(\/formulas)?|preparation(\/saved)?|flashcards(\/battle|\/rooms)?|timetable|leaderboard|avatars|profile|notifications|settings|remediation\/.+|flashcards\/.+)$/;
    for (const id of helpTopicIds()) {
      const a = askHelpBot(getState(), id);
      for (const l of a.links) expect(l.to, `${id}: ${l.label}`).toMatch(routes);
    }
  });
});
