import { expect, test } from '@playwright/test';
import {
  bankTexts,
  closePopup,
  pick,
  answerQuestions,
  myBoardPoints,
  openChemistryRoadmap,
  setCoins,
  setPoints,
  startElectrochemistryQuiz,
  takeAssessment,
  wallet,
} from './helpers';

const ELECTRO = 'c12-chem-02';
const SOLUTIONS = 'c12-chem-01';

// Any uncaught browser error fails the test that caused it.
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('AT-01 Preparation subject selection shows only that subject', async ({ page }) => {
  await page.goto('/preparation');
  await expect(page.getByTestId('subject-card')).toHaveCount(4);
  await page.getByTestId('subject-card').filter({ hasText: 'Chemistry' }).click();
  const cards = page.getByTestId('chapter-card');
  await expect(cards).toHaveCount(10);
  await expect(cards.first()).toContainText('Solutions');
  await expect(page.getByText('Matrices')).toHaveCount(0);
  await expect(page.getByText('Current Electricity')).toHaveCount(0);
});

test('AT-02 Video preview shows thumbnail, title and play action', async ({ page }) => {
  await page.goto(`/preparation/c12-chem/${ELECTRO}`);
  await expect(page.getByRole('img', { name: /Thumbnail for Electrochemistry/ })).toBeVisible();
  await expect(page.getByText('Electrochemistry in One Shot')).toBeVisible();
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(1);

  await page.goto('/preparation/c12-bio/c12-bio-02');
  await expect(page.getByText('Video coming soon').first()).toBeVisible();
});

test('AT-03 Revision renders concepts and formula blocks', async ({ page }) => {
  await page.goto(`/preparation/c12-chem/${ELECTRO}`);
  await page.getByTestId('open-revision').click();
  await expect(page.locator('.snippet').first()).toBeVisible();
  await expect(page.getByTestId('formula').first()).toBeVisible();
  await page.getByRole('button', { name: 'Next snippet' }).click();
  await expect(page.locator('.snippet.is-active')).toHaveCount(1);
});

test('AT-04 Important Questions come from seeded data with marks, source and filters', async ({ page }) => {
  await page.goto(`/preparation/c12-chem/${ELECTRO}`);
  await page.getByTestId('open-questions').click();
  const rows = page.getByTestId('bank-row');
  await expect(rows.first()).toBeVisible();
  const mcqs = bankTexts(ELECTRO);
  await expect(page.getByText(mcqs[0], { exact: true })).toBeVisible();
  await expect(rows.first().getByTestId('source-tag')).toBeVisible();

  const all = await rows.count();
  await page.getByTestId('marks-5').click();
  const five = await rows.count();
  expect(five).toBeGreaterThan(0);
  expect(five).toBeLessThan(all);
  for (let i = 0; i < five; i += 1) await expect(rows.nth(i)).toContainText('5 marks');

  await page.getByRole('tab', { name: 'All marks' }).click();
  await pick(page, 'source-filter', 'CBSE PYQ');
  await expect(rows.first().getByTestId('source-tag')).toContainText('CBSE PYQ');
  await rows.first().getByText('Show answer').click();
});

test('AT-04b Class 9 and 11 show general questions, never CBSE PYQs', async ({ page }) => {
  await page.goto('/settings');
  await pick(page, 'class-select', 'Class 11');
  await page.goto('/preparation');
  await expect(page.getByTestId('subject-card')).toHaveCount(4);
  await page.getByTestId('subject-card').filter({ hasText: 'Physics' }).click();
  await page.getByTestId('chapter-card').first().click();
  await page.getByTestId('open-questions').click();
  await expect(page.getByText(/general important questions/)).toBeVisible();
  await expect(page.getByTestId('source-tag').filter({ hasText: 'CBSE PYQ' })).toHaveCount(0);
});

test('AT-05 Flashcard MCQ: one question, four options, feedback, locked answer', async ({ page }) => {
  await startElectrochemistryQuiz(page);
  await expect(page.locator('.flip-front [data-testid=option]')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
  await answerQuestions(page, ELECTRO, 1, false, false);
  await expect(page.locator('.flip-back [data-state=correct]')).toHaveCount(1);
  await expect(page.locator('.flip-back [data-state=incorrect]')).toHaveCount(1);
  await expect(page.locator('.flip-back input').first()).toBeDisabled();
  await expect(page.getByText('Why:')).toBeVisible();
});

test('AT-06 Hint with sufficient balance is charged once', async ({ page }) => {
  await startElectrochemistryQuiz(page);
  const before = await wallet(page);
  const hint = page.getByTestId('hint-button');
  await hint.dblclick();
  await expect(page.getByTestId('transaction-modal')).toBeVisible();
  await expect(page.getByTestId('txn-prev')).toHaveText('1,000');
  await expect(page.getByTestId('txn-new')).toHaveText('980');
  await expect(page.getByTestId('txn-points')).toHaveText('No change');
  await expect(page.getByTestId('txn-rank')).toContainText('#3');
  await closePopup(page);
  await expect(page.getByTestId('hint-text')).toBeVisible();
  expect(await wallet(page)).toBe(before - 20);

  await page.reload();
  await expect(page.getByTestId('hint-text')).toBeVisible();
  expect(await wallet(page)).toBe(before - 20);
});

test('AT-07 Hint with insufficient balance is refused with a message', async ({ page }) => {
  await setCoins(page, 5);
  await expect(page.getByTestId('wallet')).toContainText('Too low for hints');
  await page.getByRole('link', { name: 'Flashcards' }).click();
  await page.getByTestId('subject-card').filter({ hasText: 'Chemistry' }).click();
  await page.getByTestId('chapter-card').filter({ hasText: 'Electrochemistry' }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('hint-message')).toContainText('Hints cost 20 coins and you have 5');
  await expect(page.getByTestId('hint-text')).toHaveCount(0);
  await expect(page.getByTestId('transaction-modal')).toHaveCount(0);
  expect(await wallet(page)).toBe(5);
});

test('AT-08 Quiz reward arrives only at the end, and only once', async ({ page }) => {
  await startElectrochemistryQuiz(page);
  await answerQuestions(page, ELECTRO, 6);
  expect(await wallet(page)).toBe(1000);
  await page.reload();
  expect(await wallet(page)).toBe(1000);
  await expect(page.getByTestId('quiz-progress')).toContainText('Question 07 of 12');

  await answerQuestions(page, ELECTRO, 6);
  await page.getByRole('button', { name: 'Finish quiz' }).click();
  await expect(page.getByTestId('txn-new')).toHaveText('1,140');
  await expect(page.getByTestId('txn-points')).toHaveText('+140');
  await closePopup(page);
  await expect(page.getByTestId('quiz-result')).toContainText('Score: 12 / 12');
  await expect(page.getByTestId('quiz-result')).toContainText('Accuracy: 100%');

  await page.reload();
  await expect(page.getByTestId('quiz-result')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('quiz-result').or(page.getByTestId('quiz-count'))).toBeVisible();
  await page.reload();
  expect(await wallet(page)).toBe(1140);
  await expect(page.getByTestId('transaction-modal')).toHaveCount(0);
});

test('AT-09 Leaderboard contains only 12M', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByTestId('board-row')).toHaveCount(10);
  await expect(page.getByRole('heading', { name: 'Class 12M leaderboard' })).toBeVisible();
  await expect(page.getByText('Nikhil')).toHaveCount(0);
  await expect(page.getByTestId('my-rank')).toHaveText('#3');

  await page.goto('/settings');
  await pick(page, 'section-select', 'Section N');
  await page.goto('/leaderboard');
  await expect(page.getByTestId('leaderboard').getByText('Nikhil')).toBeVisible();
  await expect(page.getByText('Meera')).toHaveCount(0);
});

test('AT-10 Buying an avatar lowers coins, not points or rank', async ({ page }) => {
  const before = await myBoardPoints(page);
  await page.goto('/avatars');
  await page.locator('[data-avatar=scientist]').getByRole('button', { name: 'Purchase' }).click();
  await expect(page.getByTestId('txn-new')).toHaveText('400');
  await expect(page.getByTestId('txn-points')).toHaveText('No change');
  await closePopup(page);
  expect(await myBoardPoints(page)).toBe(before);
  await expect(page.getByTestId('my-rank')).toHaveText('#3');
});

test('AT-11 Crossing 100, 200 and 300 points unlocks badges', async ({ page }) => {
  await setPoints(page, 90);
  await page.goto('/profile');
  await expect(page.locator('[data-badge=starter]')).toHaveAttribute('data-earned', 'false');

  await startElectrochemistryQuiz(page);
  await answerQuestions(page, ELECTRO, 12);
  await page.getByRole('button', { name: 'Finish quiz' }).click();
  await expect(page.getByTestId('txn-badges')).toContainText('Starter');
  await expect(page.getByTestId('txn-badges')).toContainText('Achiever');
  await closePopup(page);
  await page.goto('/profile');
  await expect(page.getByTestId('profile-points')).toHaveText('230');
  await expect(page.locator('[data-badge=achiever]')).toHaveAttribute('data-earned', 'true');
  await expect(page.locator('[data-badge=champion]')).toHaveAttribute('data-earned', 'false');

  await startElectrochemistryQuiz(page);
  await answerQuestions(page, ELECTRO, 12);
  await page.getByRole('button', { name: 'Finish quiz' }).click();
  await expect(page.getByTestId('txn-badges')).toContainText('Champion');
  await closePopup(page);
  await page.goto('/leaderboard');
  await expect(page.locator('[data-testid=board-row].is-me')).toContainText('Champion');
});

test('AT-12 A bought avatar appears in the owned collection', async ({ page }) => {
  await page.goto('/avatars');
  await page.locator('[data-avatar=gamer]').getByRole('button', { name: 'Purchase' }).click();
  await closePopup(page);
  await expect(page.locator('[data-testid=avatar-card][data-avatar=gamer]')).toHaveAttribute('data-status', 'owned');
  await page.goto('/profile');
  await expect(page.getByTestId('owned-avatars').locator('[data-avatar=gamer]')).toBeVisible();
});

test('AT-13 A purchase without enough coins is blocked', async ({ page }) => {
  await page.goto('/avatars');
  const card = page.locator('[data-testid=avatar-card][data-avatar=super-learner]');
  await expect(card).toHaveAttribute('data-status', 'insufficient');
  await expect(card.getByRole('button', { name: 'Purchase' })).toBeDisabled();
  await expect(card).toContainText('500 more coins needed');
  expect(await wallet(page)).toBe(1000);
});

test('AT-14 An equipped avatar appears in profile and leaderboard', async ({ page }) => {
  await page.goto('/avatars');
  await page.locator('[data-avatar=gamer]').getByRole('button', { name: 'Purchase' }).click();
  await closePopup(page);
  await page.locator('[data-avatar=gamer]').getByRole('button', { name: 'Equip' }).click();
  await expect(page.locator('[data-testid=avatar-card][data-avatar=gamer]')).toHaveAttribute('data-status', 'equipped');
  await page.goto('/profile');
  await expect(page.getByTestId('profile-avatar')).toHaveAttribute('data-avatar', 'gamer');
  await page.goto('/leaderboard');
  await expect(page.locator('[data-testid=board-row].is-me img[data-avatar=gamer]')).toBeVisible();
});

test('AT-15 Creating a room gives a unique code and host state', async ({ page }) => {
  await page.goto('/flashcards/rooms');
  await expect(page.getByTestId('demo-mode-note')).toBeVisible();
  await page.getByTestId('create-room').click();
  const first = await page.getByTestId('room-code').innerText();
  expect(first).toMatch(/^MATH[A-Z0-9]{3}$/);
  await expect(page.getByTestId('room-host')).toHaveText('Aarav');
  await expect(page.getByTestId('player').first()).toContainText('Host');

  await page.getByRole('button', { name: 'Close room' }).click();
  await page.getByTestId('create-room').click();
  expect(await page.getByTestId('room-code').innerText()).not.toBe(first);
});

test('AT-16 Joining: a valid code enters the lobby, an invalid code shows an error', async ({ page }) => {
  await page.goto('/flashcards/rooms');
  await page.getByTestId('room-code-input').fill('NOPE99');
  await page.getByTestId('join-room').click();
  await expect(page.getByTestId('room-error')).toContainText('No room has the code NOPE99');

  await page.getByTestId('room-code-input').fill('PHYS12M');
  await page.getByTestId('join-room').click();
  await expect(page.getByTestId('room-error')).toContainText('no longer open');

  await page.getByTestId('room-code-input').fill('chem12m');
  await page.getByTestId('join-room').click();
  await expect(page.locator('[data-testid=player][data-student=STU-12M-001]')).toBeVisible();
  await expect(page.getByTestId('room-host')).toHaveText('Meera');
  await expect(page.getByTestId('start-room')).toBeDisabled();
  await expect(page.getByTestId('host-only')).toBeVisible();
  await expect(page.getByTestId('quiz-progress')).toContainText('of 10', { timeout: 15_000 });
});

test('AT-16b Host starts, same questions, final standings, one reward', async ({ page }) => {
  await page.goto('/flashcards/rooms');
  await pick(page, 'room-subject', 'Chemistry');
  await pick(page, 'room-chapter', 'Electrochemistry');
  await page.getByTestId('create-room').click();
  await expect(page.getByTestId('start-room')).toBeDisabled();
  await expect(page.getByTestId('start-blocked')).toBeVisible();
  await expect(page.getByTestId('player').nth(1)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('start-room').click();

  await expect(page.getByTestId('quiz-progress')).toContainText('of 10');
  await expect(page.getByTestId('hint-button')).toHaveCount(0);
  await answerQuestions(page, ELECTRO, 10);
  const before = await wallet(page);
  await page.getByRole('button', { name: 'Finish quiz' }).click();

  await expect(page.getByTestId('transaction-modal')).toBeVisible();
  const reward = Number(await page.getByTestId('txn-points').innerText().then((t) => t.replace('+', '')));
  expect(reward).toBeGreaterThanOrEqual(130);
  await closePopup(page);
  await expect(page.getByTestId('room-result-row').first()).toContainText('#1');
  await expect(page.getByTestId('room-results')).toContainText('10 / 10');

  await page.reload();
  await expect(page.getByTestId('room-results')).toBeVisible();
  expect(await wallet(page)).toBe(before + reward);
});

test('AT-17 Roadmap includes all ten chapters with errors', async ({ page }) => {
  await page.goto('/remediation');
  await pick(page, 'exam-select', 'Pre-board');
  await pick(page, 'remediation-subject', 'Chemistry');
  await page.getByTestId('view-roadmap').click();
  await expect(page.getByTestId('roadmap-node')).toHaveCount(10);
  await expect(page.getByTestId('progress-count')).toHaveText('0 / 10 chapters');
});

test('AT-18 A later chapter is locked until the previous one is passed', async ({ page }) => {
  await openChemistryRoadmap(page);
  const nodes = page.getByTestId('roadmap-node');
  await expect(nodes.nth(0)).toHaveAttribute('data-state', 'current');
  await expect(nodes.nth(1)).toHaveAttribute('data-state', 'locked');
  await nodes.nth(1).click({ force: true }); // aria-disabled, but still clickable so it can explain why
  await expect(page.getByTestId('locked-note')).toContainText('Pass Solutions');
  await expect(page).toHaveURL(/EX-PREBOARD\/c12-chem$/);

  await page.goto(`/remediation/EX-PREBOARD/c12-chem/${ELECTRO}`);
  await expect(page.getByText('This chapter is locked')).toBeVisible();
  await page.goto(`/remediation/EX-PREBOARD/c12-chem/${ELECTRO}/assessment`);
  await expect(page.getByText('This chapter is locked')).toBeVisible();
  await expect(page.getByTestId('submit-assessment')).toHaveCount(0);
});

test('AT-19 AT-20 Below 75% stays current; a pass completes and unlocks', async ({ page }) => {
  await openChemistryRoadmap(page);
  await page.getByTestId('continue-chapter').click();
  await expect(page.getByTestId('error-card').first()).toContainText('Your answer');
  await page.getByTestId('start-assessment').click();

  await takeAssessment(page, SOLUTIONS, 3);
  await expect(page.getByTestId('assessment-failed')).toBeVisible();
  await expect(page.getByTestId('assessment-score')).toHaveText('Score: 3 / 5 = 60%');
  await expect(page.getByTestId('retry-assessment')).toBeVisible();
  await openChemistryRoadmap(page);
  await expect(page.getByTestId('roadmap-node').nth(0)).toHaveAttribute('data-state', 'current');

  await page.getByTestId('continue-chapter').click();
  await page.getByTestId('start-assessment').click();
  await takeAssessment(page, SOLUTIONS, 4);
  await expect(page.getByTestId('assessment-passed')).toBeVisible();
  await expect(page.getByTestId('assessment-score')).toHaveText('Score: 4 / 5 = 80%');
  await expect(page.getByTestId('next-unlocked')).toContainText('Electrochemistry');
  await page.getByTestId('continue-roadmap').click();

  const nodes = page.getByTestId('roadmap-node');
  await expect(nodes.nth(0)).toHaveAttribute('data-state', 'completed');
  await expect(nodes.nth(1)).toHaveAttribute('data-state', 'current');
  await expect(nodes.nth(2)).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('progress-count')).toHaveText('1 / 10 chapters');
  expect(await wallet(page)).toBe(1000);
});

test('AT-21 Unlimited retries with reshuffled questions', async ({ page }) => {
  await openChemistryRoadmap(page);
  await page.getByTestId('continue-chapter').click();
  await page.getByTestId('start-assessment').click();

  const sequences: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    sequences.push((await takeAssessment(page, SOLUTIONS, 0)).join('|'));
    await expect(page.getByTestId('assessment-failed')).toBeVisible();
    await page.getByTestId('retry-assessment').click();
  }
  for (let i = 1; i < sequences.length; i += 1) expect(sequences[i]).not.toBe(sequences[i - 1]);
  await expect(page.getByTestId('assessment-progress')).toBeVisible();
  await page.goto(`/remediation/EX-PREBOARD/c12-chem/${SOLUTIONS}`);
  await expect(page.getByTestId('attempt-row')).toHaveCount(4);
});

test('AT-22 AT-23 Subject completion pays once and stays 100%', async ({ page }) => {
  // Mathematics Mid-term has three chapters and the first is already passed in the seed.
  const road = '/remediation/EX-MIDTERM/c12-math';
  await page.goto(road);
  await expect(page.getByTestId('progress-count')).toHaveText('1 / 3 chapters');

  await page.getByTestId('continue-chapter').click();
  await page.getByTestId('start-assessment').click();
  await takeAssessment(page, 'c12-math-03', 5);
  await expect(page.getByTestId('assessment-passed')).toBeVisible();
  expect(await wallet(page)).toBe(1000);
  await page.getByTestId('continue-roadmap').click();

  await page.getByTestId('continue-chapter').click();
  await page.getByTestId('start-assessment').click();
  await takeAssessment(page, 'c12-math-04', 5);
  await expect(page.getByTestId('txn-prev')).toHaveText('1,000');
  await expect(page.getByTestId('txn-new')).toHaveText('1,250');
  await expect(page.getByTestId('txn-points')).toHaveText('+250');
  await expect(page.getByTestId('txn-badges')).toContainText('Remediation Finisher');
  await closePopup(page);
  await page.getByTestId('continue-roadmap').click();
  await expect(page.getByTestId('subject-complete')).toBeVisible();
  await expect(page.getByTestId('progress-percent')).toContainText('100%');

  await page.reload();
  await expect(page.getByTestId('subject-complete')).toBeVisible();
  await expect(page.getByTestId('transaction-modal')).toHaveCount(0);
  expect(await wallet(page)).toBe(1250);
  await page.goto('/profile');
  await expect(page.getByTestId('ledger').getByRole('row').filter({ hasText: 'Remediation reward' })).toHaveCount(1);
  await expect(page.getByTestId('profile-points')).toHaveText('2,700');
});

test('AT-24 AT-25 State survives refresh, and reset restores the seed', async ({ page }) => {
  await page.goto('/avatars');
  await page.locator('[data-avatar=gamer]').getByRole('button', { name: 'Purchase' }).click();
  await closePopup(page);
  await page.locator('[data-avatar=gamer]').getByRole('button', { name: 'Equip' }).click();
  await openChemistryRoadmap(page);
  await page.getByTestId('continue-chapter').click();
  await page.getByTestId('start-assessment').click();
  await takeAssessment(page, SOLUTIONS, 5);
  await expect(page.getByTestId('assessment-passed')).toBeVisible();

  await page.reload();
  expect(await wallet(page)).toBe(350);
  await page.goto('/profile');
  await expect(page.getByTestId('profile-avatar')).toHaveAttribute('data-avatar', 'gamer');
  await expect(page.locator('[data-badge=champion]')).toHaveAttribute('data-earned', 'true');
  await openChemistryRoadmap(page);
  await expect(page.getByTestId('progress-count')).toHaveText('1 / 10 chapters');

  await page.goto('/settings');
  await page.getByTestId('reset-demo').click();
  await page.getByTestId('reset-confirm').click();
  await expect(page.getByText('Demo data reset.')).toBeVisible();
  expect(await wallet(page)).toBe(1000);
  await page.goto('/profile');
  await expect(page.getByTestId('profile-avatar')).toHaveAttribute('data-avatar', 'blue-hoodie');
  await expect(page.getByTestId('profile-points')).toHaveText('2,450');
  await expect(page.getByTestId('owned-avatars').locator('li')).toHaveCount(1);
  await openChemistryRoadmap(page);
  await expect(page.getByTestId('progress-count')).toHaveText('0 / 10 chapters');
});

test('SRS 7.10 A subject with no errors shows the positive empty state', async ({ page }) => {
  await page.goto('/remediation');
  await pick(page, 'exam-select', 'Pre-board');
  await page.getByTestId('clear-subject').filter({ hasText: 'Biology' }).click();
  await expect(page.getByText('No remediation chapters found for this subject. Great work!')).toBeVisible();
  await expect(page.getByTestId('roadmap-node')).toHaveCount(0);
});

test('Navigation has no dead ends: unknown links recover to the dashboard', async ({ page }) => {
  await page.goto('/nowhere/at/all');
  await page.getByRole('link', { name: 'Go to dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Aarav' })).toBeVisible();
  for (const name of ['Preparation', 'Flashcards', 'Remediation', 'Dashboard']) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click();
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('Corrupted saved data falls back to the seed instead of a blank screen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('slp.demo.state', '{not json'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, Aarav' })).toBeVisible();
});

for (const width of [375, 768]) {
  test(`Responsive at ${width}px: no sideways scrolling on key pages`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/', '/preparation/c12-chem/c12-chem-02', '/preparation/c12-chem/c12-chem-02/questions', '/leaderboard', '/avatars', '/profile', '/remediation/EX-PREBOARD/c12-chem', '/remediation/EX-MIDTERM/c12-math/c12-math-01']) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main') as HTMLElement;
        return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main.scrollWidth - main.clientWidth);
      });
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}
