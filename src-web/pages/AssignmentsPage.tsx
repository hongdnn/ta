import { AssignmentQuestionsPanel } from "../components/AssignmentQuestionsPanel";

export default function AssignmentsPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Assignment Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed breakdown of student questions per assignment and problem
        </p>
      </div>
      <AssignmentQuestionsPanel />
    </div>
  );
}
