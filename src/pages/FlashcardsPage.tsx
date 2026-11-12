import { Swords, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { CardGrid, PageTitle, SectionHeading } from '../components/page-parts';
import { StatCard } from '../components/stat-card';
import { SubjectCard } from '../components/SubjectCard';
import { battlesWonBy } from '../services/battleService';
import { useAppState } from '../services/store';
import { subjectsForClass, useStudent } from '../services/studentService';

export function FlashcardsPage() {
  const student = useStudent();
  const subjects = subjectsForClass(student.class);
  const openRooms = useAppState((s) => s.rooms.filter((r) => r.status === 'open' && r.class === s.studentClass).length);
  const battlesWon = useAppState((s) => battlesWonBy(s, s.demoStudentId));
  return (
    <>
      <PageTitle
        title="Flashcards"
        sub="Practise MCQs and compete with your section"
        aside={<Button asChild variant="outline"><Link to="/leaderboard"><Trophy className="size-4" />Section leaderboard</Link></Button>}
      />
      <section>
        <SectionHeading title="Pick a subject for a solo quiz" sub="Coins and points are added when you finish the whole quiz" />
        {subjects.length === 0 ? (
          <EmptyState variant="page" title="No subjects for this class yet" />
        ) : (
          <CardGrid>{subjects.map((s) => <SubjectCard key={s.id} subject={s} to={`/flashcards/${s.id}`} />)}</CardGrid>
        )}
      </section>
      <section>
        <SectionHeading title="Play with friends" sub="Team up for a 3 vs 3 battle, or play a room where everyone answers alone" />
        <CardGrid>
          <StatCard name="Team Battle" subtitle="3 vs 3 with private team chat and voice" label="Battles won" avg={battlesWon} href="/flashcards/battle" testId="team-battle" tag={<span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[12px] leading-4 font-medium text-white"><Swords className="size-3" aria-hidden="true" />New</span>} />
          <StatCard name="Multiplayer rooms" subtitle="Same questions for everyone" label="Open rooms" avg={openRooms} href="/flashcards/rooms" testId="open-rooms" />
        </CardGrid>
      </section>
    </>
  );
}
