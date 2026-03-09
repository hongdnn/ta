import { TopQuestionsPanel, SessionEngagementPanel } from "./TopQuestionsPanel";
import { AssignmentQuestionsPanel } from "./AssignmentQuestionsPanel";
import { LessonImprovementsPanel } from "./LessonImprovementsPanel";
import { StatsBar } from "./StatsBar";
import { useState } from "react";

type Props = {
  courseId: string;
  rangeStartUtc: string;
  rangeEndUtc: string;
};

export function DashboardPanels({ courseId, rangeStartUtc, rangeEndUtc }: Props) {
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  return (
    <div className="space-y-6">
      <StatsBar isLoading={isAnalyticsLoading} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TopQuestionsPanel
          courseId={courseId}
          rangeStartUtc={rangeStartUtc}
          rangeEndUtc={rangeEndUtc}
          onLoadingChange={setIsAnalyticsLoading}
        />
        <div className="space-y-6">
          <AssignmentQuestionsPanel isLoading={isAnalyticsLoading} />
          <SessionEngagementPanel isLoading={isAnalyticsLoading} />
        </div>
      </div>
      <LessonImprovementsPanel isLoading={isAnalyticsLoading} />
    </div>
  );
}

export { TopQuestionsPanel, SessionEngagementPanel } from "./TopQuestionsPanel";
export { AssignmentQuestionsPanel } from "./AssignmentQuestionsPanel";
export { LessonImprovementsPanel } from "./LessonImprovementsPanel";
