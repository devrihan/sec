import { CalendarClock, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DownloadPdfButton } from '../components/DownloadPdfButton';
import { BackLink, Note, NotFoundState, PageTitle, Pick } from '../components/page-parts';
import { chapterById, subjectById } from '../services/catalog';
import { downloadQuestionsPdf } from '../services/pdfService';
import { bankForChapter, isRepeated, type BankItem } from '../services/questionService';

const LETTERS = ['A', 'B', 'C', 'D'];
const SEGMENT = 'flex-none rounded-[4px] px-3 py-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[0px_1px_1px_rgba(0,0,0,0.05)]';

export function ImportantQuestionsPage() {
  const { subjectId = '', chapterId = '' } = useParams();
  const chapter = chapterById(chapterId);
  const subject = subjectById(subjectId);
  const [marks, setMarks] = useState('all');
  const [source, setSource] = useState('all');
  const items = useMemo(() => bankForChapter(chapterId), [chapterId]);
  if (!chapter || !subject) return <NotFoundState message="This chapter doesn't exist." />;

  const markOptions = [...new Set(items.map((i) => i.marks))].sort((a, b) => a - b);
  const sourceOptions = [...new Set(items.map((i) => i.source))].sort();
  const shown = items.filter((i) => (marks === 'all' || String(i.marks) === marks) && (source === 'all' || i.source === source));
  const isBoardClass = subject.class === 10 || subject.class === 12;
  const filterNote = [marks !== 'all' && `${marks} ${marks === '1' ? 'mark' : 'marks'}`, source !== 'all' && source].filter(Boolean).join(', ') || null;
  const pdf = (withAnswers: boolean) => () => downloadQuestionsPdf(subject, chapter, shown, { withAnswers, filterNote: filterNote && `filter: ${filterNote}`, showBoardYears: isBoardClass });

  return (
    <>
      <BackLink to={`/preparation/${subjectId}/${chapterId}`}>{chapter.title}</BackLink>
      <PageTitle
        title="Important Questions"
        sub={isBoardClass
          ? `${chapter.title}: CBSE previous-year, repeated and selected important questions`
          : `${chapter.title}: general important questions from the syllabus and NCERT`}
        aside={
          <DownloadPdfButton
            disabled={shown.length === 0}
            choices={[
              { label: 'With answers', hint: `${shown.length} questions${filterNote ? ` (${filterNote})` : ''}, answers under each`, run: pdf(true) },
              { label: 'Questions only', hint: 'For practising without peeking', run: pdf(false) },
            ]}
          />
        }
      />
      <Note>Sample question bank. Source and year tags are illustrative until the real bank is connected.</Note>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs value={marks} onValueChange={setMarks}>
          <TabsList aria-label="Filter by marks" className="h-auto flex-wrap justify-start gap-0 rounded-md bg-secondary p-1 group-data-[orientation=horizontal]/tabs:h-auto">
            <TabsTrigger value="all" className={SEGMENT}>All marks</TabsTrigger>
            {markOptions.map((m) => (
              <TabsTrigger key={m} value={String(m)} className={SEGMENT} data-testid={`marks-${m}`}>{m} {m === 1 ? 'mark' : 'marks'}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Pick
          label="Source"
          value={source}
          onChange={setSource}
          testId="source-filter"
          className="w-[180px]"
          options={[{ value: 'all', label: 'All sources' }, ...sourceOptions.map((o) => ({ value: o, label: o }))]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          variant="page"
          illustration="/illustrations/no-search-results.svg"
          title="No questions match these filters"
          description="Try another mark value or source."
          action={<Button variant="outline" onClick={() => { setMarks('all'); setSource('all'); }}>Clear filters</Button>}
        />
      ) : (
        <ol className="grid gap-4">
          {shown.map((q) => <BankRow key={q.id} item={q} chapter={chapter.title} showBoardYears={isBoardClass} />)}
        </ol>
      )}
    </>
  );
}

function BankRow({ item, chapter, showBoardYears }: { item: BankItem; chapter: string; showBoardYears: boolean }) {
  const years = [...item.years].sort((a, b) => a - b);
  return (
    <li data-testid="bank-row" className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-[16px] leading-6 font-medium text-foreground">{item.questionText}</p>
      {item.options && (
        <ol className="grid grid-cols-1 gap-x-6 gap-y-1 text-[14px] leading-5 text-muted-foreground sm:grid-cols-2">
          {item.options.map((o, i) => <li key={o.id}><span aria-hidden="true">({LETTERS[i]})</span> {o.text}</li>)}
        </ol>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{item.marks} {item.marks === 1 ? 'mark' : 'marks'}</Badge>
        <Badge variant="outline">{item.questionType}</Badge>
        <Badge variant="outline">{chapter}</Badge>
        <Badge variant="outline" data-testid="source-tag">{item.source}</Badge>
        {isRepeated(item) && <Badge variant="outline" className="border-warn/30 text-warn">Repeated</Badge>}
      </div>
      {showBoardYears && years.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] leading-5 font-medium text-warn" data-testid="board-years">
          <CalendarClock className="size-4" aria-hidden="true" />
          Asked in CBSE boards:
          {years.map((y) => (
            <span key={y} className="rounded-md border border-warn/25 bg-warn-soft px-1.5 py-px tabular-nums">{y}</span>
          ))}
          {years.length >= 2 && <span className="text-muted-foreground">· {years.length} times</span>}
        </p>
      )}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          Show answer
        </summary>
        <div className="mt-2 rounded-lg border border-good-edge bg-good-soft px-3 py-2 text-[14px] leading-5 text-foreground">
          {item.options && <p className="font-medium text-good">{item.options.find((o) => o.id === item.correctOptionId)?.text}</p>}
          <p>{item.answer}</p>
        </div>
      </details>
    </li>
  );
}
