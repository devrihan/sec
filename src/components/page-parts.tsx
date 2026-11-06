import { ArrowLeft } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** The one main call to action in a hero block uses brand green (Loam core rule). */
export const HERO_CTA = 'bg-[var(--inferentics-brand-primary)] text-white hover:bg-[var(--inferentics-brand-primary-hover)]';

export const WHITE_PANEL = 'rounded-2xl border bg-background p-6';

const FLASHCARD_TONES = 6;

/** Colours a card from the flashcard pack by its position, so neighbours always differ. */
export const flashcardTone = (index: number) => `flashcard fc-${index % FLASHCARD_TONES}`;

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[14px] leading-5 font-medium tracking-[-0.084px] text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

export function PageTitle({ title, sub, aside }: { title: string; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px] text-foreground">{title}</h1>
        {sub && <p className="text-[18px] leading-[28px] font-medium tracking-[-0.108px] text-muted-foreground">{sub}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

export function SectionHeading({ title, sub, aside }: { title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="mb-sp-3xl flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[20px] leading-[28px] font-medium tracking-[-0.12px] text-foreground">{title}</h2>
        {sub && <p className="text-[18px] leading-[28px] tracking-[-0.108px] text-muted-foreground">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

/** Sample-data and demo-mode notes use Loam's warning tint. */
export function Note({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <p className="rounded-lg border border-warn/20 bg-warn-soft px-4 py-2 text-[14px] leading-5 text-warn" data-testid={testId}>
      {children}
    </p>
  );
}

export function Notice({ children, tone = 'good', testId }: { children: ReactNode; tone?: 'good' | 'error'; testId?: string }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      data-testid={testId}
      className={cn(
        'rounded-lg border px-4 py-3 text-[14px] leading-5',
        tone === 'good' ? 'border-good-edge bg-good-soft text-good' : 'border-destructive/30 bg-destructive/5 text-destructive',
      )}
    >
      {children}
    </p>
  );
}

export interface PickOption {
  value: string;
  label: string;
}

export function Pick({
  label,
  value,
  options,
  onChange,
  testId,
  className,
}: {
  label: string;
  value: string;
  options: PickOption[];
  onChange: (value: string) => void;
  testId?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} data-testid={testId} className="w-full bg-background">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function NotFoundState({ message }: { message: string }) {
  return (
    <EmptyState
      variant="page"
      illustration="/illustrations/no-answer-found.svg"
      title="This page isn't available"
      description={message}
      action={<Button asChild variant="outline"><Link to="/">Go to dashboard</Link></Button>}
    />
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        variant="page"
        illustration="/illustrations/load-error.svg"
        title="This screen hit a problem"
        description="Your coins and progress are saved. If this keeps happening, reset the demo from Demo settings."
        action={<Button asChild variant="outline"><a href="/">Reload the dashboard</a></Button>}
      />
    );
  }
}
