import { expect, test } from '@playwright/test';

test('Dashboard has a live galaxy background that stays behind the content', async ({ page }) => {
  await page.goto('/');
  const galaxy = page.getByTestId('galaxy-bg');
  await expect(galaxy).toBeVisible();

  // It fills the content area, not the sidebar or header, and never takes clicks.
  const main = await page.locator('#main').boundingBox();
  const box = await galaxy.boundingBox();
  expect(Math.round(box?.x ?? -1)).toBe(Math.round(main?.x ?? 0));
  expect(Math.round(box?.y ?? -1)).toBe(Math.round(main?.y ?? 0));
  await expect(galaxy).toHaveCSS('pointer-events', 'none');
  await page.getByRole('link', { name: 'Continue fixing' }).click();
  await expect(page).toHaveURL(/\/remediation\//);

  // Only on the dashboard.
  await page.goto('/leaderboard');
  await expect(page.getByTestId('galaxy-bg')).toHaveCount(0);
});
