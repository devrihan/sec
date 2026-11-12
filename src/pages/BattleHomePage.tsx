import { Dices, Lock, MessagesSquare, Swords, Trophy, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { EMBLEMS, TeamEmblem } from '../components/battle/battle-parts';
import { BackLink, HERO_CTA, Note, Notice, Pick, WHITE_PANEL } from '../components/page-parts';
import { BATTLE_CALC_SECONDS, BATTLE_QUESTION_COUNT, BATTLE_SIMPLE_SECONDS, BATTLE_TEAM_SIZE, TEAM_BATTLE_REWARD } from '../config/rewards';
import { battleSubjects, createBattle, DEMO_TEAM_CODE, joinBattle, randomTeamName, TEAM_NAME_MAX } from '../services/battleService';
import { useStudent } from '../services/studentService';

const PANEL_TITLE = 'text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground';

const STEPS = [
  { icon: UsersRound, title: 'Squad up', body: `Make a team of ${BATTLE_TEAM_SIZE} and share your team code` },
  { icon: MessagesSquare, title: 'Talk it out', body: 'Private team chat and voice. The other team never sees or hears it' },
  { icon: Lock, title: 'Lock it in', body: 'All three pick the same answer, then lock it before the timer runs out' },
  { icon: Trophy, title: 'Win big', body: `Marks decide the winner. Winners get +${TEAM_BATTLE_REWARD.winBonusPoints} bonus points each` },
];

export function BattleDemoNote() {
  return <Note testId="battle-demo-note">Demo mode: your friends and the other team are simulated on this device. Chat and voice don't connect separate devices.</Note>;
}

export function BattleHomePage() {
  const student = useStudent();
  const navigate = useNavigate();
  const subjects = battleSubjects(student.class);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [name, setName] = useState(() => randomTeamName());
  const [emblem, setEmblem] = useState(0);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  return (
    <>
      <BackLink to="/flashcards">Flashcards</BackLink>
      <section className="battle-hero overflow-hidden rounded-2xl border p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md"><Swords className="size-6" aria-hidden="true" /></span>
          <div>
            <h1 className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px] text-foreground">Team Battle</h1>
            <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-muted-foreground">3 vs 3. Same questions, one answer per team, and the most marks wins.</p>
          </div>
        </div>
        <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl border bg-background/80 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"><s.icon className="size-4" aria-hidden="true" /></span>
              <div>
                <p className="text-[14px] leading-5 font-medium text-foreground">{i + 1}. {s.title}</p>
                <p className="text-[14px] leading-5 text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[14px] leading-5 text-muted-foreground">
          About {BATTLE_QUESTION_COUNT} MCQs worth 1, 2 or 3 marks. {BATTLE_SIMPLE_SECONDS / 60} minutes per question, {BATTLE_CALC_SECONDS / 60} for calculations. Each team gets one 50:50 and one +30s.
        </p>
      </section>
      <BattleDemoNote />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className={`${WHITE_PANEL} flex flex-col gap-4`}>
          <h2 className={PANEL_TITLE}>Create a team</h2>
          {subjects.length === 0 ? (
            <p className="text-[14px] leading-5 text-muted-foreground">Your class doesn't have enough MCQs for a battle yet.</p>
          ) : (
            <>
              <Pick label="Subject" testId="battle-subject" value={subjectId} options={subjects.map((s) => ({ value: s.id, label: s.name }))} onChange={setSubjectId} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-name">Team name</Label>
                <div className="flex gap-2">
                  <Input id="team-name" value={name} maxLength={TEAM_NAME_MAX} onChange={(e) => setName(e.target.value)} className="bg-background" data-testid="team-name-input" />
                  <Button type="button" variant="outline" size="icon" aria-label="Suggest a team name" onClick={() => setName(randomTeamName([name]))}><Dices className="size-4" /></Button>
                </div>
              </div>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">Emblem</legend>
                <div className="flex flex-wrap gap-2">
                  {EMBLEMS.map((e, i) => (
                    <button
                      key={e.label}
                      type="button"
                      aria-pressed={emblem === i}
                      aria-label={e.label}
                      onClick={() => setEmblem(i)}
                      className={cn('rounded-2xl p-0.5 ring-offset-2 ring-offset-background transition', emblem === i ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100')}
                    >
                      <TeamEmblem emblem={i} />
                    </button>
                  ))}
                </div>
              </fieldset>
              {createError && <Notice tone="error">{createError}</Notice>}
              <Button
                className={`${HERO_CTA} self-start`}
                disabled={!subjectId}
                data-testid="create-team"
                onClick={() => {
                  const battle = createBattle(subjectId, name, emblem);
                  if (battle) navigate(`/flashcards/battle/${battle.id}`);
                  else setCreateError("This subject doesn't have enough questions for a battle. Pick another one.");
                }}
              >
                <Swords className="size-4" />Create team
              </Button>
            </>
          )}
        </section>
        <section className={`${WHITE_PANEL} flex flex-col gap-4`}>
          <h2 className={PANEL_TITLE}>Join a friend's team</h2>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const outcome = joinBattle(code);
              if (outcome.ok) navigate(`/flashcards/battle/${outcome.battle.id}`);
              else setError(outcome.error);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="team-code">Team code</Label>
              <Input
                id="team-code"
                value={code}
                autoComplete="off"
                data-testid="team-code-input"
                aria-invalid={Boolean(error)}
                className="bg-background font-mono tracking-widest uppercase"
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
              />
            </div>
            {error && <Notice tone="error" testId="team-code-error">{error}</Notice>}
            <Button type="submit" variant="outline" className="self-start" data-testid="join-team">Join team</Button>
          </form>
          <p className="text-[14px] leading-5 text-muted-foreground">Try the demo code {DEMO_TEAM_CODE}.</p>
        </section>
      </div>
    </>
  );
}
