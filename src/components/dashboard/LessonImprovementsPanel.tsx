import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { improvementSuggestions } from "@/data/mockDashboardData";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowUpCircle, ArrowRightCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig = {
  high: {
    icon: ArrowUpCircle,
    label: "High",
    className: "border-destructive/30 bg-destructive/5 text-destructive",
  },
  medium: {
    icon: ArrowRightCircle,
    label: "Medium",
    className: "border-warning/30 bg-warning/5 text-warning",
  },
  low: {
    icon: ArrowDownCircle,
    label: "Low",
    className: "border-primary/30 bg-primary/5 text-primary",
  },
} as const;

export function LessonImprovementsPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Suggested Improvements for This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {improvementSuggestions.map((s) => {
          const config = priorityConfig[s.priority];
          const Icon = config.icon;
          return (
            <div
              key={s.id}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                config.className
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-foreground">
                      {s.title}
                    </h4>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Source: {s.source}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
