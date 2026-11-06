import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { BackLink, NotFoundState, PageTitle } from '../components/page-parts';
import { RevisionSnippet } from '../components/RevisionSnippet';
import { chapterById } from '../services/catalog';
import { revisionForChapter } from '../services/questionService';

export function RevisionPage() {
  const { subjectId = '', chapterId = '' } = useParams();
  const chapter = chapterById(chapterId);
  const [index, setIndex] = useState(0);
  if (!chapter) return <NotFoundState message="This chapter doesn't exist." />;
  const snippets = revisionForChapter(chapter.id);

  const go = (next: number) => {
    setIndex(next);
    const el = document.getElementById(snippets[next].id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  };

  return (
    <>
      <BackLink to={`/preparation/${subjectId}/${chapterId}`}>{chapter.title}</BackLink>
      <PageTitle title="Revision" sub={chapter.title} />
      {snippets.length === 0 ? (
        <EmptyState variant="page" title="Revision notes coming soon" />
      ) : (
        <>
          <div className="grid gap-4">
            {snippets.map((s, i) => <RevisionSnippet key={s.id} snippet={s} active={i === index} />)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft className="size-4" />Previous snippet</Button>
            <span className="text-[14px] leading-5 text-muted-foreground tabular-nums">{index + 1}/{snippets.length}</span>
            <Button variant="outline" size="sm" disabled={index === snippets.length - 1} onClick={() => go(index + 1)}>Next snippet<ChevronRight className="size-4" /></Button>
          </div>
        </>
      )}
    </>
  );
}
