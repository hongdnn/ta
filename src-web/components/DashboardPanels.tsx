import { TopQuestionsPanel, SessionEngagementPanel } from "./TopQuestionsPanel";
import { AssignmentQuestionsPanel } from "./AssignmentQuestionsPanel";
import { LessonImprovementsPanel } from "./LessonImprovementsPanel";
import { StatsBar } from "./StatsBar";

export function DashboardPanels() {
  return (
    <div className="space-y-6">
      <StatsBar />
      <div className="grid gap-6 lg:grid-cols-2">
        <TopQuestionsPanel />
        <div className="space-y-6">
          <AssignmentQuestionsPanel />
          <SessionEngagementPanel />
        </div>
      </div>
      <LessonImprovementsPanel />
    </div>
  );
}

export { TopQuestionsPanel, SessionEngagementPanel } from "./TopQuestionsPanel";
export { AssignmentQuestionsPanel } from "./AssignmentQuestionsPanel";
export { LessonImprovementsPanel } from "./LessonImprovementsPanel";
