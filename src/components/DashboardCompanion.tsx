import { ArrowRight, Bell, BookOpen, ChevronRight, Hand, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { avatarById } from '../services/catalog';
import { companionLines, type CompanionKind } from '../services/companionService';
import { useAppState } from '../services/store';
import { useStudent } from '../services/studentService';
import { Avatar3DViewer } from './Avatar3DViewer';

/** How long each line stays up before the next one. */
export const COMPANION_LINE_MS = 7000;

const KIND: Record<CompanionKind, { icon: ComponentType<{ className?: string }>; label: string; tone: string }> = {
  greet: { icon: Hand, label: 'Hi!', tone: 'text-sky-600 dark:text-sky-400' },
  notify: { icon: Bell, label: 'Notification', tone: 'text-amber-600 dark:text-amber-400' },
  nudge: { icon: Target, label: 'Do this', tone: 'text-rose-600 dark:text-rose-400' },
  practice: { icon: BookOpen, label: 'Practise this', tone: 'text-violet-600 dark:text-violet-400' },
  cheer: { icon: Sparkles, label: 'Keep going', tone: 'text-good' },
};

/**
 * The student's own 3D character, floating with no box, talking in a speech bubble
 * beside its head. It fills the height of its parent, so the dashboard can match it
 * to the card next to it.
 */
export function DashboardCompanion() {
  const student = useStudent();
  const state = useAppState((s) => s);
  const lines = useMemo(() => companionLines(state), [state]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const line = lines[index % lines.length];
  const kind = KIND[line.kind];
  const heroName = student.avatar.hero ? avatarById(student.avatar.hero)?.name : null;
  // A tap moves to the next line; a drag only turns the avatar.
  const downX = useRef<number | null>(null);

  useEffect(() => {
    if (paused || lines.length < 2) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % lines.length), COMPANION_LINE_MS);
    return () => clearTimeout(t);
  }, [index, paused, lines.length]);

  const next = () => setIndex((i) => (i + 1) % lines.length);

  return (
    <section
      aria-label="Your avatar"
      data-testid="dashboard-companion"
      className="relative h-full min-h-[300px] w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Figure and bubble share one box of fixed proportions, centred in the column, so the bubble always sits by the head. */}
      <div className="absolute inset-x-0 top-1/2 aspect-[4/5] max-h-full -translate-y-1/2">
      {/* The character, on the right. */}
      <div
        className="absolute inset-y-0 right-0 w-[54%]"
        onPointerDown={(e) => { downX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (downX.current !== null && Math.abs(e.clientX - downX.current) < 6) next();
          downX.current = null;
        }}
      >
        <Avatar3DViewer
          config={student.avatar}
          framing="close"
          bare
          heightClass="h-full"
          label={`${heroName ?? 'Your avatar'}. Drag to turn it; tap it for the next message.`}
        />
      </div>

      {/* The speech bubble, its tail pointing at the character's head. */}
      <div
        className="absolute top-[7%] left-0 z-10 w-[50%] min-w-[150px] rounded-[20px] border-2 border-foreground/80 bg-background px-3 py-2.5 shadow-[3px_4px_0_rgba(15,23,42,0.12)]"
        data-testid="companion-bubble"
        data-kind={line.kind}
      >
        <div className="flex items-center justify-between gap-1">
          <p className={cn('flex items-center gap-1 text-[11px] leading-4 font-bold tracking-wide uppercase', kind.tone)}>
            <kind.icon className="size-3.5" aria-hidden="true" />{kind.label}
          </p>
          <button
            type="button"
            onClick={next}
            aria-label="Next message"
            data-testid="companion-next"
            className="-mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div key={line.id} className="badge-pop" aria-live="polite">
          <p className="line-clamp-7 text-[13px] leading-[18px] font-medium text-foreground" data-testid="companion-text">{line.text}</p>
          {line.href && line.cta && (
            <Link to={line.href} className="mt-1.5 inline-flex items-center gap-1 text-[13px] leading-5 font-semibold text-foreground underline-offset-2 hover:underline" data-testid="companion-cta">
              {line.cta}<ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        {/* Tail: an outlined triangle; the inner patch covers the bubble's border where they join. */}
        <svg aria-hidden="true" viewBox="0 0 28 24" className="absolute top-8 -right-[23px] h-6 w-6 overflow-visible">
          <path d="M1 2 L25 13 L1 20" className="fill-background stroke-foreground/80" strokeWidth="2" strokeLinejoin="round" />
          <path d="M-2 4.5 L3 4.5 L3 17.5 L-2 17.5 Z" className="fill-background" />
        </svg>
      </div>
      </div>
    </section>
  );
}
