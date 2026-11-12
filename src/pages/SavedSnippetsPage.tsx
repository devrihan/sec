import { BookmarkX, Layers } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BackLink, flashcardTone, PageTitle } from '../components/page-parts';
import { SnippetBody, SnippetTypeTag } from '../components/RevisionSnippet';
import { savedBySubject, unsaveSnippet } from '../services/revisionService';
import { useAppState } from '../services/store';

export function SavedSnippetsPage() {
  const state = useAppState((s) => s);
  const groups = useMemo(() => savedBySubject(state), [state]);
  const [params, setParams] = useSearchParams();
  const wanted = params.get('subject');
  const active = groups.some((g) => g.subject.id === wanted) ? wanted : null;
  const shown = active ? groups.filter((g) => g.subject.id === active) : groups;
  const total = groups.reduce((sum, g) => sum + g.count, 0);

  const pill = (on: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-[14px] leading-5 font-medium transition-colors',
      on ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:bg-muted',
    );

  return (
    <>
      <BackLink to="/preparation">Preparation</BackLink>
      <PageTitle title="Saved cards" sub={total > 0 ? `${total} ${total === 1 ? 'card' : 'cards'} you saved while revising` : 'Cards you save while revising show up here'} />

      {total === 0 ? (
        <EmptyState
          variant="page"
          title="Nothing saved yet"
          description="While revising a chapter, swipe a card left (or press Save & next) to keep it here."
          action={<Button asChild variant="outline"><Link to="/preparation">Go to Preparation</Link></Button>}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by subject">
            <button type="button" className={pill(active === null)} aria-pressed={active === null} onClick={() => setParams({})}>
              All <span className="tabular-nums opacity-70">{total}</span>
            </button>
            {groups.map((g) => (
              <button
                key={g.subject.id}
                type="button"
                className={pill(active === g.subject.id)}
                aria-pressed={active === g.subject.id}
                onClick={() => setParams({ subject: g.subject.id })}
                data-testid="saved-subject-filter"
              >
                {g.subject.name} <span className="tabular-nums opacity-70">{g.count}</span>
              </button>
            ))}
          </div>

          {shown.map((g) => (
            <section key={g.subject.id} className="flex flex-col gap-6" data-testid="saved-subject" aria-label={g.subject.name}>
              <h2 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-foreground">{g.subject.name}</h2>
              {g.chapters.map(({ chapter, snippets }) => (
                <div key={chapter.id} className="flex flex-col gap-3" data-testid="saved-chapter">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[16px] leading-6 font-medium text-foreground">
                      {chapter.number}. {chapter.title} <span className="text-muted-foreground tabular-nums">· {snippets.length}</span>
                    </h3>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/preparation/${g.subject.id}/${chapter.id}/revision`}><Layers className="size-4" />Revise chapter</Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {snippets.map((s, i) => (
                      <article key={s.id} className={cn('flex flex-col gap-3 rounded-xl border bg-card p-5', flashcardTone(i))} data-testid="saved-card">
                        <div className="flex items-center justify-between gap-2">
                          <SnippetTypeTag type={s.contentType} />
                          <button
                            type="button"
                            onClick={() => unsaveSnippet(s.id)}
                            className="flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[12px] leading-4 font-medium text-foreground hover:bg-background"
                            aria-label={`Remove ${s.title} from saved`}
                            data-testid="unsave"
                          >
                            <BookmarkX className="size-3.5" />Remove
                          </button>
                        </div>
                        <SnippetBody snippet={s} compact />
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </>
  );
}
