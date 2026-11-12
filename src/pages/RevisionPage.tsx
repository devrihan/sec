import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, PartyPopper, RotateCcw, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DownloadPdfButton } from '../components/DownloadPdfButton';
import { BackLink, flashcardTone, NotFoundState, PageTitle } from '../components/page-parts';
import { SnippetBody, SnippetTypeTag } from '../components/RevisionSnippet';
import { chapterById, subjectById } from '../services/catalog';
import { downloadRevisionPdf } from '../services/pdfService';
import { revisionForChapter } from '../services/questionService';
import { isSnippetSaved, saveSnippet, savedSnippetIds, unsaveSnippet } from '../services/revisionService';
import { useAppState } from '../services/store';
import type { RevisionSnippet } from '../types';

/** How far a card must be dragged before letting go counts as a swipe. */
const SWIPE_AT = 90;
const FLY_MS = 220;

type Dir = 'left' | 'right';

const CARD = 'snippet relative flex min-h-[360px] flex-col gap-4 rounded-2xl border bg-card p-5 shadow-md select-none sm:p-8';

interface Ghost {
  key: number;
  snippet: RevisionSnippet;
  index: number;
  dir: Dir;
  from: number;
}

/** A card that has just been swiped, flying off on top while the next card is already usable underneath. */
function FlyingCard({ ghost, total, onGone }: { ghost: Ghost; total: number; onGone: (key: number) => void }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setGone(true)));
    const timer = window.setTimeout(() => onGone(ghost.key), FLY_MS + 80);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [onGone, ghost.key]);
  const x = gone ? (ghost.dir === 'right' ? 1 : -1) * 700 : ghost.from;
  return (
    <div
      aria-hidden="true"
      className={cn(CARD, 'pointer-events-none absolute inset-0 z-10', flashcardTone(ghost.index))}
      style={{ transform: `translateX(${x}px) rotate(${x / 18}deg)`, opacity: gone ? 0 : 1, transition: `transform ${FLY_MS}ms ease-in, opacity ${FLY_MS}ms ease-in` }}
    >
      <CardTop snippet={ghost.snippet} index={ghost.index} total={total} />
      <SnippetBody snippet={ghost.snippet} />
    </div>
  );
}

function CardTop({ snippet, index, total, action }: { snippet: RevisionSnippet; index: number; total: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <SnippetTypeTag type={snippet.contentType} />
      <span className="flex items-center gap-2">
        <span className="text-[12px] leading-4 font-medium text-muted-foreground tabular-nums">{index + 1} / {total}</span>
        {action}
      </span>
    </div>
  );
}

export function RevisionPage() {
  const { subjectId = '', chapterId = '' } = useParams();
  const chapter = chapterById(chapterId);
  const state = useAppState((s) => s);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const [params] = useSearchParams();
  const allSnippets = chapter ? revisionForChapter(chapter.id) : [];
  // `?cards=` narrows the deck to the cards for one mistake; unknown ids are ignored.
  const focusIds = (params.get('cards') ?? '').split(',').filter(Boolean);
  const focused = allSnippets.filter((s) => focusIds.includes(s.id));
  const snippets = focused.length > 0 ? focused : allSnippets;
  const total = snippets.length;
  const done = index >= total;
  const current = done ? undefined : snippets[index];
  const savedHere = snippets.filter((s) => isSnippetSaved(state, s.id)).length;
  const savedAll = savedSnippetIds(state).length;

  const commit = useCallback(
    (dir: Dir) => {
      if (!current) return;
      if (dir === 'left') {
        saveSnippet(current.id);
        setFlash(`Saved “${current.title}”`);
      } else {
        setFlash(null);
      }
      setGhosts((g) => [...g, { key: Date.now() + Math.random(), snippet: current, index, dir, from: drag }]);
      setIndex(index + 1);
      setDrag(0);
    },
    [current, index, drag],
  );
  const dropGhost = useCallback((key: number) => setGhosts((g) => g.filter((x) => x.key !== key)), []);

  const back = () => {
    if (index === 0) return;
    setFlash(null);
    setIndex((i) => i - 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') commit('right');
      else if (e.key === 'ArrowLeft') commit('left');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit]);

  // Switching between a focused deck and all cards starts from the first card.
  const deckKey = snippets.map((s) => s.id).join();
  useEffect(() => {
    setIndex(0);
    setFlash(null);
  }, [deckKey]);

  const subject = subjectById(subjectId);
  if (!chapter || !subject) return <NotFoundState message="This chapter doesn't exist." />;

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    setDrag(e.clientX - start.current.x);
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (drag > SWIPE_AT) commit('right');
    else if (drag < -SWIPE_AT) commit('left');
    else setDrag(0);
  };

  const pull = Math.min(1, Math.abs(drag) / SWIPE_AT);
  const saved = current ? isSnippetSaved(state, current.id) : false;

  return (
    <>
      <BackLink to={`/preparation/${subjectId}/${chapterId}`}>{chapter.title}</BackLink>
      <PageTitle
        title="Revision"
        sub={focused.length > 0 ? (
          <>
            {chapter.title} · <span data-testid="focused-deck">{focused.length} {focused.length === 1 ? 'card' : 'cards'} for your mistake</span> ·{' '}
            <Link to={`/preparation/${subjectId}/${chapterId}/revision`} className="underline underline-offset-2">all cards</Link>
          </>
        ) : chapter.title}
        aside={
          <span className="flex flex-wrap items-start gap-2">
          <DownloadPdfButton
            disabled={total === 0}
            choices={[{ label: 'Download PDF', run: () => downloadRevisionPdf(subject, chapter, snippets) }]}
          />
          <Button asChild variant="outline">
            <Link to="/preparation/saved" data-testid="open-saved">
              <BookmarkCheck className="size-4" />Saved<span className="rounded-full bg-muted px-1.5 text-[12px] leading-5 tabular-nums">{savedAll}</span>
            </Link>
          </Button>
          </span>
        }
      />

      {total === 0 ? (
        <EmptyState variant="page" title="Revision notes coming soon" />
      ) : (
        <div className="overflow-x-clip px-1 pb-4">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
          <div className="flex gap-1" aria-hidden="true">
            {snippets.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  isSnippetSaved(state, s.id) && i < index ? 'bg-amber-400' : i < index ? 'bg-[var(--inferentics-brand-primary)]' : i === index ? 'bg-foreground/40' : 'bg-muted',
                )}
              />
            ))}
          </div>

          {done ? (
            <section className="flex flex-col items-center gap-3 rounded-2xl border border-good-edge bg-good-tint px-6 py-10 text-center" data-testid="revision-done">
              <PartyPopper className="size-10 text-good-strong" aria-hidden="true" />
              <h2 className="text-[24px] leading-8 font-bold text-foreground">Chapter revised!</h2>
              <p className="text-[16px] leading-6 text-muted-foreground">
                You went through all {total} cards. {savedHere > 0 ? `${savedHere} ${savedHere === 1 ? 'card is' : 'cards are'} saved from this chapter.` : 'Nothing saved from this chapter.'}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => { setIndex(0); setFlash(null); }}><RotateCcw className="size-4" />Revise again</Button>
                {savedHere > 0 && <Button asChild variant="outline"><Link to={`/preparation/saved?subject=${subjectId}`}><BookmarkCheck className="size-4" />See saved cards</Link></Button>}
                <Button asChild><Link to={`/preparation/${subjectId}/${chapterId}`}>Back to chapter</Link></Button>
              </div>
            </section>
          ) : (
            current && (
              <>
                <div className="relative isolate">
                  {index + 2 < total && <span aria-hidden="true" className={cn('deck-card deck-card-2', flashcardTone(index + 2))} />}
                  {index + 1 < total && <span aria-hidden="true" className={cn('deck-card', flashcardTone(index + 1))} />}
                  {ghosts.map((g) => <FlyingCard key={g.key} ghost={g} total={total} onGone={dropGhost} />)}
                  <article
                    key={current.id}
                    className={cn(CARD, 'cursor-grab touch-pan-y active:cursor-grabbing', flashcardTone(index))}
                    style={{ transform: `translateX(${drag}px) rotate(${drag / 18}deg)`, transition: dragging ? 'none' : `transform ${FLY_MS}ms ease-out` }}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    aria-roledescription="revision card"
                    aria-label={`Card ${index + 1} of ${total}: ${current.title}`}
                    data-testid="revision-card"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-6 left-6 z-10 -rotate-12 rounded-lg border-2 border-emerald-600 bg-background/90 px-3 py-1 text-[16px] font-black tracking-wider text-emerald-700 dark:text-emerald-400"
                      style={{ opacity: drag > 0 ? pull : 0 }}
                    >
                      NEXT →
                    </span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-6 right-6 z-10 rotate-12 rounded-lg border-2 border-amber-500 bg-background/90 px-3 py-1 text-[16px] font-black tracking-wider text-amber-600 dark:text-amber-400"
                      style={{ opacity: drag < 0 ? pull : 0 }}
                    >
                      ★ SAVE
                    </span>
                    <CardTop
                      snippet={current}
                      index={index}
                      total={total}
                      action={
                        <button
                          type="button"
                          onClick={() => (saved ? unsaveSnippet(current.id) : saveSnippet(current.id))}
                          aria-pressed={saved}
                          aria-label={saved ? 'Remove from saved' : 'Save this card'}
                          title={saved ? 'Remove from saved' : 'Save this card'}
                          className="flex size-8 items-center justify-center rounded-full bg-background/70 text-foreground hover:bg-background"
                          data-testid="card-bookmark"
                        >
                          {saved ? <BookmarkCheck className="size-4 fill-amber-400 text-amber-700" /> : <Bookmark className="size-4" />}
                        </button>
                      }
                    />
                    <SnippetBody snippet={current} />
                  </article>
                </div>

                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <Button variant="outline" size="lg" className="border-amber-400 text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950" onClick={() => commit('left')} data-testid="swipe-save">
                    <ArrowLeft className="size-4" /><Bookmark className="size-4" />Save &amp; next
                  </Button>
                  <Button variant="ghost" size="icon" onClick={back} disabled={index === 0} aria-label="Previous card" title="Previous card">
                    <Undo2 className="size-4" />
                  </Button>
                  <Button size="lg" className="bg-[var(--inferentics-brand-primary)] text-white hover:bg-[var(--inferentics-brand-primary-hover)]" onClick={() => commit('right')} data-testid="swipe-next">
                    Next card<ArrowRight className="size-4" />
                  </Button>
                </div>
                <p className="text-center text-[13px] leading-5 text-muted-foreground">
                  Swipe right or press → for the next card. Swipe left or press ← to save it and move on.
                </p>
              </>
            )
          )}
          <p role="status" className="min-h-5 text-center text-[14px] leading-5 font-medium text-amber-700 dark:text-amber-400" data-testid="save-status">{flash}</p>
        </div>
        </div>
      )}
    </>
  );
}
