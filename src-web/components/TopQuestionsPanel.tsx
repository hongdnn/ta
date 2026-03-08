import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { topQuestions, pastQuestions, sessionEngagement } from "../data/mockDashboardData";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { MessageCircleQuestion, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const chartConfig: ChartConfig = {
  questions: { label: "Questions", color: "hsl(var(--primary))" },
};

export function TopQuestionsPanel() {
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-muted-foreground" />
            Past Questions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Frequently asked in previous weeks, sorted by popularity
          </p>
        </CardHeader>
        <CardContent>
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
                  <span className="text-xs text-muted-foreground">{q.week}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {q.count} asks
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export function SessionEngagementPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Session Engagement</CardTitle>
        <p className="text-sm text-muted-foreground">
          Questions asked per lecture session
        </p>
      </CardHeader>
      <CardContent>
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
                    return item ? `${item.session} – ${item.label}` : "";
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
      </CardContent>
    </Card>
  );
}
