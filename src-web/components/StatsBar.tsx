import { Card, CardContent } from "@/components/ui/card";
import { MessageCircleQuestion, BookOpen, TrendingUp, Users } from "lucide-react";

const stats = [
  { label: "Total Questions", value: "161", icon: MessageCircleQuestion, change: "+23%" },
  { label: "Active Students", value: "47", icon: Users, change: "+5" },
  { label: "Assignments", value: "3", icon: BookOpen, change: "" },
  { label: "Avg. Engagement", value: "28.4", icon: TrendingUp, change: "+12%" },
];

export function StatsBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              {s.change && (
                <span className="text-xs text-primary font-medium">{s.change}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
