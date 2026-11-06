import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface BankQuestion {
  id: string;
  questionText: string;
  chapterId: string;
  correctOptionId: string;
  options: { id: string; text: string }[];
}

const bank: BankQuestion[] = JSON.parse(
  readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'),
);

/** Texts can repeat across chapters, so answers are looked up per chapter. */
export function answerKey(chapterId: string, questionText: string) {
  const q = bank.find((b) => b.chapterId === chapterId && b.questionText === questionText);
  if (!q) throw new Error(`Question not in bank for ${chapterId}: ${questionText}`);
  return {
    right: q.options.find((o) => o.id === q.correctOptionId)?.text as string,
    wrong: q.options.find((o) => o.id !== q.correctOptionId)?.text as string,
  };
}

export const bankTexts = (chapterId: string) => bank.filter((b) => b.chapterId === chapterId).map((b) => b.questionText);

export async function wallet(page: Page): Promise<number> {
  return Number((await page.getByTestId('wallet-amount').innerText()).replace(/,/g, ''));
}

export async function closePopup(page: Page) {
  await page.getByTestId('transaction-modal').getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('transaction-modal')).toHaveCount(0);
}

export async function chooseOption(page: Page, text: string) {
  const front = page.locator('.flip-front [data-testid=option], .assessment [data-testid=option]');
  const count = await front.count();
  for (let i = 0; i < count; i += 1) {
    const option = front.nth(i);
    if ((await option.locator('.option-text').innerText()) === text) {
      await option.click();
      return;
    }
  }
  throw new Error(`Option not found: ${text}`);
}

export async function startElectrochemistryQuiz(page: Page) {
  await page.goto('/flashcards');
  await page.getByTestId('subject-card').filter({ hasText: 'Chemistry' }).click();
  await page.getByTestId('chapter-card').filter({ hasText: 'Electrochemistry' }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.getByTestId('quiz-progress')).toContainText('Question 01 of 12');
}

/** Answers `count` questions of the open quiz, correctly by default. */
export async function answerQuestions(page: Page, chapterId: string, count: number, correct = true, advance = true) {
  for (let i = 0; i < count; i += 1) {
    const text = await page.locator('.flip-front [data-testid=question-text]').innerText();
    const key = answerKey(chapterId, text);
    await chooseOption(page, correct ? key.right : key.wrong);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByTestId('feedback').locator('.verdict')).toHaveText(correct ? 'Correct' : 'Incorrect');
    const next = page.getByRole('button', { name: /Next question|Finish quiz/ });
    if (advance && (await next.innerText()) === 'Next question') await next.click();
  }
}

export async function openChemistryRoadmap(page: Page) {
  await page.goto('/remediation/EX-PREBOARD/c12-chem');
  await expect(page.getByTestId('roadmap-node').first()).toBeVisible();
}

/** Answers the open assessment with exactly `correctCount` right answers, then submits. */
export async function takeAssessment(page: Page, chapterId: string, correctCount: number) {
  const seen: string[] = [];
  const total = Number((await page.getByTestId('assessment-progress').innerText()).match(/of (\d+)/)?.[1]);
  for (let i = 0; i < total; i += 1) {
    const text = await page.locator('.assessment [data-testid=question-text]').innerText();
    seen.push(text);
    const key = answerKey(chapterId, text);
    await chooseOption(page, i < correctCount ? key.right : key.wrong);
    if (i < total - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByTestId('submit-assessment').click();
  return seen;
}

export async function setCoins(page: Page, value: number) {
  await page.goto('/settings');
  await page.getByTestId('set-coins').fill(String(value));
  await page.getByTestId('set-coins-submit').click();
  await expect(page.getByTestId('wallet-amount')).toHaveText(value.toLocaleString('en-IN'));
}

export async function setPoints(page: Page, value: number) {
  await page.goto('/settings');
  await page.getByTestId('set-points').fill(String(value));
  await page.getByTestId('set-points-submit').click();
  await expect(page.getByRole('status').filter({ hasText: 'Points updated' })).toBeVisible();
}

export async function myBoardPoints(page: Page) {
  await page.goto('/leaderboard');
  const row = page.locator('[data-testid=board-row].is-me');
  await expect(row).toBeVisible();
  return row.locator('td').last().innerText();
}

/** Loam's Select is Radix, not a native <select>. */
export async function pick(page: Page, testId: string, label: string) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: label, exact: true }).click();
}
