import { BookOpen, BookText, FlaskConical, Lightbulb, Sigma } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import type { RevisionSnippet as Snippet, SnippetType } from '../types';

const TYPE: Record<SnippetType, { label: string; icon: ComponentType<{ className?: string }> }> = {
  concept: { label: 'Concept', icon: Lightbulb },
  definition: { label: 'Key definition', icon: BookText },
  formula: { label: 'Formula', icon: Sigma },
  reaction: { label: 'Reaction', icon: FlaskConical },
  ncert: { label: 'NCERT point', icon: BookOpen },
};

export function Formula({ children, className }: { children: string; className?: string }) {
  return (
    <div data-testid="formula" className={cn('overflow-x-auto rounded-lg border bg-muted px-4 py-3 font-mono text-[16px] leading-6 text-foreground', className)}>
      {children}
    </div>
  );
}

export function SnippetTypeTag({ type }: { type: SnippetType }) {
  const { label, icon: Icon } = TYPE[type];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[12px] leading-4 font-semibold tracking-[-0.072px] text-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

/** The content of one revision card: what it is, the idea, the formula and the key points. */
export function SnippetBody({ snippet, compact = false }: { snippet: Snippet; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className={cn('font-semibold tracking-[-0.12px] text-foreground', compact ? 'text-[16px] leading-6' : 'text-[20px] leading-7 sm:text-[22px] sm:leading-8')}>{snippet.title}</h2>
      {snippet.content && <p className={cn('text-foreground', compact ? 'text-[14px] leading-5' : 'text-[15px] leading-6 sm:text-[16px] sm:leading-7')}>{snippet.content}</p>}
      {snippet.formula && <Formula className="border-black/10 bg-background/80 dark:border-white/10">{snippet.formula}</Formula>}
      {snippet.bullets && (
        <ul className={cn('list-disc space-y-1.5 pl-5 text-foreground', compact ? 'text-[14px] leading-5' : 'text-[15px] leading-6 sm:text-[16px]')}>
          {snippet.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
    </div>
  );
}
