import { LessonImprovementsPanel } from "../components/LessonImprovementsPanel";

export default function ImprovementsPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Lesson Improvements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated suggestions based on this week's student question patterns
        </p>
      </div>
      <LessonImprovementsPanel />
    </div>
  );
}
