import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HERO_CTA, NotFoundState, PageTitle } from '../components/page-parts';
import { AvatarImage } from '../components/AvatarImage';
import { chapterById } from '../services/catalog';
import { roomById, roomStandings } from '../services/roomService';
import { useAppState } from '../services/store';
import { DemoModeNote } from './RoomsPage';

export function RoomResultsPage() {
  const { roomId = '' } = useParams();
  const state = useAppState((s) => s);
  const room = roomById(state, roomId);
  const rows = useMemo(() => (room ? roomStandings(state, room) : []), [state, room]);
  if (!room || room.status !== 'finished') return <NotFoundState message="Results appear after the room quiz finishes." />;
  return (
    <>
      <PageTitle title="Room results" sub={`${chapterById(room.chapterId)?.title}, room ${room.code}`} />
      <DemoModeNote />
      <ol className="divide-y divide-sidebar-border overflow-hidden rounded-xl border border-sidebar-border bg-white" data-testid="room-results">
        {rows.map((r) => (
          <li key={r.studentId} data-testid="room-result-row" className={cn('flex items-center gap-3 px-4 py-3', r.isCurrent && 'bg-secondary')}>
            <span className="w-8 text-[14px] leading-5 font-medium tabular-nums">#{r.rank}</span>
            <AvatarImage config={r.avatar} className="size-8" />
            <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-foreground">{r.name}{r.isCurrent && ' (you)'}</span>
            <span className="text-[14px] leading-5 font-medium tabular-nums">{r.score} / {r.total}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/leaderboard">View leaderboard</Link></Button>
        <Button asChild className={HERO_CTA}><Link to="/flashcards">Back to Flashcards</Link></Button>
      </div>
    </>
  );
}
