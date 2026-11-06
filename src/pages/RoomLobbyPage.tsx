import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BackLink, HERO_CTA, Notice, NotFoundState, PageTitle, WHITE_PANEL } from '../components/page-parts';
import { ROOM_MIN_PARTICIPANTS } from '../config/rewards';
import { AvatarImage } from '../components/AvatarImage';
import { chapterById, seedStudentById, subjectById } from '../services/catalog';
import { leaveRoom, roomById, startBlockedReason, startRoom, tickRoom } from '../services/roomService';
import { getState, useAppState } from '../services/store';
import { DemoModeNote } from './RoomsPage';

export function RoomLobbyPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const room = useAppState((s) => roomById(s, roomId));
  const myId = useAppState((s) => s.demoStudentId);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => tickRoom(roomId), 300);
    return () => clearInterval(timer);
  }, [roomId]);

  useEffect(() => {
    if (room?.status === 'in_progress' && room.attemptId) navigate(`/flashcards/quiz/${room.attemptId}`, { replace: true });
    if (room?.status === 'finished') navigate(`/flashcards/rooms/${room.id}/results`, { replace: true });
  }, [room?.status, room?.attemptId, room?.id, navigate]);

  if (!room) return <NotFoundState message="This room doesn't exist." />;
  if (room.status === 'closed' || !room.participants.some((p) => p.studentId === myId)) {
    return <NotFoundState message="You aren't in this room. Join it with its code from the rooms page." />;
  }

  const isHost = room.hostStudentId === myId;
  const blocked = startBlockedReason(room, myId);
  const hostName = seedStudentById(room.hostStudentId)?.name;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
    } catch {
      setError(`Copying isn't available here. The code is ${room.code}.`);
    }
  };

  return (
    <>
      <BackLink to="/flashcards/rooms">Rooms</BackLink>
      <PageTitle title="Multiplayer quiz room" sub={`${subjectById(room.subjectId)?.name} · ${chapterById(room.chapterId)?.title} · ${room.questionIds.length} questions`} />
      <DemoModeNote />
      <section className={`${WHITE_PANEL} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] leading-5 text-muted-foreground">Room code</p>
            <p className="font-mono text-[30px] leading-[36px] font-semibold tracking-[-0.225px] text-foreground" data-testid="room-code">{room.code}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copy}><Copy className="size-4" />{copied ? 'Copied' : 'Copy code'}</Button>
        </div>
        <p className="text-[16px] leading-6 text-muted-foreground">Host: <span className="font-medium text-foreground" data-testid="room-host">{hostName}</span></p>
        <ul className="divide-y divide-sidebar-border rounded-xl border border-sidebar-border" data-testid="players">
          {room.participants.map((p) => (
            <li key={p.studentId} data-testid="player" data-student={p.studentId} className="flex items-center gap-3 px-4 py-2.5">
              <AvatarImage config={getState().avatarConfigs[p.studentId]} className="size-8" />
              <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-foreground">{seedStudentById(p.studentId)?.name}{p.studentId === myId && ' (you)'}</span>
              <span className={cn('text-[12px] leading-4 font-medium tracking-[-0.072px]', p.state === 'ready' ? 'text-[#008a2e]' : 'text-[#ad4e00]')}>
                {p.isHost ? 'Host, ' : ''}{p.state === 'ready' ? 'ready' : 'waiting'}
              </span>
            </li>
          ))}
        </ul>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          {isHost ? (
            <Button className={HERO_CTA} data-testid="start-room" disabled={blocked !== null} onClick={() => setError(startRoom(room.id))}>Start quiz</Button>
          ) : (
            <Button disabled data-testid="start-room">Waiting for {hostName} to start</Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              leaveRoom(room.id);
              navigate('/flashcards/rooms');
            }}
          >
            {isHost ? 'Close room' : 'Leave room'}
          </Button>
        </div>
        {isHost && blocked && <p className="text-[14px] leading-5 text-muted-foreground" data-testid="start-blocked">Waiting for players. {ROOM_MIN_PARTICIPANTS} are needed to start.</p>}
        {!isHost && <p className="text-[14px] leading-5 text-muted-foreground" data-testid="host-only">Only the host can start the quiz.</p>}
      </section>
    </>
  );
}
