import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DashboardPanels } from "../components/DashboardPanels";
import { fetchMyCourses, type CourseItem } from "@web/api/catalog";

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const endLocal = offset === 0 ? now : nextMonday;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    startUtcIso: monday.toISOString(),
    endUtcIso: endLocal.toISOString(),
    label: `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`,
  };
}

export default function DashboardHome() {
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const week = getWeekRange(weekOffset);

  const filtered = useMemo(
    () => courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
  ),
    [courses, search]
  );

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    void fetchMyCourses()
      .then((items) => setCourses(items))
      .catch(() => setLoadError("Failed to load your courses."))
      .finally(() => setIsLoading(false));
  }, []);

  // Course selector view
  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a course to view weekly insights
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading courses...</p>
          )}
          {!isLoading && loadError && (
            <p className="text-sm text-destructive text-center py-8">{loadError}</p>
          )}
          {!isLoading && !loadError && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No courses found
            </p>
          )}
          {!isLoading && !loadError && filtered.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer transition-colors hover:bg-accent/50 group"
              onClick={() => {
                setSelectedCourse(course);
                setWeekOffset(0);
              }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">{course.code}</p>
                  <p className="text-sm text-muted-foreground">{course.title}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Overview view for selected course
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => setSelectedCourse(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="h-3 w-3" />
            Change course
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {selectedCourse.code}
            <span className="font-normal text-muted-foreground text-lg ml-2">
              {selectedCourse.title}
            </span>
          </h1>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={() => setWeekOffset(0)}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors px-2 min-w-[180px] text-center"
          >
            {weekOffset === 0 ? "This week" : week.label}
          </button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">{week.label}</p>

      <DashboardPanels
        courseId={selectedCourse.id}
        rangeStartUtc={week.startUtcIso}
        rangeEndUtc={week.endUtcIso}
      />
    </div>
  );
}
