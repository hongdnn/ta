import { TopQuestionsPanel } from "@/components/dashboard/TopQuestionsPanel";
import { AssignmentQuestionsPanel } from "@/components/dashboard/AssignmentQuestionsPanel";
import { LessonImprovementsPanel } from "@/components/dashboard/LessonImprovementsPanel";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Professor Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          CS 201 — Data Structures &amp; Algorithms
          <Badge variant="secondary" className="ml-2 text-xs">
            Week of Feb 24 – Mar 2
          </Badge>
        </p>
      </div>

      {/* Grid */}
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
