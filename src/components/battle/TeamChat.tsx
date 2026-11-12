import { Lock, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BATTLE_CHAT_MAX_LENGTH } from '../../config/rewards';
import { postTeamMessage, readTeamChannel, SYSTEM_SENDER } from '../../services/battleComms';
import { useAppState } from '../../services/store';
import { PlayerAvatar, studentName } from './battle-parts';

const QUICK = ['I agree', 'Not sure', 'Check the units', 'Lock it in!'];

/** The viewer's own team chat. It reads through battleComms, which only ever returns the viewer's team. */
export function TeamChat({ battleId, viewerId, teamName, readOnly }: { battleId: string; viewerId: string; teamName: string; readOnly?: boolean }) {
  const messages = useAppState((s) => readTeamChannel(s, battleId, viewerId));
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

  if (!messages) return null;

  const send = (body: string, kind: 'text' | 'reaction' = 'text') => {
    const outcome = postTeamMessage(battleId, viewerId, body, kind);
    if (outcome.ok) {
      if (kind === 'text') setText('');
      setError(null);
    } else {
      setError(outcome.error);
    }
  };

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border bg-background" aria-label="Team chat" data-testid="team-chat">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-[16px] leading-6 font-medium text-foreground">Team chat</h2>
        <span className="inline-flex items-center gap-1 text-[12px] leading-4 text-muted-foreground" data-testid="chat-privacy">
          <Lock className="size-3" aria-hidden="true" />Only {teamName} can see this
        </span>
      </header>
      <ol ref={listRef} role="log" aria-live="polite" className="flex h-72 flex-col gap-2 overflow-y-auto px-4 py-3 lg:h-80" data-testid="chat-messages">
        {messages.length === 0 && <li className="m-auto text-[14px] leading-5 text-muted-foreground">Say hi to your team.</li>}
        {messages.map((m) => {
          if (m.senderId === SYSTEM_SENDER) {
            return (
              <li key={m.id} className="self-center rounded-full bg-muted px-3 py-1 text-center text-[12px] leading-4 text-muted-foreground" data-testid="chat-system">
                {m.text}
              </li>
            );
          }
          const mine = m.senderId === viewerId;
          return (
            <li key={m.id} data-testid="chat-message" data-sender={m.senderId} className={cn('flex max-w-[90%] items-end gap-2', mine && 'flex-row-reverse self-end')}>
              {!mine && <PlayerAvatar studentId={m.senderId} size="sm" />}
              <div className={cn('rounded-2xl px-3 py-2', mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-foreground', m.kind === 'reaction' && 'font-medium')}>
                {!mine && <p className="text-[12px] leading-4 font-medium text-muted-foreground">{studentName(m.senderId)}</p>}
                <p className="text-[14px] leading-5 break-words">{m.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {!readOnly && (
        <div className="space-y-2 border-t px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q, 'reaction')}
                className="rounded-full border px-2.5 py-1 text-[12px] leading-4 text-foreground transition-colors hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <Input
              value={text}
              maxLength={BATTLE_CHAT_MAX_LENGTH}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message your team"
              aria-label="Message your team"
              data-testid="chat-input"
              className="bg-background"
            />
            <Button type="submit" size="icon" aria-label="Send" data-testid="chat-send" disabled={!text.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
          {error && <p role="alert" className="text-[12px] leading-4 text-bad">{error}</p>}
        </div>
      )}
    </section>
  );
}
