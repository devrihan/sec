import { expect, test } from '@playwright/test';

test('Hero avatars: unlock a hero with coins, transform, and show it on the leaderboard', async ({ page }) => {
  await page.goto('/avatars');
  await expect(page.getByTestId('heroes-tab')).toBeVisible();
  await expect(page.getByTestId('heroes-unlocked')).toHaveText('0 of 19 unlocked');

  // 1,000 coins: the 5,000-coin legendary stays locked and shows progress.
  const legend = page.locator('[data-testid="hero-card"][data-avatar="alien-cosmic-ascendant"]');
  await expect(legend).toHaveAttribute('data-status', 'insufficient');
  await expect(legend.getByTestId('hero-progress')).toContainText('4,000 more coins to unlock');

  const leaf = page.locator('[data-testid="hero-card"][data-avatar="ninja-leaf"]');
  await leaf.getByTestId('unlock-hero').click();
  await expect(page.getByTestId('transaction-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('wallet-amount')).toHaveText('100');
  await expect(leaf).toHaveAttribute('data-status', 'owned');
  await expect(page.getByTestId('heroes-unlocked')).toHaveText('1 of 19 unlocked');

  await leaf.getByRole('button', { name: /Become Leaf Ninja/ }).click();
  await expect(leaf).toHaveAttribute('data-status', 'equipped');

  await page.goto('/leaderboard');
  const me = page.locator('[data-testid="board-row"][aria-current="true"]');
  await expect(me.locator('img[data-hero="ninja-leaf"]')).toBeVisible();

  await page.goto('/avatars');
  await leaf.getByRole('button', { name: 'Take off' }).click();
  await expect(leaf).toHaveAttribute('data-status', 'owned');
});
