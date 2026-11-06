import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, Pick } from './page-parts';
import { formatLongDay, parseDateKey } from '../lib/dates';
import { chaptersForSubject } from '../services/questionService';
import { getState } from '../services/store';
import { subjectsForClass } from '../services/studentService';
import { addSession, examsOn, holidayOn, updateSession, type SessionInput } from '../services/timetableService';
import type { TimetableEntry } from '../types';

export interface DialogRequest {
  mode: 'new' | 'edit' | 'reschedule';
  entry?: TimetableEntry;
  defaults: SessionInput;
}

const COPY = {
  new: { title: 'Add a study session', sub: 'Pick when you want to study and what to cover.', action: 'Add session' },
  edit: { title: 'Edit study session', sub: 'Change any detail of this session.', action: 'Save changes' },
  reschedule: { title: 'Reschedule session', sub: 'Move this session to a new date or time.', action: 'Reschedule' },
};

export function SessionDialog({ request, studentClass, onClose, onSaved }: { request: DialogRequest; studentClass: number; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<SessionInput>(request.defaults);
  const [error, setError] = useState<string | null>(null);
  const subjects = subjectsForClass(studentClass);
  const chapters = chaptersForSubject(form.subjectId);
  const copy = COPY[request.mode];
  const set = (patch: Partial<SessionInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };
  const holiday = form.date ? holidayOn(form.date) : undefined;
  const exam = form.date ? examsOn(getState(), form.date)[0] : undefined;

  const save = () => {
    const outcome = request.entry ? updateSession(request.entry.id, form) : addSession(form);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    onSaved(request.mode === 'new' ? 'Session added to your timetable.' : request.mode === 'edit' ? 'Session updated.' : `Session moved to ${formatLongDay(parseDateKey(form.date))}.`);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="rounded-2xl sm:max-w-[480px]" data-testid="session-dialog">
        <div>
          <DialogTitle className="text-[18px] leading-7 font-semibold tracking-[-0.108px]">{copy.title}</DialogTitle>
          <DialogDescription className="text-[14px] leading-5">{copy.sub}</DialogDescription>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ses-date">Date</Label>
              <Input id="ses-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} data-testid="ses-date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ses-start">Start</Label>
              <Input id="ses-start" type="time" value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} data-testid="ses-start" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ses-end">End</Label>
              <Input id="ses-end" type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} data-testid="ses-end" />
            </div>
          </div>

          {request.mode !== 'reschedule' && (
            <>
              <Pick
                label="Subject"
                testId="ses-subject"
                value={form.subjectId}
                options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                onChange={(subjectId) => set({ subjectId, chapterId: chaptersForSubject(subjectId)[0]?.id ?? '' })}
              />
              <Pick label="Chapter" testId="ses-chapter" value={form.chapterId} options={chapters.map((c) => ({ value: c.id, label: c.title }))} onChange={(chapterId) => set({ chapterId })} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ses-topic">Topic (optional)</Label>
                <Input id="ses-topic" value={form.topic} placeholder="For example, Nernst equation" onChange={(e) => set({ topic: e.target.value })} data-testid="ses-topic" />
              </div>
            </>
          )}

          {holiday && <p className="text-[14px] leading-5 text-muted-foreground" data-testid="ses-holiday">This falls on {holiday.name}.</p>}
          {exam && <p className="text-[14px] leading-5 text-[#ad4e00]" data-testid="ses-exam">You have your {exam.subjectName} exam on this day.</p>}
          {error && <Notice tone="error" testId="ses-error">{error}</Notice>}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" data-testid="ses-save">{copy.action}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
