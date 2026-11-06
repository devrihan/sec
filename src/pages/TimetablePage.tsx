import { Check, ChevronLeft, ChevronRight, Lightbulb, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { HERO_CTA, Note, Notice, PageTitle } from '../components/page-parts';
import { SessionDialog, type DialogRequest } from '../components/SessionDialog';
import {
  addDays,
  addDaysKey,
  formatDay,
  formatLongDay,
  formatMonth,
  formatTime,
  monthGrid,
  parseDateKey,
  startOfWeek,
  toDateKey,
  weekDays,
} from '../lib/dates';
import { chapterById, subjectById } from '../services/catalog';
import { chaptersForSubject } from '../services/questionService';
import { useAppState, type AppState } from '../services/store';
import { subjectsForClass, useStudent } from '../services/studentService';
import {
  deleteSession,
  examsOn,
  holidayOn,
  sessionsOn,
  suggestionsFor,
  toggleSessionDone,
  upcomingExams,
  upcomingHolidays,
  type SessionInput,
  type StudySuggestion,
} from '../services/timetableService';
import type { TimetableEntry } from '../types';

const SEGMENT = 'flex-none rounded-[4px] px-3 py-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-[0px_1px_1px_rgba(0,0,0,0.05)]';
const RAIL_TITLE = 'text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground';
const RAIL_CARD = 'rounded-xl border bg-card p-4 shadow-sm';

function SessionRow({ entry, onEdit, onReschedule }: { entry: TimetableEntry; onEdit: () => void; onReschedule: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const subject = subjectById(entry.subjectId)?.name;
  const chapter = chapterById(entry.chapterId)?.title;
  return (
    <li className={cn('flex flex-wrap items-center gap-3 rounded-lg border bg-white px-3 py-2', entry.done && 'bg-muted/40')} data-testid="session-row" data-done={entry.done}>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground tabular-nums">{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</p>
        <p className={cn('text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground', entry.done && 'line-through')}>{subject} – {chapter}</p>
        {entry.topic && <p className="truncate text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{entry.topic}</p>}
      </div>
      {confirming ? (
        <div className="flex items-center gap-1">
          <span className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">Delete this session?</span>
          <Button size="xs" variant="destructive" data-testid="session-delete-confirm" onClick={() => deleteSession(entry.id)}>Delete</Button>
          <Button size="xs" variant="outline" onClick={() => setConfirming(false)}>Keep</Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button size="xs" variant="outline" data-testid="session-reschedule" onClick={onReschedule}>Reschedule</Button>
          <Button size="icon-xs" variant="ghost" aria-label="Edit session" data-testid="session-edit" onClick={onEdit}><Pencil className="size-3.5" /></Button>
          <Button size="icon-xs" variant="ghost" aria-label={entry.done ? 'Mark as not done' : 'Mark as done'} aria-pressed={entry.done} data-testid="session-done" onClick={() => toggleSessionDone(entry.id)}><Check className="size-3.5" /></Button>
          <Button size="icon-xs" variant="ghost" aria-label="Delete session" data-testid="session-delete" onClick={() => setConfirming(true)}><Trash2 className="size-3.5" /></Button>
        </div>
      )}
    </li>
  );
}

function DayBlock({ state, date, today, onAdd, onEdit, onReschedule }: { state: AppState; date: string; today: string; onAdd: (date: string) => void; onEdit: (e: TimetableEntry) => void; onReschedule: (e: TimetableEntry) => void }) {
  const holiday = holidayOn(date);
  const exams = examsOn(state, date);
  const sessions = sessionsOn(state, date);
  return (
    <div className="flex flex-col gap-2 border-b border-sidebar-border px-4 py-3 last:border-b-0 sm:flex-row sm:gap-4" data-testid="day-block" data-date={date}>
      <div className="flex w-[120px] shrink-0 items-center justify-between gap-2 sm:block">
        <p className={cn('text-[14px] leading-5 font-medium tracking-[-0.084px]', date === today ? 'text-foreground' : 'text-muted-foreground')}>{formatDay(parseDateKey(date))}</p>
        {date === today && <Badge variant="secondary">Today</Badge>}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {holiday && <p className="rounded-md bg-[#EAF4EE] px-3 py-1 text-[14px] leading-5 text-[#008138]">{holiday.name}</p>}
        {exams.map((e) => <p key={e.id} className="rounded-md bg-[#fff0f0] px-3 py-1 text-[14px] leading-5 text-[#e60000]">{e.subjectName} exam, {formatTime(e.startTime)}</p>)}
        {sessions.length > 0 && (
          <ul className="space-y-1.5">
            {sessions.map((s) => <SessionRow key={s.id} entry={s} onEdit={() => onEdit(s)} onReschedule={() => onReschedule(s)} />)}
          </ul>
        )}
        {sessions.length === 0 && date >= today && (
          <button type="button" onClick={() => onAdd(date)} className="inline-flex items-center gap-1 text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground hover:text-foreground">
            <Plus className="size-3.5" />Add a session
          </button>
        )}
      </div>
    </div>
  );
}

function MonthGrid({ state, month, today, selected, onSelect }: { state: AppState; month: Date; today: string; selected: string; onSelect: (date: string) => void }) {
  const days = monthGrid(month.getFullYear(), month.getMonth());
  return (
    <div data-testid="month-grid">
      <div className="grid grid-cols-7 border-b border-sidebar-border bg-green-50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <p key={d} className="px-2 py-2 text-center text-[12px] leading-4 font-medium tracking-[-0.072px] text-foreground">{d}</p>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = toDateKey(d);
          const holiday = holidayOn(key);
          const exam = examsOn(state, key)[0];
          const count = sessionsOn(state, key).length;
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              data-testid="month-day"
              data-date={key}
              data-holiday={holiday?.name}
              aria-label={`${formatLongDay(d)}${holiday ? `, ${holiday.name}` : ''}${exam ? `, ${exam.subjectName} exam` : ''}${count ? `, ${count} sessions` : ''}`}
              aria-pressed={selected === key}
              className={cn(
                'flex min-h-[74px] min-w-0 flex-col gap-0.5 border-r border-b border-sidebar-border p-1.5 text-left outline-none hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&:nth-child(7n)]:border-r-0',
                !inMonth && 'bg-stone-50 text-muted-foreground',
                holiday && inMonth && 'bg-[#EAF4EE]',
                selected === key && 'ring-2 ring-primary ring-inset',
              )}
            >
              <span className={cn('text-[12px] leading-4 font-medium tabular-nums', key === today && 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground')}>{d.getDate()}</span>
              {holiday && <span className="truncate text-[10px] leading-3 text-[#008138]">{holiday.name}</span>}
              {exam && <span className="truncate text-[10px] leading-3 text-[#e60000]">{exam.subjectName} exam</span>}
              {count > 0 && <span className="truncate text-[10px] leading-3 text-muted-foreground">{count} {count === 1 ? 'session' : 'sessions'}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionCard({ s, onAdd }: { s: StudySuggestion; onAdd: () => void }) {
  return (
    <li className="space-y-1.5 border-b border-sidebar-border py-3 first:pt-0 last:border-b-0 last:pb-0" data-testid="suggestion" data-chapter={s.chapterId}>
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">{s.chapterTitle}</p>
        <span className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">{s.subjectName}</span>
      </div>
      <p className="text-[14px] leading-5 text-muted-foreground">{s.message}</p>
      <p className="text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">
        {s.errorCount} {s.errorCount === 1 ? 'mistake' : 'mistakes'} in {s.examNames.join(' and ')}, mostly {s.mistakeLabel.toLowerCase()}.
        {s.remediationPending ? ' Remediation still to finish.' : ' Remediation finished.'}
      </p>
      {s.plannedMinutes > 0
        ? <Badge variant="secondary" data-testid="suggestion-planned">{Math.round((s.plannedMinutes / 60) * 10) / 10} hr planned</Badge>
        : <Button size="xs" variant="outline" data-testid="suggestion-add" onClick={onAdd}><Plus className="size-3" />Add to timetable</Button>}
    </li>
  );
}

export function TimetablePage() {
  const student = useStudent();
  const state = useAppState((s) => s);
  const now = useMemo(() => new Date(), []);
  const today = toDateKey(now);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(now);
  const [selected, setSelected] = useState(today);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const suggestions = useMemo(() => suggestionsFor(state, now), [state, now]);
  const exams = useMemo(() => upcomingExams(state, now), [state, now]);
  const holidays = useMemo(() => upcomingHolidays(now).slice(0, 4), [now]);
  const week = weekDays(startOfWeek(anchor));
  const firstSubject = subjectsForClass(student.class)[0];

  const blank = (date: string, subjectId = firstSubject?.id ?? '', chapterId?: string): SessionInput => ({
    date,
    startTime: '17:00',
    endTime: '18:00',
    subjectId,
    chapterId: chapterId ?? chaptersForSubject(subjectId)[0]?.id ?? '',
    topic: '',
  });
  const fromEntry = (e: TimetableEntry): SessionInput => ({ date: e.date, startTime: e.startTime, endTime: e.endTime, subjectId: e.subjectId, chapterId: e.chapterId, topic: e.topic });
  const next = today < selected ? selected : addDaysKey(today, 1);

  const move = (direction: 1 | -1) => {
    if (view === 'week') setAnchor(addDays(anchor, direction * 7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1));
  };

  const dayProps = {
    state,
    today,
    onAdd: (date: string) => setDialog({ mode: 'new', defaults: blank(date) }),
    onEdit: (e: TimetableEntry) => setDialog({ mode: 'edit', entry: e, defaults: fromEntry(e) }),
    onReschedule: (e: TimetableEntry) => setDialog({ mode: 'reschedule', entry: e, defaults: fromEntry(e) }),
  };

  return (
    <>
      <PageTitle
        title="Timetable"
        sub="Plan your own study time around exams and holidays"
        aside={<Button className={HERO_CTA} data-testid="add-session" onClick={() => setDialog({ mode: 'new', defaults: blank(next) })}><Plus className="size-4" />Add session</Button>}
      />
      <Note>Holidays and exam dates are sample data until the school calendar is connected.</Note>
      {notice && <Notice testId="timetable-notice">{notice}</Notice>}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-sidebar-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border px-4 py-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" aria-label={`Previous ${view}`} data-testid="timetable-prev" onClick={() => move(-1)}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="icon-sm" aria-label={`Next ${view}`} data-testid="timetable-next" onClick={() => move(1)}><ChevronRight className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => { setAnchor(now); setSelected(today); }}>Today</Button>
              <p className="ml-2 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground" data-testid="timetable-range">
                {view === 'week' ? `${formatDay(week[0])} – ${formatDay(week[6])}` : formatMonth(anchor)}
              </p>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'month')}>
              <TabsList className="h-auto gap-0 rounded-md bg-secondary p-1 group-data-[orientation=horizontal]/tabs:h-auto">
                <TabsTrigger value="week" className={SEGMENT}>Week</TabsTrigger>
                <TabsTrigger value="month" className={SEGMENT}>Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {view === 'week' ? (
            <div data-testid="week-view">
              {week.map((d) => <DayBlock key={toDateKey(d)} date={toDateKey(d)} {...dayProps} />)}
            </div>
          ) : (
            <>
              <MonthGrid state={state} month={anchor} today={today} selected={selected} onSelect={setSelected} />
              <DayBlock date={selected} {...dayProps} />
            </>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
          <section className={RAIL_CARD} data-testid="suggestions">
            <h2 className={cn(RAIL_TITLE, 'mb-1 flex items-center gap-2')}><Lightbulb className="size-4 text-amber-500" />Suggested for you</h2>
            <p className="mb-3 text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">Based on your exam mistakes and remediation progress.</p>
            {suggestions.length === 0 ? (
              <p className="text-[14px] leading-5 text-muted-foreground" data-testid="no-suggestions">No exam mistakes on record for your class, so there's nothing to suggest yet.</p>
            ) : (
              <ul>
                {suggestions.map((s) => (
                  <SuggestionCard key={s.chapterId} s={s} onAdd={() => setDialog({ mode: 'new', defaults: blank(addDaysKey(today, 1), s.subjectId, s.chapterId) })} />
                ))}
              </ul>
            )}
          </section>

          <section className={RAIL_CARD} data-testid="upcoming-exams">
            <h2 className={cn(RAIL_TITLE, 'mb-2')}>Upcoming exams</h2>
            {exams.length === 0 ? (
              <EmptyState title="No exams scheduled" />
            ) : (
              <ul className="space-y-2">
                {exams.map((e) => (
                  <li key={e.id} className="text-[14px] leading-5" data-testid="exam-row">
                    <p className="font-medium tracking-[-0.084px] text-foreground">{e.subjectName}</p>
                    <p className="text-muted-foreground">{e.name}, {formatDay(parseDateKey(e.date))}, {formatTime(e.startTime)} – {formatTime(e.endTime)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={RAIL_CARD} data-testid="upcoming-holidays">
            <h2 className={cn(RAIL_TITLE, 'mb-2')}>School holidays</h2>
            {holidays.length === 0 ? (
              <EmptyState title="No holidays listed" />
            ) : (
              <ul className="space-y-2">
                {holidays.map((h) => (
                  <li key={h.id} className="text-[14px] leading-5">
                    <p className="font-medium tracking-[-0.084px] text-foreground">{h.name}</p>
                    <p className="text-muted-foreground">
                      {formatDay(parseDateKey(h.startDate))}{h.endDate !== h.startDate ? ` – ${formatDay(parseDateKey(h.endDate))}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {dialog && (
        <SessionDialog
          key={dialog.entry?.id ?? 'new'}
          request={dialog}
          studentClass={student.class}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setNotice(message);
          }}
        />
      )}
    </>
  );
}
