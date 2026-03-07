import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardPanels } from "../components/DashboardPanels";

function getWeekRange(offset: number): { label: string; start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    label: `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`,
    start: monday,
    end: sunday,
  };
}

export default function DashboardHome() {
  const [weekOffset, setWeekOffset] = useState(0);
  const week = getWeekRange(weekOffset);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly insights from student interactions with the AI assistant
          </p>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={() => setWeekOffset(0)}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors px-2 min-w-[180px] text-center"
          >
            {weekOffset === 0 ? "This week" : week.label}
          </button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">{week.label}</p>

      <DashboardPanels />
    </div>
  );
}
