import { TopQuestionsPanel, SessionEngagementPanel } from "./TopQuestionsPanel";
import { AssignmentQuestionsPanel } from "./AssignmentQuestionsPanel";
import { LessonImprovementsPanel } from "./LessonImprovementsPanel";
import { StatsBar } from "./StatsBar";
import { useCallback, useState } from "react";
import type { CourseQuestionsAnalyticsResponse } from "@web/api/analytics";

type Props = {
  courseId: string;
  rangeStartUtc: string;
  rangeEndUtc: string;
  timezone: string;
};

export function DashboardPanels({ courseId, rangeStartUtc, rangeEndUtc, timezone }: Props) {
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [improvements, setImprovements] = useState<CourseQuestionsAnalyticsResponse["weekly_improvements"]>([]);
  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsAnalyticsLoading(loading);
  }, []);
  const handleAnalyticsData = useCallback((data: CourseQuestionsAnalyticsResponse) => {
    setImprovements(data.weekly_improvements ?? []);
  }, []);

  return (
    <div className="space-y-6">
      <StatsBar isLoading={isAnalyticsLoading} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TopQuestionsPanel
          courseId={courseId}
          rangeStartUtc={rangeStartUtc}
          rangeEndUtc={rangeEndUtc}
          timezone={timezone}
          onLoadingChange={handleLoadingChange}
          onAnalyticsData={handleAnalyticsData}
        />
        <div className="space-y-6">
          <AssignmentQuestionsPanel isLoading={isAnalyticsLoading} />
          <SessionEngagementPanel isLoading={isAnalyticsLoading} />
        </div>
      </div>
      <LessonImprovementsPanel
        isLoading={isAnalyticsLoading}
        improvements={improvements}
      />
    </div>
  );
}

export { TopQuestionsPanel, SessionEngagementPanel } from "./TopQuestionsPanel";
export { AssignmentQuestionsPanel } from "./AssignmentQuestionsPanel";
export { LessonImprovementsPanel } from "./LessonImprovementsPanel";
