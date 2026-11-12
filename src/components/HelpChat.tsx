import { ArrowRight, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { askHelpBot, STARTER_QUESTIONS, type HelpLink } from '../services/helpBot';
import { getState } from '../services/store';
import { useStudent } from '../services/studentService';
import { AvatarImage } from './AvatarImage';

interface Message {
  id: number;
  from: 'bot' | 'me';
  text: string;
  links?: HelpLink[];
  chips?: string[];
}

/** A short pause so answers feel typed, not instant. */
const TYPING_MS = 450;

/**
 * The help chat. The student's own avatar answers questions about where things are
 * and how the app works. It is mounted once in the layout, so the conversation
 * survives moving between pages.
 */
export function HelpChat() {
  const student = useStudent();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const nextId = useRef(1);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const push = (m: Omit<Message, 'id'>) => setMessages((list) => [...list, { ...m, id: nextId.current++ }]);

  // The first time it opens: a greeting and the starter questions.
  useEffect(() => {
    if (!open || messages.length > 0) return;
    push({
      from: 'bot',
      text: `Hi ${student.name}! I'm your study buddy. I can show you where everything is and what to do next. Pick a question or type your own.`,
      chips: STARTER_QUESTIONS,
    });
    // Only on the first open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the input on open; hand focus back to the launcher once it is back on close.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || typing) return;
    push({ from: 'me', text: q });
    setText('');
    setTyping(true);
    setTimeout(() => {
      const answer = askHelpBot(getState(), q);
      push({ from: 'bot', text: answer.text, links: answer.links, chips: answer.followUps });
      setTyping(false);
    }, TYPING_MS);
  };

  const close = () => setOpen(false);

  const lastBot = [...messages].reverse().find((m) => m.from === 'bot');

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open help chat"
          data-testid="help-launcher"
          className="fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full border-2 border-background bg-primary py-1 pr-4 pl-1 text-primary-foreground shadow-lg transition hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:right-6 md:bottom-6"
        >
          <AvatarImage config={student.avatar} className="size-11 bg-background" />
          <span className="text-[14px] leading-5 font-semibold">Need help?</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Help chat"
          data-testid="help-chat"
          onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
          className="badge-pop fixed right-3 bottom-20 z-50 flex h-[min(600px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl md:right-6 md:bottom-6"
        >
          <header className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <AvatarImage config={student.avatar} className="size-10 bg-background" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-5 font-semibold">Study buddy</p>
              <p className="text-[12px] leading-4 opacity-80">Ask me where anything is</p>
            </div>
            <Button variant="ghost" size="icon" onClick={close} aria-label="Close help chat" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
              <X className="size-5" />
            </Button>
          </header>

          <ol ref={listRef} role="log" aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" data-testid="help-messages">
            {messages.map((m) =>
              m.from === 'me' ? (
                <li key={m.id} className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[14px] leading-5 text-primary-foreground" data-testid="help-question">
                  {m.text}
                </li>
              ) : (
                <li key={m.id} className="flex max-w-[92%] items-start gap-2" data-testid="help-answer">
                  <AvatarImage config={student.avatar} className="mt-0.5 size-7 shrink-0" />
                  <div className="min-w-0 space-y-2">
                    <p className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-[14px] leading-5 whitespace-pre-line text-foreground">{m.text}</p>
                    {m.links && m.links.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <Link
                            key={l.to + l.label}
                            to={l.to}
                            data-testid="help-link"
                            className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[12px] leading-4 font-medium text-foreground hover:bg-muted"
                          >
                            {l.label}<ArrowRight className="size-3" aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ),
            )}
            {typing && (
              <li className="flex items-center gap-2" aria-label="Typing">
                <AvatarImage config={student.avatar} className="size-7" />
                <span className="flex gap-1 rounded-2xl bg-muted px-3 py-3">
                  {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />)}
                </span>
              </li>
            )}
          </ol>

          {!typing && lastBot?.chips && lastBot.chips.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto border-t px-3 py-2" data-testid="help-chips">
              {lastBot.chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => ask(c)}
                  data-testid="help-chip"
                  className={cn('shrink-0 rounded-full border px-3 py-1.5 text-[12px] leading-4 font-medium text-foreground transition-colors hover:bg-muted')}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex gap-2 border-t px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask anything, like “where are videos?”"
              aria-label="Ask a question"
              data-testid="help-input"
              className="bg-background"
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={!text.trim() || typing}><Send className="size-4" /></Button>
          </form>
        </section>
      )}
    </>
  );
}
