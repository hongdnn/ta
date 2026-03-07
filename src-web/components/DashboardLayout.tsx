import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  GraduationCap,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { mockCourses } from "../data/mockCourses";

const navItems = [
  { path: "overview", icon: LayoutDashboard, label: "Overview" },
  { path: "documents", icon: FileText, label: "Documents" },
  { path: "profile", icon: User, label: "Profile" },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const course = mockCourses.find((c) => c.id === courseId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex flex-col w-60 border-r border-border bg-card">
        {/* Header */}
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={() => navigate("/courses")}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors w-full"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All Courses
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {course?.code ?? "Course"}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {course?.name ?? ""}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={`/dashboard/${courseId}/${path}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-4">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
