import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackLink, Note, NotFoundState, PageTitle } from '../components/page-parts';
import { chapterById, descriptiveQuestions, subjectById } from '../services/catalog';
import { useStudent } from '../services/studentService';

type Stage = 'intro' | 'paper' | 'upload' | 'results';
const PAPER_SECONDS = 20 * 60;

export function WrittenPracticePage() {
  const { subjectId = '', chapterId = '' } = useParams();
  const student = useStudent();
  const subject = subjectById(subjectId);
  const chapter = chapterById(chapterId);
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('intro');
  const [seconds, setSeconds] = useState(PAPER_SECONDS);
  const [files, setFiles] = useState<File[]>([]);
  const questions = useMemo(() => descriptiveQuestions.filter((q) => q.chapterId === chapterId && q.class === student.class).slice(0, 2), [chapterId, student.class]);

  useEffect(() => {
    if (stage !== 'paper') return;
    const timer = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  if (!subject || !chapter || chapter.subjectId !== subject.id || subject.class !== student.class) {
    return <NotFoundState message="This chapter isn't part of your subjects." />;
  }
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <>
      <BackLink to={`/preparation/${subject.id}/${chapter.id}`}>{chapter.title}</BackLink>
      <PageTitle title="Written practice" sub={`${subject.name} · ${chapter.title}`} />
      <Note>Prototype demo: uploads stay in this browser session. Marking feedback is a sample, not AI-generated or an official CBSE score.</Note>

      {questions.length === 0 ? (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">No sample paper for this chapter yet</h2>
          <p className="mt-1 text-muted-foreground">Written practice questions are being added chapter by chapter.</p>
        </section>
      ) : stage === 'intro' ? (
        <section className="max-w-3xl rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">Timed mini-paper</Badge><Badge variant="outline">{questions.length} questions</Badge><Badge variant="outline">{totalMarks} marks</Badge><Badge variant="outline">20 minutes</Badge></div>
          <h2 className="mt-5 text-xl font-semibold">Write your answers on paper</h2>
          <p className="mt-2 text-muted-foreground">Keep your notes away, answer under exam conditions, then photograph each page clearly. You’ll see a sample marking breakdown after the upload step.</p>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-muted-foreground"><li>Use dark ink and write the question number beside each answer.</li><li>Keep the full page in frame and avoid glare or shadows.</li><li>This demo does not send or store your images.</li></ul>
          <Button className="mt-6" onClick={() => setStage('paper')} data-testid="start-written-paper">Start timed paper</Button>
        </section>
      ) : stage === 'paper' ? (
        <div className="max-w-4xl space-y-4">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"><span className="font-medium">Answer on paper, then upload photos</span><span className={`font-mono text-lg font-semibold tabular-nums ${seconds < 120 ? 'text-destructive' : ''}`} aria-live="polite">{time}</span></div>
          {questions.map((q, index) => <article key={q.id} className="rounded-xl border bg-card p-5"><div className="mb-3 flex justify-between gap-3"><Badge variant="secondary">Question {index + 1}</Badge><span className="text-sm text-muted-foreground">{q.marks} marks · {q.questionType}</span></div><p className="text-base leading-7">{q.questionText}</p></article>)}
          <Button onClick={() => setStage('upload')} data-testid="finish-written-paper">Finish and upload answers</Button>
        </div>
      ) : stage === 'upload' ? (
        <section className="max-w-3xl rounded-xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Upload answer photos</h2>
          <p className="mt-1 text-muted-foreground">Choose one or more clear images. Files are only held in this page; the prototype does not transmit them.</p>
          <label className="mt-5 block rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/40">
            <span className="font-medium">Select handwritten answer images</span>
            <span className="mt-1 block text-sm text-muted-foreground">JPG, PNG or WebP · multiple pages supported</span>
            <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} data-testid="answer-upload" />
          </label>
          {files.length > 0 && <ul className="mt-4 space-y-1 text-sm">{files.map((file) => <li key={`${file.name}-${file.lastModified}`} className="flex justify-between rounded-md bg-muted px-3 py-2"><span>{file.name}</span><span className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span></li>)}</ul>}
          <div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" onClick={() => setStage('paper')}>Back to questions</Button><Button disabled={files.length === 0} onClick={() => setStage('results')} data-testid="mock-mark-answers">Show sample marking</Button></div>
        </section>
      ) : (
        <div className="max-w-4xl space-y-4">
          <section className="rounded-xl border bg-card p-6"><Badge variant="secondary">Sample marking · demo result</Badge><h2 className="mt-3 text-2xl font-semibold">6 / {totalMarks} marks</h2><p className="mt-1 text-muted-foreground">In a live version, a handwriting model would read the pages and a marking engine would compare each answer with a teacher-reviewed CBSE scheme.</p></section>
          {questions.map((q, index) => <article key={q.id} className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Question {index + 1}</h3><Badge variant="outline">Sample score: {index === 0 ? Math.min(2, q.marks) : Math.max(0, q.marks - 1)} / {q.marks}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{q.questionText}</p><div className="mt-4 rounded-lg border border-good-edge bg-good-soft p-4"><p className="font-medium text-good">Marking points to include</p><p className="mt-1 text-sm">{q.answer}</p></div><p className="mt-3 text-sm"><strong>Practice tip:</strong> Show each key step and label units or examples clearly to make your reasoning easy to award marks for.</p></article>)}
          <Button onClick={() => navigate(`/preparation/${subject.id}/${chapter.id}`)}>Back to chapter</Button>
        </div>
      )}
    </>
  );
}
