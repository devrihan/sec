import { Calculator, Check, Copy, Dices, Flame, Hourglass, Lock, Pencil, Sparkles, Swords, Timer, Users } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EMBLEMS, formatClock, formatMinutes, PlayerAvatar, studentName, TeamEmblem, useNow } from '../components/battle/battle-parts';
import { TeamChat } from '../components/battle/TeamChat';
import { VoicePanel } from '../components/battle/VoicePanel';
import { BackLink, HERO_CTA, Notice, NotFoundState } from '../components/page-parts';
import { BATTLE_TEAM_SIZE } from '../config/rewards';
import { battleById, teamOf } from '../services/battleComms';
import {
  battleDetails,
  castVote,
  isCalculation,
  leaveBattle,
  LIFELINE_LABEL,
  lockInAnswer,
  randomTeamName,
  rivalOf,
  roundView,
  scoreOf,
  setReady,
  setTeamEmblem,
  setTeamName,
  spendLifeline,
  streakOf,
  TEAM_NAME_MAX,
  tickBattle,
  type RoundView,
} from '../services/battleService';
import { subjectById } from '../services/catalog';
import { useAppState } from '../services/store';
import type { BattleLifeline, BattleTeam, TeamBattle } from '../types';
import { BattleDemoNote } from './BattleHomePage';

export function BattlePage() {
  const { battleId = '' } = useParams();
  const navigate = useNavigate();
  const battle = useAppState((s) => battleById(s, battleId));
  const myId = useAppState((s) => s.demoStudentId);

  useEffect(() => {
    tickBattle(battleId);
    const timer = setInterval(() => tickBattle(battleId), 250);
    return () => clearInterval(timer);
  }, [battleId]);

  useEffect(() => {
    if (battle?.status === 'finished') navigate(`/flashcards/battle/${battle.id}/results`, { replace: true });
  }, [battle?.status, battle?.id, navigate]);

  if (!battle) return <NotFoundState message="This battle doesn't exist. It may have been cleared by a demo reset." />;
  const team = teamOf(battle, myId);
  if (battle.status === 'closed' || !team) {
    return <NotFoundState message="You aren't in this battle. Create a team or join one with a code." />;
  }

  const mine = battle.teams[team];
  const comms = (
    <div className="flex flex-col gap-4">
      <VoicePanel battle={battle} viewerId={myId} teamName={mine.name} />
      <TeamChat battleId={battle.id} viewerId={myId} teamName={mine.name} />
    </div>
  );

  return (
    <>
      <BackLink to="/flashcards/battle">Team Battle</BackLink>
      <BattleDemoNote />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {battle.status === 'in_progress' ? <Arena battle={battle} viewerId={myId} /> : <Lobby battle={battle} viewerId={myId} />}
        </div>
        {comms}
      </div>
    </>
  );
}

/* ---------- Lobby ---------- */

function Lobby({ battle, viewerId }: { battle: TeamBattle; viewerId: string }) {
  const navigate = useNavigate();
  const now = useNow();
  const team = teamOf(battle, viewerId) ?? 'A';
  const mine = battle.teams[team];
  const rival = battle.teams[rivalOf(team)];
  const details = battleDetails(battle);
  const me = mine.members.find((m) => m.studentId === viewerId);
  const counting = battle.status === 'countdown' && battle.countdownEndsAt !== null;
  const secondsLeft = counting ? Math.max(1, Math.ceil(((battle.countdownEndsAt as number) - now) / 1000)) : 0;
  const filled = mine.members.length + rival.members.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px] text-foreground">Battle lobby</h1>
          <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-muted-foreground">{subjectById(battle.subjectId)?.name}</p>
        </div>
        <span className="text-[14px] leading-5 text-muted-foreground tabular-nums" data-testid="lobby-filled">{filled} of {BATTLE_TEAM_SIZE * 2} players</span>
      </div>

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
        <TeamCard battle={battle} team={mine} viewerId={viewerId} own rivalEmblem={rival.emblem} />
        <span className="absolute top-1/2 left-1/2 z-10 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-background bg-foreground text-[14px] font-bold text-background md:flex" aria-hidden="true">VS</span>
        <TeamCard battle={battle} team={rival} viewerId={viewerId} />
      </div>

      <section className="rounded-2xl border bg-background p-5" aria-label="Quiz details">
        <h2 className="mb-3 text-[16px] leading-6 font-medium text-foreground">Battle details</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Questions" value={details.count} />
          <Fact label="Max duration" value={formatMinutes(details.totalSeconds)} />
          <Fact label="Total marks" value={details.totalMarks} />
          <Fact label="Calculations" value={details.calculations} />
        </dl>
        <p className="mt-3 text-[14px] leading-5 text-muted-foreground">Questions get harder as you go: 1 mark first, 3 marks last. The final question is the boss round.</p>
      </section>

      {counting ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-background py-8 text-center" role="status" aria-live="assertive" data-testid="battle-countdown">
          <p className="text-[16px] leading-6 font-medium text-muted-foreground">Battle starts in</p>
          <p key={secondsLeft} className="battle-pop text-[64px] leading-none font-bold text-foreground tabular-nums">{secondsLeft}</p>
          <Button variant="ghost" size="sm" onClick={() => setReady(battle.id, viewerId, false)}>Wait, I'm not ready</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className={cn(!me?.ready && HERO_CTA)}
            variant={me?.ready ? 'outline' : 'default'}
            size="lg"
            data-testid="ready-toggle"
            aria-pressed={me?.ready}
            onClick={() => setReady(battle.id, viewerId, !me?.ready)}
          >
            {me?.ready ? <><Check className="size-4" />Ready. Tap to undo</> : <><Swords className="size-4" />I'm ready</>}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              leaveBattle(battle.id);
              navigate('/flashcards/battle');
            }}
          >
            Leave battle
          </Button>
          <p className="w-full text-[14px] leading-5 text-muted-foreground" data-testid="lobby-status">
            {filled < BATTLE_TEAM_SIZE * 2 ? 'Waiting for both teams to fill up.' : 'The battle starts as soon as all six players are ready.'}
          </p>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[14px] leading-5 text-muted-foreground">{label}</dt>
      <dd className="text-[24px] leading-8 font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function TeamCard({ battle, team, viewerId, own, rivalEmblem }: { battle: TeamBattle; team: BattleTeam; viewerId: string; own?: boolean; rivalEmblem?: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const slots = Array.from({ length: BATTLE_TEAM_SIZE }, (_, i) => team.members[i]);
  const ready = team.members.filter((m) => m.ready).length;
  const canEdit = own && battle.status === 'forming';

  const save = () => {
    const err = setTeamName(battle.id, viewerId, draft);
    setError(err);
    if (!err) setEditing(false);
  };

  return (
    <section
      className={cn(`em-${team.emblem % EMBLEMS.length}`, 'rounded-2xl border-2 border-[var(--em-edge)] bg-[var(--em-soft)] p-5')}
      data-testid={own ? 'my-team' : 'rival-team'}
      aria-label={own ? 'Your team' : 'Opposing team'}
    >
      <div className="flex items-start gap-3">
        <TeamEmblem emblem={team.emblem} className="size-12" iconClassName="size-6" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-4 font-medium tracking-wide text-[var(--em-ink)] uppercase">{own ? 'Your team' : 'Opponents'}</p>
          {editing ? (
            <form className="mt-1 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Input value={draft} maxLength={TEAM_NAME_MAX} onChange={(e) => setDraft(e.target.value)} aria-label="Team name" className="h-8 bg-background" autoFocus data-testid="rename-input" />
              <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Suggest a name" onClick={() => setDraft(randomTeamName([draft]))}><Dices className="size-4" /></Button>
              <Button type="submit" size="sm" className="h-8">Save</Button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-[20px] leading-7 font-semibold text-foreground" data-testid="team-name">{team.name}</h2>
              {canEdit && (
                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Rename team" onClick={() => { setDraft(team.name); setEditing(true); }}>
                  <Pencil className="size-4" />
                </button>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-1 text-[12px] leading-4 text-bad">{error}</p>}
        </div>
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Team emblem">
          {EMBLEMS.map((e, i) => (
            <button
              key={e.label}
              type="button"
              disabled={i === rivalEmblem}
              aria-pressed={team.emblem === i}
              aria-label={i === rivalEmblem ? `${e.label}, taken by the other team` : e.label}
              onClick={() => setTeamEmblem(battle.id, viewerId, i)}
              className={cn('rounded-xl p-0.5 transition disabled:cursor-not-allowed disabled:opacity-25', team.emblem === i ? 'ring-2 ring-foreground' : 'opacity-60 hover:opacity-100')}
            >
              <TeamEmblem emblem={i} className="size-7 rounded-lg" iconClassName="size-3.5" />
            </button>
          ))}
        </div>
      )}

      <ul className="mt-4 grid grid-cols-3 gap-2" data-testid="team-members">
        {slots.map((m, i) =>
          m ? (
            <li key={m.studentId} className="battle-pop flex flex-col items-center gap-1 rounded-xl bg-background/80 p-2 text-center" data-testid="team-member" data-ready={m.ready}>
              <PlayerAvatar studentId={m.studentId} size="lg" leader={m.studentId === team.leaderId} ready={m.ready} />
              <span className="w-full truncate text-[14px] leading-5 font-medium text-foreground">{studentName(m.studentId)}{m.studentId === viewerId && ' (you)'}</span>
              <span className={cn('text-[12px] leading-4', m.ready ? 'text-good' : 'text-warn')}>{m.ready ? 'Ready' : 'Getting ready'}</span>
            </li>
          ) : (
            <li key={`empty-${i}`} className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--em-edge)] p-2 text-center text-[12px] leading-4 text-muted-foreground">
              <Users className="size-5" aria-hidden="true" />Waiting for a friend
            </li>
          ),
        )}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {own ? (
          <>
            <div>
              <p className="text-[12px] leading-4 text-muted-foreground">Team code</p>
              <p className="font-mono text-[22px] leading-7 font-semibold tracking-[0.2em] text-foreground" data-testid="team-code">{team.code}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-background"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(team.code);
                  setCopied(true);
                } catch {
                  setError(`Copying isn't available here. The code is ${team.code}.`);
                }
              }}
            >
              <Copy className="size-4" />{copied ? 'Copied' : 'Copy code'}
            </Button>
          </>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-muted-foreground"><Lock className="size-3" aria-hidden="true" />Their chat and voice are private to them</p>
        )}
        <span className="text-[12px] leading-4 text-muted-foreground tabular-nums">{ready}/{BATTLE_TEAM_SIZE} ready</span>
      </div>
    </section>
  );
}

/* ---------- Arena ---------- */

const LETTERS = ['A', 'B', 'C', 'D'];

function Arena({ battle, viewerId }: { battle: TeamBattle; viewerId: string }) {
  const now = useNow();
  const view = roundView(battle, viewerId);
  const [error, setError] = useState<string | null>(null);
  if (!view) return null;

  const mine = battle.teams[view.team];
  const rival = battle.teams[rivalOf(view.team)];
  const total = battle.questionIds.length;
  const q = view.question;
  const isBoss = view.index === total - 1;
  const secondsLeft = (view.endsAt - now) / 1000;
  const fullSeconds = (view.endsAt - view.startedAt) / 1000;
  const locked = view.lockedMine;
  const myVote = view.votes[viewerId];

  const act = (err: string | null) => setError(err);

  return (
    <div className="space-y-4" data-testid="battle-arena">
      <Scoreboard battle={battle} mineId={view.team} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] leading-5 font-medium text-foreground tabular-nums" data-testid="battle-progress">Question {view.index + 1} of {total}</span>
          <Badge variant="secondary">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</Badge>
          {isCalculation(q) && <Badge variant="outline"><Calculator />Calculation</Badge>}
          {isBoss && <Badge className="bg-violet-600 text-white"><Sparkles />Boss round</Badge>}
        </div>
        <TimerRing secondsLeft={view.revealed || locked ? Math.max(0, secondsLeft) : secondsLeft} fullSeconds={fullSeconds} paused={locked || view.revealed} />
      </div>

      <div className="flex gap-1" aria-hidden="true">
        {battle.questionIds.map((id, i) => {
          const a = battle.answers[view.team][i];
          const shown = i < view.index || (i === view.index && view.revealed);
          return (
            <span
              key={id}
              className={cn('h-1.5 flex-1 rounded-[2px]', shown && a ? (a.correct ? 'bg-[var(--inferentics-brand-primary)]' : 'bg-[#e76e4f]') : i === view.index ? 'bg-primary' : 'bg-secondary')}
            />
          );
        })}
      </div>

      <section key={q.id} className="battle-pop relative rounded-2xl border bg-card p-6 shadow-md" aria-label={`Question ${view.index + 1}`}>
        <p className="mb-4 text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground" data-testid="battle-question">{q.questionText}</p>
        <VoteOptions battle={battle} view={view} viewerId={viewerId} onVote={(id) => act(castVote(battle.id, viewerId, id))} />
        {view.revealed && <RevealBanner view={view} rivalName={rival.name} />}
        {view.revealed && q.explanation && (
          <p className="mt-4 text-[14px] leading-5 text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{q.explanation}</p>
        )}
      </section>

      {!view.revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(['fifty', 'time'] as BattleLifeline[]).map((kind) => {
              const used = mine.lifelinesUsed.includes(kind);
              return (
                <Button
                  key={kind}
                  variant="outline"
                  size="sm"
                  disabled={used || locked}
                  data-testid={`lifeline-${kind}`}
                  onClick={() => act(spendLifeline(battle.id, viewerId, kind))}
                  className={cn(used && 'line-through')}
                >
                  {kind === 'fifty' ? <Sparkles className="size-4" /> : <Hourglass className="size-4" />}
                  {LIFELINE_LABEL[kind]}
                </Button>
              );
            })}
          </div>
          <Button
            size="lg"
            className={cn(view.consensus && !locked && HERO_CTA)}
            disabled={!view.consensus || locked}
            data-testid="lock-in"
            onClick={() => act(lockInAnswer(battle.id, viewerId))}
          >
            <Lock className="size-4" />
            {locked ? 'Locked in' : view.consensus ? `Lock in ${LETTERS[q.options.findIndex((o) => o.id === view.consensus)]}` : 'Agree to lock in'}
          </Button>
        </div>
      )}

      <p className="text-[14px] leading-5 text-muted-foreground" role="status" data-testid="team-status">
        {statusLine(view, battle, viewerId, myVote, rival.name)}
      </p>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

function statusLine(view: RoundView, battle: TeamBattle, viewerId: string, myVote: string | undefined, rivalName: string): string {
  if (view.revealed) return 'Next question coming up…';
  if (view.lockedMine) return view.lockedRival ? 'Both teams locked in.' : `Locked in. ${rivalName} are still deciding…`;
  const members = battle.teams[view.team].members.map((m) => m.studentId);
  const waiting = members.filter((id) => !view.votes[id]);
  if (!myVote) return 'Pick an answer, then talk it through with your team.';
  if (waiting.length) return `Waiting for ${waiting.map((id) => (id === viewerId ? 'you' : studentName(id))).join(' and ')} to pick.`;
  if (!view.consensus) return "Your team doesn't agree yet. Talk it out in chat or voice.";
  return `Everyone agrees. Lock it in!${view.lockedRival ? ` ${rivalName} have already locked.` : ''}`;
}

function Scoreboard({ battle, mineId }: { battle: TeamBattle; mineId: 'A' | 'B' }) {
  const rivalId = rivalOf(mineId);
  const mine = battle.teams[mineId];
  const rival = battle.teams[rivalId];
  const a = scoreOf(battle, mineId);
  const b = scoreOf(battle, rivalId);
  const share = a + b === 0 ? 50 : Math.round((a / (a + b)) * 100);
  const streak = streakOf(battle, mineId);

  return (
    <section className="rounded-2xl border bg-background p-4" aria-label="Scores" data-testid="scoreboard">
      <div className="flex items-center justify-between gap-3">
        <TeamScore team={mine} score={a} label="You" testId="score-mine" />
        <span className="text-[14px] font-bold text-muted-foreground" aria-hidden="true">VS</span>
        <TeamScore team={rival} score={b} label="Rivals" align="right" testId="score-rival" />
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${mine.name} ${a}, ${rival.name} ${b}`}>
        <span className={cn(`em-${mine.emblem}`, 'bg-[var(--em)] transition-[width] duration-700')} style={{ width: `${share}%` }} />
        <span className={cn(`em-${rival.emblem}`, 'flex-1 bg-[var(--em)]')} />
      </div>
      {streak >= 2 && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-[12px] leading-4 font-medium text-warn" data-testid="streak">
          <Flame className="battle-flame size-3.5" aria-hidden="true" />On fire: {streak} correct in a row
        </p>
      )}
    </section>
  );
}

function TeamScore({ team, score, label, align, testId }: { team: BattleTeam; score: number; label: string; align?: 'right'; testId: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', align === 'right' && 'flex-row-reverse text-right')}>
      <TeamEmblem emblem={team.emblem} />
      <div className="min-w-0">
        <p className="text-[12px] leading-4 text-muted-foreground">{label}</p>
        <p className="truncate text-[14px] leading-5 font-medium text-foreground">{team.name}</p>
      </div>
      <span key={score} className="battle-pop text-[28px] leading-8 font-bold text-foreground tabular-nums" data-testid={testId}>{score}</span>
    </div>
  );
}

function TimerRing({ secondsLeft, fullSeconds, paused }: { secondsLeft: number; fullSeconds: number; paused: boolean }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const left = Math.max(0, secondsLeft);
  const fraction = fullSeconds > 0 ? left / fullSeconds : 0;
  const urgent = !paused && left <= 15;
  return (
    <div className={cn('flex items-center gap-2', urgent && 'battle-tick')} data-testid="battle-timer">
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" className="stroke-secondary" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          className={cn('transition-[stroke-dashoffset] duration-300', urgent ? 'stroke-bad' : left <= 40 ? 'stroke-warn' : 'stroke-[var(--inferentics-brand-primary)]')}
        />
      </svg>
      <span className={cn('flex items-center gap-1 text-[20px] leading-7 font-semibold tabular-nums', urgent ? 'text-bad' : 'text-foreground')}>
        <Timer className="size-4" aria-hidden="true" />
        <span aria-label={`${Math.ceil(left)} seconds left`}>{formatClock(left)}</span>
      </span>
    </div>
  );
}

function VoteOptions({ battle, view, viewerId, onVote }: { battle: TeamBattle; view: RoundView; viewerId: string; onVote: (id: string) => void }) {
  const q = view.question;
  const members = battle.teams[view.team].members.map((m) => m.studentId);
  const disabled = view.lockedMine || view.revealed;
  const myAnswer = view.answers.mine?.optionId ?? null;
  const rivalAnswer = view.answers.rival?.optionId ?? null;

  return (
    <fieldset className="grid min-w-0 gap-2" disabled={disabled}>
      <legend className="sr-only">Choose your answer</legend>
      {q.options.map((o, i) => {
        const hidden = view.hidden.includes(o.id);
        const voters = members.filter((id) => view.votes[id] === o.id);
        const selected = view.votes[viewerId] === o.id;
        const isCorrect = o.id === q.correctOptionId;
        let state = selected ? 'selected' : 'idle';
        if (view.revealed) state = isCorrect ? 'correct' : myAnswer === o.id ? 'incorrect' : 'locked';
        return (
          <label
            key={o.id}
            data-testid="battle-option"
            data-state={state}
            data-hidden={hidden || undefined}
            className={cn(
              'grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50 has-[input:disabled]:cursor-default',
              state === 'idle' && 'border-border bg-background hover:bg-muted/40',
              state === 'selected' && 'border-primary bg-secondary',
              state === 'correct' && 'border-good-edge bg-good-soft text-good',
              state === 'incorrect' && 'border-bad/30 bg-bad-soft text-bad',
              state === 'locked' && 'border-border bg-background text-muted-foreground',
              hidden && 'pointer-events-none opacity-30 line-through',
            )}
          >
            <input type="radio" name={`b-${q.id}`} checked={selected} disabled={hidden || disabled} onChange={() => onVote(o.id)} className="sr-only" />
            <span aria-hidden="true" className={cn('flex size-7 items-center justify-center rounded-full border text-[12px] leading-4 font-semibold', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
              {LETTERS[i]}
            </span>
            <span className="min-w-0 text-[16px] leading-6">{o.text}</span>
            <span className="flex items-center gap-2">
              {view.revealed && rivalAnswer === o.id && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] leading-4 text-muted-foreground">Rivals</span>
              )}
              <span className="flex -space-x-2" aria-label={voters.length ? `Picked by ${voters.map((id) => (id === viewerId ? 'you' : studentName(id))).join(', ')}` : undefined}>
                {voters.map((id) => <PlayerAvatar key={id} studentId={id} size="sm" />)}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function RevealBanner({ view, rivalName }: { view: RoundView; rivalName: string }) {
  const mine = view.answers.mine;
  const rival = view.answers.rival;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3" role="status" data-testid="reveal">
      <p className={cn('relative text-[18px] leading-7 font-semibold', mine?.correct ? 'text-good' : 'text-bad')}>
        {mine?.correct ? 'Correct!' : mine?.optionId ? 'Not this time' : "Time's up"}
        {mine?.correct && <span className="battle-float absolute -top-2 left-full ml-2 text-[16px] text-good">+{mine.marks}</span>}
      </p>
      <p className="text-[14px] leading-5 text-muted-foreground">
        {rivalName}: {rival?.correct ? `+${rival.marks}` : rival?.optionId ? 'wrong' : 'no answer'}
      </p>
    </div>
  );
}
