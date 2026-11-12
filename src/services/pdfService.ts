import type { jsPDF as JsPDF } from 'jspdf';
import type { Chapter, RevisionSnippet, SnippetType, Subject } from '../types';
import type { BankItem } from './questionService';

/**
 * Builds real, text-based PDFs in the browser. jsPDF and the DejaVu Sans font (which has every
 * subscript, Greek letter and arrow the notes use) load only when a student clicks Download.
 */

const FONT = 'DejaVu';
const PAGE = { w: 210, h: 297 };
const M = { x: 16, top: 30, bottom: 18 };
const WIDTH = PAGE.w - M.x * 2;
const PT = 0.3528; // mm per point
const INK = [17, 24, 39] as const;
const MUTED = [100, 116, 139] as const;
const BRAND = [0, 122, 61] as const;
const WARN = [173, 78, 0] as const;

let fontCache: Promise<{ regular: string; bold: string }> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function loadFonts() {
  fontCache ??= Promise.all(
    ['/fonts/DejaVuSans.ttf', '/fonts/DejaVuSans-Bold.ttf'].map((url) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${url}`);
        return r.arrayBuffer();
      }),
    ),
  )
    .then(([regular, bold]) => ({ regular: toBase64(regular), bold: toBase64(bold) }))
    .catch((e) => {
      fontCache = null;
      throw e;
    });
  return fontCache;
}

/** A small writer that wraps text and starts a new page whenever the next block would not fit. */
class Writer {
  y = M.top;

  constructor(
    readonly doc: JsPDF,
    private readonly running: string,
  ) {}

  lines(text: string, size: number, width = WIDTH): string[] {
    this.doc.setFontSize(size);
    return this.doc.splitTextToSize(text, width) as string[];
  }

  static lineH(size: number) {
    return size * PT * 1.4;
  }

  /** Starts a new page if `height` mm will not fit below the cursor. */
  ensure(height: number) {
    if (this.y + height <= PAGE.h - M.bottom) return;
    this.doc.addPage();
    this.y = M.top;
    this.doc.setFont(FONT, 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...MUTED);
    this.doc.text(this.running, M.x, 16);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.line(M.x, 19, PAGE.w - M.x, 19);
  }

  text(text: string, opts: { size?: number; bold?: boolean; color?: readonly [number, number, number]; x?: number; width?: number; gap?: number } = {}) {
    const { size = 10.5, bold = false, color = INK, x = M.x, width = WIDTH - (x - M.x), gap = 1.5 } = opts;
    this.doc.setFont(FONT, bold ? 'bold' : 'normal');
    const lines = this.lines(text, size, width);
    const lh = Writer.lineH(size);
    for (const line of lines) {
      this.ensure(lh);
      // A page break draws the running header, so set the style again for every line.
      this.doc.setFont(FONT, bold ? 'bold' : 'normal');
      this.doc.setFontSize(size);
      this.doc.setTextColor(...color);
      this.doc.text(line, x, this.y + size * PT);
      this.y += lh;
    }
    this.y += gap;
  }

  /** Measures a block of wrapped text without drawing it. */
  height(text: string, size: number, width = WIDTH, bold = false) {
    this.doc.setFont(FONT, bold ? 'bold' : 'normal');
    return this.lines(text, size, width).length * Writer.lineH(size);
  }

  /** Keeps a block on one page when it fits on a page at all; longer blocks just flow on. */
  keepTogether(height: number) {
    if (height <= PAGE.h - M.top - M.bottom) this.ensure(height);
  }

  rule() {
    this.ensure(4);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.line(M.x, this.y + 1, PAGE.w - M.x, this.y + 1);
    this.y += 5;
  }
}

async function newDoc(title: string, sub: string, running: string) {
  const [{ jsPDF }, fonts] = await Promise.all([import('jspdf'), loadFonts()]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('DejaVuSans.ttf', fonts.regular);
  doc.addFont('DejaVuSans.ttf', FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', fonts.bold);
  doc.addFont('DejaVuSans-Bold.ttf', FONT, 'bold');
  doc.setProperties({ title: `${title}: ${sub}`, creator: 'Student Learning Platform' });

  // Title block on the first page.
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, PAGE.w, 4, 'F');
  const w = new Writer(doc, running);
  w.y = 14;
  w.text('STUDENT LEARNING', { size: 8, bold: true, color: BRAND, gap: 1 });
  w.text(title, { size: 20, bold: true, gap: 1 });
  w.text(sub, { size: 11, color: MUTED, gap: 2 });
  w.rule();
  return w;
}

function finish(w: Writer, filename: string) {
  const { doc } = w;
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Demo prototype · sample study material', M.x, PAGE.h - 9);
    doc.text(`Page ${i} of ${pages}`, PAGE.w - M.x, PAGE.h - 9, { align: 'right' });
  }
  doc.save(filename);
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim();
const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const SNIPPET_LABEL: Record<SnippetType, string> = {
  concept: 'CONCEPT',
  definition: 'KEY DEFINITION',
  formula: 'FORMULA',
  reaction: 'REACTION',
  ncert: 'NCERT POINT',
};

export async function downloadRevisionPdf(subject: Subject, chapter: Chapter, snippets: RevisionSnippet[]) {
  const w = await newDoc(`${chapter.title}`, `Revision notes · ${subject.name} · Class ${subject.class} · ${snippets.length} cards · ${today()}`, `${chapter.title} · Revision notes`);
  const { doc } = w;

  snippets.forEach((s, i) => {
    w.keepTogether(
      Writer.lineH(8) + w.height(s.title, 13, WIDTH, true) + 3 +
        (s.content ? w.height(s.content, 10.5) + 2 : 0) +
        (s.formula ? w.height(s.formula, 11, WIDTH - 8, true) + 7 : 0) +
        (s.bullets ?? []).reduce((h, b) => h + w.height(b, 10.5, WIDTH - 6) + 1, 0),
    );
    w.text(`${i + 1}. ${SNIPPET_LABEL[s.contentType]}`, { size: 8, bold: true, color: BRAND, gap: 0.5 });
    w.text(s.title, { size: 13, bold: true, gap: 1.5 });
    if (s.content) w.text(s.content, { size: 10.5, gap: 2 });
    if (s.formula) {
      const lines = w.lines(s.formula, 11, WIDTH - 8);
      const h = lines.length * Writer.lineH(11) + 5;
      w.ensure(h);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(M.x, w.y, WIDTH, h, 1.5, 1.5, 'FD');
      w.y += 2.5;
      w.text(s.formula, { size: 11, bold: true, x: M.x + 4, width: WIDTH - 8, gap: 0 });
      w.y += 4.5;
    }
    for (const b of s.bullets ?? []) {
      w.ensure(Writer.lineH(10.5));
      doc.setFont(FONT, 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...BRAND);
      doc.text('•', M.x + 1, w.y + 10.5 * PT);
      w.text(b, { size: 10.5, x: M.x + 6, gap: 1 });
    }
    w.y += 1;
    if (i < snippets.length - 1) w.rule();
  });

  finish(w, `${safeName(chapter.title)} - Revision notes.pdf`);
}

const LETTERS = ['A', 'B', 'C', 'D'];

export async function downloadQuestionsPdf(
  subject: Subject,
  chapter: Chapter,
  items: BankItem[],
  { withAnswers, filterNote, showBoardYears }: { withAnswers: boolean; filterNote: string | null; showBoardYears: boolean },
) {
  const sub = [`Important questions · ${subject.name} · Class ${subject.class}`, `${items.length} questions`, withAnswers ? 'with answers' : 'questions only', filterNote, today()]
    .filter(Boolean)
    .join(' · ');
  const w = await newDoc(chapter.title, sub, `${chapter.title} · Important questions`);

  const answerText = (q: BankItem) => {
    const correct = q.options?.find((o) => o.id === q.correctOptionId);
    return correct ? `Answer: (${LETTERS[q.options!.indexOf(correct)]}) ${correct.text}. ${q.answer}` : `Answer: ${q.answer}`;
  };

  items.forEach((q, i) => {
    // The whole question, its options, tags and answer stay together whenever they fit on one page.
    w.keepTogether(
      w.height(`Q${i + 1}.  ${q.questionText}`, 11, WIDTH, true) + 2 +
        (q.options ?? []).reduce((h, o, k) => h + w.height(`(${LETTERS[k]})  ${o.text}`, 10.5, WIDTH - 6) + 0.8, 0) +
        Writer.lineH(8.5) + 2 + (showBoardYears && q.years.length ? Writer.lineH(9) + 1 : 0) +
        (withAnswers ? w.height(answerText(q), 10) + 1.5 : 0),
    );
    w.text(`Q${i + 1}.  ${q.questionText}`, { size: 11, bold: true, gap: 1.5 });
    q.options?.forEach((o, k) => w.text(`(${LETTERS[k]})  ${o.text}`, { size: 10.5, x: M.x + 6, gap: 0.8 }));
    const meta = [`${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}`, q.questionType, q.source].join(' · ');
    w.y += 0.8;
    w.text(meta, { size: 8.5, color: MUTED, gap: 0.8 });
    if (showBoardYears && q.years.length > 0) {
      const years = [...q.years].sort((a, b) => a - b).join(', ');
      w.text(`Asked in CBSE board exams: ${years}${q.years.length >= 2 ? '  ·  REPEATED' : ''}`, { size: 9, bold: true, color: WARN, gap: 1 });
    }
    if (withAnswers) {
      w.y += 0.5;
      w.text(answerText(q), { size: 10, color: BRAND, gap: 1 });
    }
    w.y += 1;
    if (i < items.length - 1) w.rule();
  });

  finish(w, `${safeName(chapter.title)} - Important questions${withAnswers ? '' : ' (no answers)'}.pdf`);
}
