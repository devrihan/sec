import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-states/empty-state';
import { Button } from '@/components/ui/button';
import { CardGrid, PageTitle, SectionHeading } from '../components/page-parts';
import { StatCard } from '../components/stat-card';
import { SubjectCard } from '../components/SubjectCard';
import { useAppState } from '../services/store';
import { subjectsForClass, useStudent } from '../services/studentService';

export function FlashcardsPage() {
  const student = useStudent();
  const subjects = subjectsForClass(student.class);
  const openRooms = useAppState((s) => s.rooms.filter((r) => r.status === 'open' && r.class === s.studentClass).length);
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
        <SectionHeading title="Play with friends" sub="Create a room and share the code, or join with a code from a friend" />
        <CardGrid>
          <StatCard name="Multiplayer rooms" subtitle="Same questions for everyone" label="Open rooms" avg={openRooms} href="/flashcards/rooms" testId="open-rooms" />
        </CardGrid>
      </section>
    </>
  );
}
