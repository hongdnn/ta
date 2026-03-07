import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, ArrowRight } from "lucide-react";
import { mockCourses } from "../data/mockCourses";

export default function CourseSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Select a Course</h1>
          <p className="text-sm text-muted-foreground">
            Choose a course to view its dashboard and analytics
          </p>
        </div>

        <div className="space-y-3">
          {mockCourses.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer transition-colors hover:bg-accent/50 group"
              onClick={() => navigate(`/dashboard/${course.id}/overview`)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{course.code}</p>
                  <p className="text-sm text-muted-foreground">{course.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{course.semester}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.students} students
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
