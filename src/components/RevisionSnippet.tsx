import { cn } from '@/lib/utils';
import type { RevisionSnippet as Snippet, SnippetType } from '../types';

const LABEL: Record<SnippetType, string> = {
  concept: 'Quick revision',
  definition: 'Key definition',
  formula: 'Important formula',
  reaction: 'Reaction or equation',
  ncert: 'NCERT snippet',
};

export function Formula({ children }: { children: string }) {
  return (
    <div data-testid="formula" className="overflow-x-auto rounded-lg border bg-muted px-4 py-3 font-mono text-[16px] leading-6 text-foreground">
      {children}
    </div>
  );
}

export function RevisionSnippet({ snippet, active }: { snippet: Snippet; active: boolean }) {
  return (
    <article
      id={snippet.id}
      tabIndex={-1}
      className={cn('snippet flex scroll-mt-4 flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm outline-none', active && 'is-active border-ring')}
    >
      <p className="text-[12px] leading-4 font-medium tracking-[-0.072px] text-muted-foreground">{LABEL[snippet.contentType]}</p>
      <h2 className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground">{snippet.title}</h2>
      {snippet.content && <p className="text-[16px] leading-6 text-foreground">{snippet.content}</p>}
      {snippet.formula && <Formula>{snippet.formula}</Formula>}
      {snippet.bullets && (
        <ul className="list-disc space-y-1 pl-5 text-[16px] leading-6 text-foreground">
          {snippet.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
    </article>
  );
}
