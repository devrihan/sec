import { expect, test } from '@playwright/test';

test('Help chat: the avatar greets, answers starter and typed questions, and links into the app', async ({ page }) => {
  await page.goto('/leaderboard');
  await page.getByTestId('help-launcher').click();
  const chat = page.getByTestId('help-chat');
  await expect(chat).toBeVisible();
  await expect(chat.getByTestId('help-answer').first()).toContainText("Hi Aarav! I'm your study buddy");
  await expect(chat.getByTestId('help-chip')).toHaveCount(6);

  await chat.getByTestId('help-chip').filter({ hasText: 'How do I find my way around?' }).click();
  await expect(chat.getByTestId('help-answer').nth(1)).toContainText('The menu on the left');

  await chat.getByTestId('help-input').fill('where are the videos?');
  await chat.getByTestId('help-input').press('Enter');
  await expect(chat.getByTestId('help-answer').nth(2)).toContainText('Go to Preparation');
  await chat.getByTestId('help-link').filter({ hasText: 'Preparation' }).last().click();
  await expect(page).toHaveURL(/\/preparation$/);

  // The conversation survives moving between pages, and Escape closes it.
  await expect(chat.getByTestId('help-question')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(chat).toHaveCount(0);
  await expect(page.getByTestId('help-launcher')).toBeFocused();
});
