import { Route, Routes } from 'react-router-dom';
import { AvatarStorePage } from '../pages/AvatarStorePage';
import { BattleHomePage } from '../pages/BattleHomePage';
import { BattlePage } from '../pages/BattlePage';
import { BattleResultsPage } from '../pages/BattleResultsPage';
import { ChapterResourcesPage } from '../pages/ChapterResourcesPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DemoSettingsPage } from '../pages/DemoSettingsPage';
import { FlashcardChaptersPage } from '../pages/FlashcardChaptersPage';
import { FlashcardsPage } from '../pages/FlashcardsPage';
import { FormulaReviewPage } from '../pages/FormulaReviewPage';
import { ImportantQuestionsPage } from '../pages/ImportantQuestionsPage';
import { WrittenPracticePage } from '../pages/WrittenPracticePage';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { PreparationPage } from '../pages/PreparationPage';
import { ProfilePage } from '../pages/ProfilePage';
import { QuizIntroPage } from '../pages/QuizIntroPage';
import { QuizPage } from '../pages/QuizPage';
import { QuizResultsPage } from '../pages/QuizResultsPage';
import { RemediationAssessmentPage } from '../pages/RemediationAssessmentPage';
import { RemediationChapterPage } from '../pages/RemediationChapterPage';
import { RemediationPage } from '../pages/RemediationPage';
import { RemediationRoadmapPage } from '../pages/RemediationRoadmapPage';
import { RevisionPage } from '../pages/RevisionPage';
import { RoomLobbyPage } from '../pages/RoomLobbyPage';
import { RoomResultsPage } from '../pages/RoomResultsPage';
import { RoomsPage } from '../pages/RoomsPage';
import { SavedSnippetsPage } from '../pages/SavedSnippetsPage';
import { SubjectChaptersPage } from '../pages/SubjectChaptersPage';
import { TimetablePage } from '../pages/TimetablePage';
import { Layout } from './App';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />

        <Route path="preparation" element={<PreparationPage />} />
        <Route path="preparation/saved" element={<SavedSnippetsPage />} />
        <Route path="preparation/:subjectId" element={<SubjectChaptersPage />} />
        <Route path="preparation/:subjectId/:chapterId" element={<ChapterResourcesPage />} />
        <Route path="preparation/:subjectId/:chapterId/revision" element={<RevisionPage />} />
        <Route path="preparation/:subjectId/:chapterId/questions" element={<ImportantQuestionsPage />} />
        <Route path="preparation/:subjectId/:chapterId/written-practice" element={<WrittenPracticePage />} />

        <Route path="flashcards" element={<FlashcardsPage />} />
        <Route path="flashcards/rooms" element={<RoomsPage />} />
        <Route path="flashcards/rooms/:roomId" element={<RoomLobbyPage />} />
        <Route path="flashcards/rooms/:roomId/results" element={<RoomResultsPage />} />
        <Route path="flashcards/battle" element={<BattleHomePage />} />
        <Route path="flashcards/battle/:battleId" element={<BattlePage />} />
        <Route path="flashcards/battle/:battleId/results" element={<BattleResultsPage />} />
        <Route path="flashcards/quiz/:attemptId" element={<QuizPage />} />
        <Route path="flashcards/results/:attemptId" element={<QuizResultsPage />} />
        <Route path="flashcards/:subjectId" element={<FlashcardChaptersPage />} />
        <Route path="flashcards/:subjectId/:chapterId" element={<QuizIntroPage />} />

        <Route path="remediation" element={<RemediationPage />} />
        <Route path="remediation/formulas" element={<FormulaReviewPage />} />
        <Route path="remediation/:examId/:subjectId" element={<RemediationRoadmapPage />} />
        <Route path="remediation/:examId/:subjectId/:chapterId" element={<RemediationChapterPage />} />
        <Route path="remediation/:examId/:subjectId/:chapterId/assessment" element={<RemediationAssessmentPage />} />

        <Route path="timetable" element={<TimetablePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="avatars" element={<AvatarStorePage />} />
        <Route path="settings" element={<DemoSettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
