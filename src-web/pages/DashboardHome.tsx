import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DashboardPanels } from "../components/DashboardPanels";
import { fetchMyCourses, type CourseItem } from "@web/api/catalog";

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  });
  const zonePart = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = zonePart.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

function addDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function zonedLocalDateTimeToUtc(
  parts: { year: number; month: number; day: number },
  timeZone: string,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
) {
  let utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes, seconds, ms);
  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcMs), timeZone);
    const nextUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes, seconds, ms) - offsetMinutes * 60_000;
    if (nextUtcMs === utcMs) break;
    utcMs = nextUtcMs;
  }
  return new Date(utcMs);
}

function getWeekRange(offset: number, baseNow: Date, timeZone: string) {
  const now = baseNow;
  const localParts = getLocalDateParts(now, timeZone);
  const mondayLocalParts = addDays(localParts, -localParts.weekday + offset * 7);
  const sundayLocalParts = addDays(mondayLocalParts, 6);
  const nextMondayLocalParts = addDays(mondayLocalParts, 7);
  const monday = zonedLocalDateTimeToUtc(mondayLocalParts, timeZone);
  const nextMonday = zonedLocalDateTimeToUtc(nextMondayLocalParts, timeZone);
  const endLocal = offset === 0 ? now : nextMonday;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
  return {
    startUtcIso: monday.toISOString(),
    endUtcIso: endLocal.toISOString(),
    label: `${fmt(monday)} – ${fmt(zonedLocalDateTimeToUtc(sundayLocalParts, timeZone))}, ${sundayLocalParts.year}`,
  };
}

export default function DashboardHome() {
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const analyticsTimezone = selectedCourse?.institution_timezone || "UTC";
  const week = useMemo(
    () => getWeekRange(weekOffset, weekAnchor, analyticsTimezone),
    [weekOffset, weekAnchor, analyticsTimezone]
  );

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
                setWeekAnchor(new Date());
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
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setWeekOffset((o) => o - 1);
              setWeekAnchor(new Date());
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={() => {
              setWeekOffset(0);
              setWeekAnchor(new Date());
            }}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors px-2 min-w-[180px] text-center"
          >
            {weekOffset === 0 ? "This week" : week.label}
          </button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setWeekOffset((o) => o + 1);
              setWeekAnchor(new Date());
            }}
            disabled={weekOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">{week.label}</p>

      <DashboardPanels
        courseId={selectedCourse.id}
        rangeStartUtc={week.startUtcIso}
        rangeEndUtc={week.endUtcIso}
        timezone={analyticsTimezone}
      />
    </div>
  );
}
