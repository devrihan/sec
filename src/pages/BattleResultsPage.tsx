import { Check, Crown, Medal, Minus, Star, Swords, X } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatClock, PlayerAvatar, TeamEmblem } from '../components/battle/battle-parts';
import { TeamChat } from '../components/battle/TeamChat';
import { HERO_CTA, NotFoundState } from '../components/page-parts';
import { battleById } from '../services/battleComms';
import { battleSummary, type TeamSummary } from '../services/battleService';
import { subjectById } from '../services/catalog';
import { useAppState } from '../services/store';
import type { BattleTeamAnswer } from '../types';
import { BattleDemoNote } from './BattleHomePage';

const CONFETTI = ['#7c3aed', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#f97316'];

export function BattleResultsPage() {
  const { battleId = '' } = useParams();
  const state = useAppState((s) => s);
  const battle = battleById(state, battleId);
  const summary = useMemo(() => (battle ? battleSummary(state, battle, state.demoStudentId) : null), [state, battle]);

  if (!battle || battle.status !== 'finished') return <NotFoundState message="Results appear after the battle finishes." />;
  if (!summary) return <NotFoundState message="You weren't in this battle." />;

  const { mine, rival } = summary;
  const headline = mine.outcome === 'won' ? 'Victory!' : mine.outcome === 'draw' ? "It's a draw!" : 'So close!';
  const sub =
    mine.outcome === 'won'
      ? `${mine.team.name} beat ${rival.team.name} ${mine.score}–${rival.score}`
      : mine.outcome === 'draw'
        ? `${mine.team.name} and ${rival.team.name} both scored ${mine.score}`
        : `${rival.team.name} won ${rival.score}–${mine.score}. Rematch?`;
  const [winner, runnerUp] = rival.outcome === 'won' ? [rival, mine] : [mine, rival];

  return (
    <>
      <section className="battle-hero relative overflow-hidden rounded-2xl border p-6 text-center md:p-10" data-testid="battle-result">
        {mine.outcome === 'won' && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {Array.from({ length: 36 }, (_, i) => (
              <span key={i} className="battle-confetti" style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 12) * 90}ms` }} />
            ))}
          </div>
        )}
        <span className={cn('battle-pop mx-auto flex size-16 items-center justify-center rounded-full text-white shadow-lg', mine.outcome === 'won' ? 'bg-amber-500' : mine.outcome === 'draw' ? 'bg-sky-600' : 'bg-slate-500')}>
          {mine.outcome === 'won' ? <Crown className="size-8" /> : mine.outcome === 'draw' ? <Swords className="size-8" /> : <Medal className="size-8" />}
        </span>
        <h1 className="mt-4 text-[36px] leading-[40px] font-bold tracking-[-0.3px] text-foreground" data-testid="battle-headline">{headline}</h1>
        <p className="mt-1 text-[18px] leading-7 font-medium text-muted-foreground">{sub}</p>
        <p className="mt-1 text-[14px] leading-5 text-muted-foreground">{subjectById(battle.subjectId)?.name} · {battle.questionIds.length} questions</p>
      </section>
      <BattleDemoNote />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TeamResult summary={winner} place={winner.outcome === 'draw' ? 'Joint first' : 'Winner'} isMine={winner === mine} />
        <TeamResult summary={runnerUp} place={runnerUp.outcome === 'draw' ? 'Joint first' : 'Runner-up'} isMine={runnerUp === mine} />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-background" aria-labelledby="rounds-heading">
        <h2 id="rounds-heading" className="border-b px-5 py-3 text-[18px] leading-7 font-medium text-foreground">Question by question</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px] leading-5" data-testid="round-table">
            <thead className="bg-table-head text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">#</th>
                <th scope="col" className="px-4 py-2 font-medium">Question</th>
                <th scope="col" className="px-4 py-2 font-medium">Marks</th>
                <th scope="col" className="px-4 py-2 font-medium">{mine.team.name}</th>
                <th scope="col" className="px-4 py-2 font-medium">{rival.team.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.rounds.map((r, i) => (
                <tr key={r.question.id} data-testid="round-row">
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="max-w-[320px] px-4 py-2.5"><p className="line-clamp-2 text-foreground">{r.question.questionText}</p></td>
                  <td className="px-4 py-2.5 tabular-nums">{r.question.marks}</td>
                  <td className="px-4 py-2.5"><Outcome answer={r.mine} /></td>
                  <td className="px-4 py-2.5"><Outcome answer={r.rival} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border bg-background p-5">
          <h2 className="text-[18px] leading-7 font-medium text-foreground">What's next</h2>
          <p className="mt-1 text-[14px] leading-5 text-muted-foreground">Your points are on the section leaderboard already. Keep the team together for a rematch, or practise solo.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className={HERO_CTA}><Link to="/flashcards/battle" data-testid="new-battle">Create another battle</Link></Button>
            <Button asChild variant="outline"><Link to="/leaderboard">View leaderboard</Link></Button>
            <Button asChild variant="ghost"><Link to="/flashcards">Back to Flashcards</Link></Button>
          </div>
        </section>
        <TeamChat battleId={battle.id} viewerId={state.demoStudentId} teamName={mine.team.name} readOnly />
      </div>
    </>
  );
}

function Outcome({ answer }: { answer: BattleTeamAnswer | undefined }) {
  if (!answer || !answer.optionId) {
    return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-4" aria-hidden="true" />No answer</span>;
  }
  return answer.correct ? (
    <span className="inline-flex items-center gap-1 text-good"><Check className="size-4" aria-hidden="true" />+{answer.marks} <span className="text-muted-foreground">· {formatClock(answer.secondsUsed)}</span></span>
  ) : (
    <span className="inline-flex items-center gap-1 text-bad"><X className="size-4" aria-hidden="true" />0 <span className="text-muted-foreground">· {formatClock(answer.secondsUsed)}</span></span>
  );
}

function TeamResult({ summary, place, isMine }: { summary: TeamSummary; place: string; isMine: boolean }) {
  const { team } = summary;
  return (
    <section className={cn(`em-${team.emblem}`, 'rounded-2xl border-2 border-[var(--em-edge)] bg-[var(--em-soft)] p-5')} data-testid={isMine ? 'result-mine' : 'result-rival'}>
      <div className="flex items-center gap-3">
        <TeamEmblem emblem={team.emblem} className="size-12" iconClassName="size-6" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-4 font-medium tracking-wide text-[var(--em-ink)] uppercase">{place}{isMine && ' · your team'}</p>
          <h2 className="truncate text-[20px] leading-7 font-semibold text-foreground">{team.name}</h2>
        </div>
        <span className="text-[36px] leading-10 font-bold text-foreground tabular-nums" data-testid="final-score">{summary.score}</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Correct" value={summary.correct} tone="text-good" />
        <Stat label="Wrong" value={summary.incorrect} tone="text-bad" />
        <Stat label="No answer" value={summary.unanswered} tone="text-muted-foreground" />
      </dl>
      <ul className="mt-4 space-y-2">
        {summary.members.map((m) => (
          <li key={m.studentId} className="flex items-center gap-3 rounded-xl bg-background/80 px-3 py-2" data-testid="result-member">
            <PlayerAvatar studentId={m.studentId} leader={m.isLeader} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-[14px] leading-5 font-medium text-foreground">
                {m.name}{m.isCurrent && ' (you)'}
                {summary.mvpId === m.studentId && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 text-[11px] leading-4 font-semibold text-amber-950"><Star className="size-3" aria-hidden="true" />MVP</span>
                )}
              </p>
              <p className="text-[12px] leading-4 text-muted-foreground">
                First pick right {m.firstPickCorrect}/{summary.correct + summary.incorrect + summary.unanswered}
                {m.messages !== null && ` · ${m.messages} ${m.messages === 1 ? 'message' : 'messages'}`}
              </p>
            </div>
            <span className="text-right text-[12px] leading-4 tabular-nums">
              <span className="block font-semibold text-foreground" data-testid="member-points">+{m.points} pts</span>
              <span className="text-muted-foreground">+{m.coins} coins</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-background/80 py-2">
      <dt className="text-[12px] leading-4 text-muted-foreground">{label}</dt>
      <dd className={cn('text-[22px] leading-7 font-semibold tabular-nums', tone)}>{value}</dd>
    </div>
  );
}
