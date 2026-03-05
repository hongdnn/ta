import { TopQuestionsPanel } from "./TopQuestionsPanel";
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
          <LessonImprovementsPanel />
        </div>
      </div>
    </div>
  );
}

export { TopQuestionsPanel } from "./TopQuestionsPanel";
export { AssignmentQuestionsPanel } from "./AssignmentQuestionsPanel";
export { LessonImprovementsPanel } from "./LessonImprovementsPanel";
