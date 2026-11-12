import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface BankQuestion {
  questionText: string;
  correctOptionId: string;
  options: { id: string; text: string }[];
}

const bank: BankQuestion[] = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));
const shots = process.env.BATTLE_SHOTS;

async function snap(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

/** Moves the fake clock forward in small steps, so the 250 ms game loop keeps up. */
async function run(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 500) await page.clock.runFor(500);
}

test('Team Battle: create a team, battle 3 vs 3 with private chat, and get rewarded', async ({ page }) => {
  await page.clock.install();
  await page.goto('/flashcards');
  await page.getByTestId('team-battle').click();
  await expect(page.getByRole('heading', { name: 'Team Battle' })).toBeVisible();
  await page.getByTestId('team-name-input').fill('Mole Patrol');
  await page.getByTestId('create-team').click();

  // Lobby: both teams, a team code, and a private chat.
  await expect(page.getByTestId('my-team').getByTestId('team-name')).toHaveText('Mole Patrol');
  await expect(page.getByTestId('team-code')).toHaveText(/^[A-Z0-9]{6}$/);
  await expect(page.getByTestId('chat-privacy')).toContainText('Only Mole Patrol can see this');
  await run(page, 12_000);
  await expect(page.getByTestId('lobby-filled')).toHaveText('6 of 6 players');
  await snap(page, '1-lobby');

  await page.getByTestId('chat-input').fill('Hi team, let us take it slow on the calculations');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-message').last()).toContainText('take it slow');

  await page.getByTestId('ready-toggle').click();
  await expect(page.getByTestId('battle-countdown')).toBeVisible();
  await run(page, 6_000);
  await expect(page.getByTestId('battle-arena')).toBeVisible();

  const total = 12;
  for (let i = 0; i < total; i += 1) {
    await expect(page.getByTestId('battle-progress')).toHaveText(`Question ${i + 1} of ${total}`);
    const text = await page.getByTestId('battle-question').innerText();
    const q = bank.find((b) => b.questionText === text);
    if (!q) throw new Error(`Question not in bank: ${text}`);
    const correct = q.options.find((o) => o.id === q.correctOptionId)?.text as string;
    await page.getByTestId('battle-option').filter({ has: page.getByText(correct, { exact: true }) }).click();
    for (let n = 0; n < 60 && !(await page.getByTestId('lock-in').isEnabled()); n += 1) await run(page, 1_000);
    if (i === 0) await snap(page, '2-arena');
    await page.getByTestId('lock-in').click();
    for (let n = 0; n < 20 && !(await page.getByTestId('reveal').isVisible()); n += 1) await run(page, 1_000);
    await expect(page.getByTestId('reveal')).toContainText('Correct!');
    if (i === 0) await snap(page, '3-reveal');
    await run(page, 4_000);
  }

  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByTestId('round-row')).toHaveCount(total);
  await expect(page.getByTestId('result-mine').getByTestId('final-score')).not.toHaveText('0');
  await expect(page.getByTestId('transaction-modal')).toBeVisible();
  await snap(page, '4-reward');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('battle-headline')).toHaveText(/Victory!|It's a draw!/);
  await expect(page.getByTestId('result-mine')).toContainText('Correct12');
  await snap(page, '5-results');
});
