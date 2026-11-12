import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackLink, HERO_CTA, Note, Notice, PageTitle, Pick, WHITE_PANEL } from '../components/page-parts';
import { chaptersForSubject } from '../services/questionService';
import { createRoom, joinRoom } from '../services/roomService';
import { subjectsForClass, useStudent } from '../services/studentService';

const PANEL_TITLE = 'text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground';

export function DemoModeNote() {
  return <Note testId="demo-mode-note">Demo mode: other players are simulated on this device. Rooms don't connect separate devices.</Note>;
}

export function RoomsPage() {
  const student = useStudent();
  const navigate = useNavigate();
  const subjects = subjectsForClass(student.class);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const chapters = chaptersForSubject(subjectId);
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <BackLink to="/flashcards">Flashcards</BackLink>
      <PageTitle title="Multiplayer rooms" sub="Everyone in a room answers the same questions from the question bank" />
      <DemoModeNote />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className={`${WHITE_PANEL} flex flex-col gap-4`}>
          <h2 className={PANEL_TITLE}>Create a room</h2>
          <Pick
            label="Subject"
            testId="room-subject"
            value={subjectId}
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) => {
              setSubjectId(v);
              setChapterId(chaptersForSubject(v)[0]?.id ?? '');
            }}
          />
          <Pick
            label="Chapter"
            testId="room-chapter"
            value={chapterId}
            options={chapters.map((c) => ({ value: c.id, label: c.title }))}
            onChange={setChapterId}
          />
          <Button
            className={`${HERO_CTA} self-start`}
            disabled={!chapterId}
            data-testid="create-room"
            onClick={() => {
              const room = createRoom(subjectId, chapterId);
              if (room) navigate(`/flashcards/rooms/${room.id}`);
            }}
          >
            Create room
          </Button>
        </section>
        <section className={`${WHITE_PANEL} flex flex-col gap-4`}>
          <h2 className={PANEL_TITLE}>Join a room</h2>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const outcome = joinRoom(code);
              if (outcome.ok) navigate(`/flashcards/rooms/${outcome.room.id}`);
              else setError(outcome.error);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room-code">Room code</Label>
              <Input
                id="room-code"
                value={code}
                autoComplete="off"
                data-testid="room-code-input"
                aria-invalid={Boolean(error)}
                className="bg-background"
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
              />
            </div>
            {error && <Notice tone="error" testId="room-error">{error}</Notice>}
            <Button type="submit" variant="outline" className="self-start" data-testid="join-room">Join room</Button>
          </form>
          <p className="text-[14px] leading-5 text-muted-foreground">Try the demo code CHEM12M.</p>
        </section>
      </div>
    </>
  );
}
