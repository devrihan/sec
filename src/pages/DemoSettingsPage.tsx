import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageTitle, Pick, WHITE_PANEL } from '../components/page-parts';
import { toDateKey, toTimeKey } from '../lib/dates';
import { setDemoCoins, setDemoPoints, simulateClassmateOvertake } from '../services/pointsService';
import { chaptersForSubject } from '../services/questionService';
import { resetDemo } from '../services/store';
import { availableClasses, sectionsForClass, setStudentContext, subjectsForClass, useCoins, useEarnedPoints, useStudent } from '../services/studentService';
import { addSession } from '../services/timetableService';

const PANEL_TITLE = 'text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground';

export function DemoSettingsPage() {
  const student = useStudent();
  const coins = useCoins();
  const points = useEarnedPoints();
  const [coinValue, setCoinValue] = useState('');
  const [pointValue, setPointValue] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** A session 40 minutes away falls inside the 45-minute reminder window straight away. */
  const addSoonSession = () => {
    const start = new Date(Date.now() + 40 * 60000);
    const end = new Date(start.getTime() + 30 * 60000);
    const subject = subjectsForClass(student.class)[0];
    const crossesMidnight = toDateKey(start) !== toDateKey(end);
    const outcome = addSession({
      date: toDateKey(start),
      startTime: toTimeKey(start),
      endTime: crossesMidnight ? '23:59' : toTimeKey(end),
      subjectId: subject.id,
      chapterId: chaptersForSubject(subject.id)[0]?.id ?? '',
      topic: 'Demo session',
    });
    setNotice(outcome.ok ? 'Session added 40 minutes from now. Watch the bell.' : outcome.error);
  };

  const overtake = () => {
    const name = simulateClassmateOvertake();
    setNotice(name ? `${name} just moved ahead of you.` : 'Nobody is behind you in this section, so no one can overtake you.');
  };

  return (
    <>
      <PageTitle title="Demo settings" sub="For presenters. None of this appears in the student's normal journey." />
      {notice && <Notice>{notice}</Notice>}

      <section className={`${WHITE_PANEL} space-y-4`}>
        <div>
          <h2 className={PANEL_TITLE}>Student context</h2>
          <p className="text-[14px] leading-5 text-muted-foreground">Changes the subjects, chapters and leaderboard shown.</p>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <Pick
            label="Class"
            className="w-[160px]"
            testId="class-select"
            value={String(student.class)}
            options={availableClasses().map((c) => ({ value: String(c), label: `Class ${c}` }))}
            onChange={(v) => setStudentContext(Number(v), sectionsForClass(Number(v))[0] ?? 'A')}
          />
          <Pick
            label="Section"
            className="w-[160px]"
            testId="section-select"
            value={student.section}
            options={sectionsForClass(student.class).map((s) => ({ value: s, label: `Section ${s}` }))}
            onChange={(v) => setStudentContext(student.class, v)}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">Academic year</span>
            <span className="flex h-9 items-center text-[14px] leading-5 text-muted-foreground">{student.academicYear}</span>
          </div>
        </div>
      </section>

      <section className={`${WHITE_PANEL} space-y-4`}>
        <h2 className={PANEL_TITLE}>Stage a scenario</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (coinValue === '') return;
            setDemoCoins(Number(coinValue));
            setCoinValue('');
            setNotice('Coin balance updated.');
          }}
        >
          <div className="flex w-[260px] flex-col gap-1.5">
            <Label htmlFor="set-coins">Set coins (now {coins.toLocaleString('en-IN')})</Label>
            <Input id="set-coins" type="number" min={0} value={coinValue} onChange={(e) => setCoinValue(e.target.value)} data-testid="set-coins" className="bg-background" />
          </div>
          <Button type="submit" variant="outline" data-testid="set-coins-submit">Set coins</Button>
        </form>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (pointValue === '') return;
            setDemoPoints(Number(pointValue));
            setPointValue('');
            setNotice('Points updated. Milestone badges above this total were removed so they can be earned again.');
          }}
        >
          <div className="flex w-[260px] flex-col gap-1.5">
            <Label htmlFor="set-points">Set earned points (now {points.toLocaleString('en-IN')})</Label>
            <Input id="set-points" type="number" min={0} value={pointValue} onChange={(e) => setPointValue(e.target.value)} data-testid="set-points" className="bg-background" />
          </div>
          <Button type="submit" variant="outline" data-testid="set-points-submit">Set points</Button>
        </form>
      </section>

      <section className={`${WHITE_PANEL} space-y-3`}>
        <div>
          <h2 className={PANEL_TITLE}>Trigger notifications</h2>
          <p className="text-[14px] leading-5 text-muted-foreground">Others fire by themselves from real activity, exam dates and holidays.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" data-testid="demo-session" onClick={addSoonSession}>Add a session in 40 minutes</Button>
          <Button variant="outline" data-testid="demo-overtake" onClick={overtake}>Let a classmate overtake me</Button>
        </div>
      </section>

      <section className={`${WHITE_PANEL} space-y-3 border-destructive/30`}>
        <div>
          <h2 className={PANEL_TITLE}>Reset demo data</h2>
          <p className="text-[14px] leading-5 text-muted-foreground">Returns coins, points, badges, avatars, rooms and all progress to the seeded starting state.</p>
        </div>
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              data-testid="reset-confirm"
              onClick={() => {
                resetDemo();
                setConfirming(false);
                setNotice('Demo data reset.');
              }}
            >
              Yes, reset everything
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" className="border-destructive/30 text-destructive hover:text-destructive" data-testid="reset-demo" onClick={() => setConfirming(true)}>
            Reset demo data
          </Button>
        )}
      </section>
    </>
  );
}
