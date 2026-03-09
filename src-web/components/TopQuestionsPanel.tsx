import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sessionEngagement } from "../data/mockDashboardData";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { MessageCircleQuestion, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchCourseQuestionsAnalytics,
} from "@web/api/analytics";

const chartConfig: ChartConfig = {
  questions: { label: "Questions", color: "hsl(var(--primary))" },
};

type Props = {
  courseId: string;
  rangeStartUtc: string;
  rangeEndUtc: string;
  onLoadingChange?: (loading: boolean) => void;
};

export function TopQuestionsPanel({ courseId, rangeStartUtc, rangeEndUtc, onLoadingChange }: Props) {
  const [topQuestions, setTopQuestions] = useState<Array<{ rank: number; question: string; count: number }>>([]);
  const [pastQuestions, setPastQuestions] = useState<Array<{ rank: number; question: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const loadAnalytics = useCallback(() => {
    setIsLoading(true);
    onLoadingChange?.(true);
    setLoadError(null);

    void fetchCourseQuestionsAnalytics(courseId, rangeStartUtc, rangeEndUtc, timezone)
      .then((data) => {
        setTopQuestions(
          (data.top_questions_this_week ?? []).map((item, idx) => ({
            rank: idx + 1,
            question: item.question,
            count: item.asks_this_week,
          }))
        );
        setPastQuestions(
          (data.past_questions ?? []).map((item, idx) => ({
            rank: idx + 1,
            question: item.question,
            count: item.asks_total_until_now,
          }))
        );
      })
      .catch(() => {
        setLoadError("Failed to load question analytics.");
        setTopQuestions([]);
        setPastQuestions([]);
      })
      .finally(() => {
        setIsLoading(false);
        onLoadingChange?.(false);
      });
  }, [courseId, rangeStartUtc, rangeEndUtc, timezone, onLoadingChange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            Top Questions This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-7 rounded-full" />
                  <Skeleton className="h-4 flex-1 rounded-md" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : topQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions this week yet.</p>
          ) : (
            <ol className="space-y-3">
              {topQuestions.map((q) => (
                <li key={q.rank} className="flex items-start gap-3">
                  <Badge
                    variant="secondary"
                    className="mt-0.5 shrink-0 min-w-[28px] justify-center font-mono"
                  >
                    {q.rank}
                  </Badge>
                  <span className="flex-1 text-sm text-foreground leading-snug">
                    {q.question}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {q.count} asks
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-muted-foreground" />
            Past Questions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Questions asked in previous weeks
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-7 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : pastQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No repeated past questions this week.</p>
          ) : (
            <ol className="space-y-3">
              {pastQuestions.map((q, i) => (
                <li key={q.rank} className="flex items-start gap-3">
                  <Badge
                    variant="outline"
                    className="mt-0.5 shrink-0 min-w-[28px] justify-center font-mono"
                  >
                    {i + 1}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground leading-snug block">
                      {q.question}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {q.count} asks
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SessionEngagementPanel({ isLoading = false }: { isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Weekly Question Activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Questions asked from Monday to Sunday
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[220px] w-full space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-end gap-3 h-9">
                <Skeleton className="h-2 flex-1 rounded-md" />
                <Skeleton className="h-2 flex-1 rounded-md" />
                <Skeleton className="h-2 flex-1 rounded-md" />
                <Skeleton className="h-2 flex-1 rounded-md" />
                <Skeleton className="h-2 flex-1 rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={sessionEngagement}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="session"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.label}` : "";
                    }}
                  />
                }
              />
              <Bar
                dataKey="questions"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
