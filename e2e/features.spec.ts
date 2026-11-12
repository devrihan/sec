import { expect, test, type Page } from '@playwright/test';
import { closePopup, pick, wallet } from './helpers';

test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

const dayFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function addSession(page: Page, date: string, start: string, end: string, chapter = 'Matrices') {
  await page.getByTestId('add-session').click();
  await page.getByTestId('ses-date').fill(date);
  await page.getByTestId('ses-start').fill(start);
  await page.getByTestId('ses-end').fill(end);
  await pick(page, 'ses-subject', 'Mathematics');
  await pick(page, 'ses-chapter', chapter);
  await page.getByTestId('ses-save').click();
}

/** Proves the canvas drew real pixels, not a blank WebGL surface. */
async function canvasStats(page: Page) {
  return page.getByTestId('avatar-canvas').evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, copy.width, copy.height);
    const colours = new Set<number>();
    let painted = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] > 200) {
        painted += 1;
        colours.add((data[i] >> 3 << 10) | (data[i + 1] >> 3 << 5) | (data[i + 2] >> 3));
      }
    }
    return { painted, colours: colours.size, width: canvas.width };
  });
}

test.describe('Timetable', () => {
  test('creates, edits, reschedules and deletes a session', async ({ page }) => {
    await page.goto('/timetable');
    const date = dayFromNow(2);
    await addSession(page, date, '15:00', '17:00');
    await expect(page.getByTestId('timetable-notice')).toContainText('added');
    const day = page.locator(`[data-testid=day-block][data-date="${date}"]`);
    const rowCount = await day.count();
    if (rowCount === 0) await page.getByTestId('timetable-next').click();
    const row = day.getByTestId('session-row');
    await expect(row).toContainText('Mathematics – Matrices');
    await expect(row).toContainText('3:00 PM – 5:00 PM');

    await row.getByTestId('session-edit').click();
    await page.getByTestId('ses-topic').fill('Matrix inverse');
    await page.getByTestId('ses-save').click();
    await expect(row).toContainText('Matrix inverse');

    await page.reload();
    if (await day.count() === 0) await page.getByTestId('timetable-next').click();
    await expect(row).toContainText('Matrix inverse');

    await row.getByTestId('session-reschedule').click();
    await expect(page.getByTestId('ses-subject')).toHaveCount(0);
    await page.getByTestId('ses-start').fill('18:00');
    await page.getByTestId('ses-end').fill('19:00');
    await page.getByTestId('ses-save').click();
    await expect(row).toContainText('6:00 PM – 7:00 PM');

    await row.getByTestId('session-delete').click();
    await row.getByTestId('session-delete-confirm').click();
    await expect(row).toHaveCount(0);
  });

  test('blocks overlaps and bad times, with a clear reason', async ({ page }) => {
    await page.goto('/timetable');
    const date = dayFromNow(1);
    await addSession(page, date, '16:00', '17:30');
    await expect(page.getByTestId('ses-error')).toContainText('overlaps');
    await page.getByTestId('ses-start').fill('20:00');
    await page.getByTestId('ses-end').fill('19:00');
    await page.getByTestId('ses-save').click();
    await expect(page.getByTestId('ses-error')).toContainText('after the start');
  });

  test('shows holidays on the calendar, plus exams with dates and timings', async ({ page }) => {
    await page.goto('/timetable');
    await expect(page.getByTestId('upcoming-exams').getByTestId('exam-row')).toHaveCount(4);
    await expect(page.getByTestId('upcoming-exams')).toContainText('9:30 AM – 12:30 PM');
    await expect(page.getByTestId('upcoming-holidays')).toContainText('Diwali break');

    await page.getByRole('tab', { name: 'Month' }).click();
    await expect(page.getByTestId('month-day')).toHaveCount(42);
    await expect(page.locator('[data-holiday]').first()).toBeVisible();
    const exam = page.getByTestId('month-day').filter({ hasText: 'Mathematics exam' });
    await expect(exam).toHaveCount(1);
    await exam.click();
    await expect(page.getByTestId('day-block')).toContainText('Mathematics exam, 9:30 AM');
  });

  test('suggests chapters from exam errors and adds one to the plan', async ({ page }) => {
    await page.goto('/timetable');
    const first = page.getByTestId('suggestion').first();
    await expect(first).toContainText('Your previous exam performance indicates that');
    await expect(first).toContainText('Consider allocating additional study time to this chapter.');
    await expect(first).toContainText('Remediation still to finish');
    const title = await first.locator('p').first().innerText();
    const chapter = await first.getAttribute('data-chapter');

    await first.getByTestId('suggestion-add').click();
    await expect(page.getByTestId('ses-chapter')).toContainText(title);
    await page.getByTestId('ses-start').fill('10:00');
    await page.getByTestId('ses-end').fill('11:00');
    await page.getByTestId('ses-save').click();
    const planned = page.locator(`[data-testid=suggestion][data-chapter="${chapter}"]`);
    await expect(planned.getByTestId('suggestion-planned')).toHaveText('1 hr planned');
    await expect(page.getByTestId('suggestion').first()).not.toHaveAttribute('data-chapter', chapter as string);
  });

  test('has no suggestions, rather than made-up ones, for a class with no errors', async ({ page }) => {
    await page.goto('/settings');
    await pick(page, 'class-select', 'Class 9');
    await page.getByRole('link', { name: 'Timetable' }).click();
    await expect(page.getByTestId('no-suggestions')).toBeVisible();
  });
});

test.describe('3D avatar', () => {
  test('renders a real, rotatable 3D character', async ({ page }) => {
    await page.goto('/avatars');
    await expect(page.getByTestId('avatar-3d')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('avatar-canvas')).toBeVisible();
    await page.waitForTimeout(400);
    const stats = await canvasStats(page);
    expect(stats.painted).toBeGreaterThan(2000);
    expect(stats.colours).toBeGreaterThan(40);

    const before = await page.getByTestId('avatar-canvas').screenshot();
    await page.getByRole('button', { name: 'Rotate right' }).click();
    await page.getByRole('button', { name: 'Rotate right' }).click();
    await page.waitForTimeout(300);
    const after = await page.getByTestId('avatar-canvas').screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('tries on, buys, equips and keeps an item through a refresh', async ({ page }) => {
    await page.goto('/avatars');
    await page.getByRole('tab', { name: 'Hats' }).click();
    const card = page.locator('[data-testid=avatar-card][data-avatar=baseball-cap]');
    const viewer = page.getByTestId('avatar-3d');
    const start = await viewer.getAttribute('data-config');

    await card.getByRole('button', { name: 'Try on Baseball cap' }).click();
    await expect(page.getByTestId('preview-bar')).toContainText('Baseball cap');
    await expect(viewer).not.toHaveAttribute('data-config', start as string);
    expect(await wallet(page)).toBe(1000);

    await card.getByRole('button', { name: 'Purchase' }).click();
    await expect(page.getByTestId('txn-new')).toHaveText('800');
    await expect(page.getByTestId('txn-points')).toHaveText('No change');
    await closePopup(page);
    await expect(viewer).toHaveAttribute('data-config', start as string);

    await card.getByRole('button', { name: 'Equip' }).click();
    await expect(card).toHaveAttribute('data-status', 'equipped');
    await page.reload();
    await page.getByRole('tab', { name: 'Hats' }).click();
    await expect(card).toHaveAttribute('data-status', 'equipped');
    expect(await wallet(page)).toBe(800);

    await card.getByRole('button', { name: 'Remove' }).click();
    await expect(card).toHaveAttribute('data-status', 'owned');
    await page.goto('/profile');
    await expect(page.getByTestId('owned-avatars').locator('[data-avatar=baseball-cap]')).toBeVisible();
  });

  test('free looks change the avatar without costing coins', async ({ page }) => {
    await page.goto('/avatars');
    await page.getByRole('tab', { name: 'Hair & face' }).click();
    const viewer = page.getByTestId('avatar-3d');
    const start = await viewer.getAttribute('data-config');
    await page.getByTestId('skin-0').click();
    await page.getByRole('button', { name: 'Happy' }).click();
    await expect(viewer).not.toHaveAttribute('data-config', start as string);
    expect(await wallet(page)).toBe(1000);
  });

  test('shows 3D renders for every student on the leaderboard', async ({ page }) => {
    await page.goto('/leaderboard');
    const images = page.locator('[data-testid=board-row] img[data-avatar]');
    await expect(images).toHaveCount(10);
    await expect(images.first()).toHaveAttribute('src', /^data:image\/png/);
  });
});

test.describe('Notifications', () => {
  test('has a bell with an unread count, and redirects from a notification', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('unread-count')).toBeVisible();
    await page.getByTestId('bell').click();
    const panel = page.getByTestId('notification-panel');
    await expect(panel.getByTestId('notification').first()).toBeVisible();
    await panel.getByText('Your flashcards are waiting! Complete a quick quiz and earn points.').click();
    await expect(page).toHaveURL(/\/flashcards$/);
  });

  test('marks one and all as read, and keeps them through a refresh', async ({ page }) => {
    await page.goto('/notifications');
    const list = page.getByTestId('notification-list').getByTestId('notification');
    await expect(list.first()).toBeVisible();
    const total = await list.count();
    await list.first().getByTestId('mark-read').click();
    await expect(list.first()).toHaveAttribute('data-read', 'true');

    await page.getByRole('tab', { name: 'Unread' }).click();
    await expect(list).toHaveCount(total - 1);

    await page.reload();
    await expect(page.getByText(`You have ${total - 1} unread`)).toBeVisible();
    await page.getByTestId('mark-all-read').click();
    await expect(page.getByTestId('unread-count')).toHaveCount(0);
  });

  test('reminds about a session and pops a toast', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('demo-session').click();
    await expect(page.getByText(/study session starts in \d+ minutes\. Ready to go\?/)).toBeVisible({ timeout: 5000 });
    await page.goto('/notifications');
    await expect(page.locator('[data-testid=notification][data-type=timetable]')).toHaveCount(1);
  });

  test('tells the student when a classmate overtakes them', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('demo-overtake').click();
    await page.goto('/notifications');
    const n = page.locator('[data-testid=notification][data-type=leaderboard]');
    await expect(n).toContainText("You've been overtaken!");
    await expect(n).toContainText('Ishita has moved ahead of you on the leaderboard.');
    await n.getByRole('button').first().click();
    await expect(page).toHaveURL(/\/flashcards$/);
    await page.goto('/leaderboard');
    await expect(page.getByTestId('my-rank')).toHaveText('#4');
  });

  test('announces a badge earned by finishing a quiz', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('set-points').fill('90');
    await page.getByTestId('set-points-submit').click();
    await page.goto('/flashcards/c12-chem/c12-chem-03');
    await page.getByRole('button', { name: 'Start quiz' }).click();
    for (let i = 0; i < 8; i += 1) {
      await page.locator('.flip-front [data-testid=option]').first().click();
      await page.getByRole('button', { name: 'Submit answer' }).click();
      const finish = page.getByRole('button', { name: 'Finish quiz' });
      if (await finish.count()) await finish.click();
      else await page.getByRole('button', { name: 'Next question' }).click();
    }
    await closePopup(page);
    await page.goto('/notifications');
    await expect(page.getByText("You've earned the Starter badge.")).toBeVisible();
  });
});

test('Existing modules still work alongside the new features', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome, Aarav' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Preparation', 'Flashcards', 'Remediation', 'Timetable', 'Leaderboard', 'Avatar store', 'My profile']) {
    await nav.getByRole('link', { name }).click();
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

for (const width of [375, 768]) {
  test(`New pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/timetable', '/avatars', '/notifications']) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main') as HTMLElement;
        return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main.scrollWidth - main.clientWidth);
      });
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}

test('The badge case shows earned and locked badges, and opens a badge to explain it', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.locator('[data-badge=first-fix]')).toHaveAttribute('data-earned', 'true');
  const locked = page.locator('[data-badge=mark-hunter]');
  await expect(locked).toHaveAttribute('data-earned', 'false');
  await expect(locked).toContainText('6 / 10 marks');
  await locked.getByRole('button').click();
  const detail = page.getByTestId('badge-detail');
  await expect(detail).toContainText('Mark Hunter');
  await expect(detail.getByTestId('badge-rarity')).toHaveText('No one in your section has this yet');
  await page.keyboard.press('Escape');
  const broken = await page.locator('[data-testid=profile-badges] img').evaluateAll((list) => list.filter((img) => (img as HTMLImageElement).naturalWidth === 0).length);
  expect(broken).toBe(0);
});

test('Dark mode is off by default, and stays on through a refresh and a demo reset', async ({ page }) => {
  const html = page.locator('html');
  const toggle = page.getByTestId('theme-toggle');
  await page.goto('/');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(html).not.toHaveClass(/dark/);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(html).toHaveClass(/dark/);

  await page.goto('/settings');
  await expect(html).toHaveClass(/dark/);
  await page.getByTestId('reset-demo').click();
  await page.getByTestId('reset-confirm').click();
  await expect(page.getByText('Demo data reset.')).toBeVisible();
  await page.reload();
  await expect(html).toHaveClass(/dark/);

  await toggle.click();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});
