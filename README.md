# Student Learning Platform (prototype)

A responsive student web app for Classes 9–12 with three connected modules: **Preparation**, **Flashcards** and **Remediation**. They share one student profile, coin wallet, section leaderboard, badges and avatars.

Built from `Student_Learning_Platform_Prototype_SRS.docx` v1.0 with React, Vite and TypeScript, using the Loam design system. It runs entirely in the browser on seeded JSON data and `localStorage`. There is no backend, login or API key.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
cd student-learning-platform
npm install
npm run dev
```

Open <http://localhost:5173>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app with live reload |
| `npm run build` | Type-checks and creates a production build in `dist/` |
| `npm run preview` | Serves the production build |
| `npm test` | Runs unit and data-integrity tests |
| `npm run test:e2e` | Runs the SRS acceptance scenarios in a real browser |

The browser tests use Microsoft Edge by default. To use Chrome, set `PW_CHANNEL=chrome`.

## Demo path (about 10 minutes)

To start clean, open **Demo settings** (top right) and choose **Reset demo data**. You begin as Aarav, Class 12M, with 1,000 coins, 2,450 points, rank #3.

1. **Preparation:** Chemistry → Electrochemistry. Play the video, then open Revision and Important Questions, and filter by 5 marks.
2. **Flashcards:** Chemistry → Electrochemistry → Start quiz. Take a hint (coins drop by 20, points don't change, and a popup confirms it). Submit an answer to flip the card. Finish all 12 questions: the reward arrives only then. A strong score moves Aarav past Kabir into #2.
3. **Rooms:** Flashcards → Multiplayer rooms. Create a room, wait for simulated classmates to join, and start. Or join with code `CHEM12M`. Try `PHYS12M` (closed) or any wrong code to see the errors.
4. **Avatar store:** buy Scientist for 600 coins. Coins fall, points and rank don't. Equip it and check the leaderboard.
5. **Remediation:** Pre-board → Chemistry → View my roadmap. All ten chapters appear, with chapter 2 onward locked. Review the mistakes in Solutions, then take the assessment. Fail one to see Retry, then pass to unlock the next chapter.
6. **Subject completion:** Mid-term → Mathematics is the quickest route, with one chapter already done and two left. The final pass pays 250 coins and 250 points, once.

7. **Timetable:** add a session, then edit, reschedule and delete it. The month view shows holidays and exams. "Suggested for you" comes from your exam errors: add a suggestion and the next chapter moves up.
8. **Avatar store:** drag the 3D character to rotate it. Select an item image to try it on, buy it, then equip it. It appears on the leaderboard and stays in your profile inventory.
9. **Notifications:** open the bell. Select a notification to go to the right screen. In Demo settings, "Add a session in 40 minutes" fires a reminder and "Let a classmate overtake me" fires a leaderboard alert.

Useful staging controls in **Demo settings**:

- **Set coins to 5** shows the insufficient-coins path for hints and avatars.
- **Set earned points to 90** lets the next quiz cross 100 and 200 and unlock badges. Milestone badges above the new total are removed so they can be earned again.
- **Change class or section** to 10B, 11A, 9A or 12N changes the subjects and leaderboard. Classes 9 and 11 show general questions and no CBSE previous-year questions.

## What's implemented

- **Preparation:** class-filtered subjects, chapters in syllabus order, video preview cards, revision snippets with formula blocks, and Important Questions with marks and source filters, expandable answers, and Class 10/12 versus 9/11 rules.
- **Flashcards:** subject → chapter → quiz intro, MCQ flip card, one answer per question, hints charged once per question per attempt, summary and rewards after the full quiz, resuming after refresh.
- **Multiplayer:** create, code, copy, join, lobby, host-only start, shared question set, final standings, one reward per participant.
- **Remediation:** exam and subject selection, sequential roadmap, error review, shuffled 5-question assessments, pass at 75% or above, unlimited retries, full attempt history, one reward per exam and subject, positive empty state.
- **Timetable:** add, edit, reschedule and delete sessions with overlap checks, week and month views, sample holidays and exam dates, and suggestions built only from exam errors and remediation records.
- **3D avatar:** a real-time Three.js character with interchangeable hair, face, hats, tops, bottoms, dresses, shoes, glasses and bags. Try on before buying, coin marketplace, permanent inventory, and 3D renders on the leaderboard and profile.
- **Notifications:** session reminders 45 and 15 minutes before, leaderboard overtakes, unfinished quizzes, flashcard inactivity, pending remediation, badges, rewards, weekly consistency, exams at 7, 3 and 1 days, and holidays. Includes a bell, a full list, read states and links to the relevant screen.
- **Shared:** transaction ledger, result popup with refreshed leaderboard after every student points or coin transaction, cumulative section leaderboard with deterministic tie-breaks, badges, avatar store, profile, persistence, reset.

## Simulated on purpose

| Area | What the prototype does | What production needs |
| --- | --- | --- |
| Hints | Returns the seeded `hintContext` for the question, labelled "Demo hints" | A provider behind a server-side proxy. Swap it in with `setHintProvider` in `hintService.ts`. Answer-leak screening and fallback are already applied. |
| Multiplayer | Classmates are timers on this device, labelled as demo mode. Separate devices don't connect. | A WebSocket backend in place of `tickRoom` in `roomService.ts` |
| Videos | Electrochemistry has a verified embedded video. Other chapters open a YouTube search in a new tab because no video IDs were supplied. Class 12 Human Reproduction has no video, to show "Video coming soon". | Curated video IDs in `videos.json` |
| Identity | One demo student with configurable class and section | Authentication |
| Storage | `localStorage` through `storageService.ts` | A database and API |
| Notifications | In-app list and toasts, checked every 15 seconds while the app is open. Nothing arrives when it's closed. | A server scheduler and push service |
| Leaderboard overtakes | Fire from real ledger changes, but classmates only gain points in rooms or through the demo button | Real classmates' activity |
| School calendar | Sample holidays in `holidays.json`, sample exams in `exam-schedule.json` (dated relative to the demo reset) | The school's calendar |

## Product decisions where the SRS left a gap

Please review these. Each one is easy to change.

1. **Reward values are placeholders.** The SRS leaves quiz and multiplayer rewards open. Everything is in `src/config/rewards.ts`. The quiz uses base 20 + 10 per correct answer, which gives the +120 for 10/12 shown in the wireframe. Multiplayer is base 30 + 10 per correct + 50 for first place.
2. **Written questions are stored separately.** The SRS requires exactly four options on every question, but also a 5-mark filter. MCQs stay in `questions.json`, and 3 and 5-mark written questions are in `descriptive-questions.json`. Only Important Questions reads the written file, so flashcards and assessments stay MCQ.
3. **The hint is charged after it arrives.** Section 6.6 implies charging first; section 4.1 says after a successful request. The prototype follows 4.1, so a failed hint never costs coins.
4. **Hints are for solo quizzes only.** They're off in rooms and remediation assessments, to keep those fair.
5. **The demo profile uses the SRS example of 2,450 points**, which is already above all badge thresholds. Use Demo settings to show badges unlocking.
6. **Quiz Champion and Remediation Finisher** have invented rules, since the SRS marks them optional: a perfect solo quiz, and a first subject completion. Neither pays coins.
7. **The marketplace spends coins, not leaderboard points.** The new brief says "points", but SRS 2.4 says spending must never lower rank. Coins are earned from the same flashcards, quizzes and remediation, so both rules hold.
8. **The 8 original avatars became Tops** at their original prices, so nothing from the SRS was removed. Everyone's first look uses free items.
9. **Reminders fire at 45 and 15 minutes.** The brief gives both in its examples. Both are in `config/rewards.ts`.
10. **Remediation shows only subjects with errors in the dropdown.** Subjects with none are listed underneath as links, so the "Great work!" empty state is reachable.

## Known limitations and next steps

- **All content is sample data.** Questions, revision notes and exam records were written for this prototype. An independent review found no wrong answer keys, but they haven't been checked by a subject teacher or against the current NCERT books.
- **"CBSE PYQ" and year tags are illustrative.** These are not real past papers, and the app says so on the Important Questions page. Replace them with the real question bank.
- **Syllabus coverage is partial.** Class 12 Chemistry has all 10 chapters. Other subjects have 2 to 4 sample chapters. Chapter numbers follow the authors' recollection of the rationalised NCERT books.
- **Exam errors exist only for Class 12.** Other classes see an empty state in Remediation.
- **Progress is per browser.** Clearing site data resets it, and nothing is secure against someone editing `localStorage`.
- **Saved demos reset once.** This version changed the saved data format, so an older browser session starts fresh.
- **Sample holidays run to March 2027.** After that the holiday list shows its empty state.
- **Bundle size:** the seed data is compiled into the app (about 550 KB, 160 KB gzipped). A real API removes this.

## Design system

The UI follows Loam (`inferentics/loam`, `origin/master` at `5c7f23a`), the Inferentics analytics app.

Copied unchanged from Loam, so don't edit these here:

- `src/styles/theme.css`: all design tokens
- `src/components/ui/*`: shadcn/Radix primitives
- `src/components/empty-states/*` and `src/components/page-skeletons.tsx`
- `src/lib/performance-bands.ts`, `src/lib/error-type-labels.ts`, `src/lib/utils.ts`
- `public/illustrations/*`

`src/lib/mistake-type-legend.ts` is also from Loam, with only its import path changed. `src/components/stat-card.tsx` and `section-average-card.tsx` are ports of Loam's components: `stat-card` uses React Router links instead of analytics, and `section-average-card` drops the trend row because nothing here compares exams.

Where this app deliberately differs from Loam:

| Area | Loam | Here | Why |
| --- | --- | --- | --- |
| Small screens | Desktop only | Responsive, with a bottom nav on phones | The SRS requires desktop, tablet and mobile |
| Assessment score colours | Green from 60% | Green only on a pass | The pass mark is 75%, so 60% must not look like a success |
| Coins, 3D avatars, badges, roadmap, timetable, notifications, flashcard flip | Don't exist | New, built from Loam tokens | SRS features with no Loam equivalent |
| Toasts | No toaster mounted | Sonner toaster | Reminders need to reach the student on any screen |
| Stack | Next.js, React 19 | Vite, React 19, React Router | The SRS recommends this and no server is needed |
| Fonts | `next/font` | Bundled `@fontsource` packages | No remote dependency, same typefaces |

## Project layout

```
src/
  app/         App shell and routes
  components/  Product components. ui/ holds Loam's primitives.
  pages/       One file per screen
  services/    All business logic. pointsService is the only place balances change.
  data/        Seed JSON
  config/      rewards.ts: every tunable value
  lib/         Loam helpers: score bands, mistake labels and colours
  avatar3d/    The 3D character builder, scene and thumbnail renderer
  styles/      theme.css (Loam tokens) and globals.css
  types/       Domain types
e2e/           Browser acceptance tests (AT-01 to AT-25)
```
