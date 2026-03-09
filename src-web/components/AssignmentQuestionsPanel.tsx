import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assignments, type Assignment } from "../data/mockDashboardData";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export function AssignmentQuestionsPanel({ isLoading = false }: { isLoading?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const maxQuestions = Math.max(...assignments.map((a) => a.totalQuestions));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Assignment Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-1.5 w-full rounded-md" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </>
        ) : (
          assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              maxQuestions={maxQuestions}
              isOpen={openId === a.id}
              onToggle={() => setOpenId(openId === a.id ? null : a.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentRow({
  assignment,
  maxQuestions,
  isOpen,
  onToggle,
}: {
  assignment: Assignment;
  maxQuestions: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors text-left">
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-90"
          )}
        />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{assignment.name}</span>
          <div className="mt-1">
            <Progress
              value={(assignment.totalQuestions / maxQuestions) * 100}
              className="h-1.5"
            />
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 font-mono">
          {assignment.totalQuestions} questions
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-7 mt-2 space-y-3 pb-2">
          {/* Problems */}
          <div className="space-y-1.5">
            {assignment.problems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <span className="text-sm text-foreground">{p.title}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {p.questionsAsked} asks
                </span>
              </div>
            ))}
          </div>

          {/* Themes */}
          {assignment.themes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Common question themes
              </p>
              <div className="flex flex-wrap gap-2">
                {assignment.themes.map((theme) => (
                  <Badge
                    key={theme}
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
