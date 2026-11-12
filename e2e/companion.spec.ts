import { expect, test } from '@playwright/test';

for (const width of [1280, 1440, 1917]) {
  test(`Dashboard avatar sits beside the remediation card at ${width}px: 70/30, same height`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const companion = page.getByTestId('dashboard-companion');
    await expect(companion.getByTestId('avatar-3d')).toHaveAttribute('data-status', 'ready');

    const card = await page.getByTestId('module-remediation').boundingBox();
    const avatar = await companion.boundingBox();
    if (!card || !avatar) throw new Error('missing layout');
    expect(Math.round(avatar.height)).toBe(Math.round(card.height));
    expect(Math.round(avatar.y)).toBe(Math.round(card.y));
    const share = card.width / (card.width + avatar.width);
    expect(share).toBeGreaterThan(0.66);
    expect(share).toBeLessThan(0.74);
  });
}

test('The avatar keeps talking, and its links go somewhere useful', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('companion-text')).toContainText('Aarav! How are you doing today?');
  await page.getByTestId('companion-next').click();
  await expect(page.getByTestId('companion-text')).not.toContainText('How are you doing today?');
  for (let i = 0; i < 12; i += 1) {
    if ((await page.getByTestId('companion-text').innerText()).startsWith('Do this next')) break;
    await page.getByTestId('companion-next').click();
  }
  await expect(page.getByTestId('companion-bubble')).toHaveAttribute('data-kind', 'nudge');
  await page.getByTestId('companion-cta').click();
  await expect(page).toHaveURL(/\/remediation\/.+\/.+\/.+/);
});
