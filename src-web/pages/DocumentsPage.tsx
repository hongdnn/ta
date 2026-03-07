import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Trash2, Plus, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { mockCourses, type Course } from "../data/mockCourses";

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
}

const mockDocsByCourse: Record<string, Document[]> = {
  cs201: [
    { id: "1", name: "Lecture 1 - Introduction.pdf", type: "PDF", uploadedAt: "Feb 24, 2025" },
    { id: "2", name: "Lecture 2 - Recursion.pdf", type: "PDF", uploadedAt: "Feb 26, 2025" },
    { id: "3", name: "Homework 1 Solutions.docx", type: "DOCX", uploadedAt: "Feb 28, 2025" },
  ],
  cs301: [
    { id: "4", name: "OS Intro Slides.pptx", type: "PPTX", uploadedAt: "Feb 25, 2025" },
  ],
  cs401: [],
};

export default function DocumentsPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState(mockDocsByCourse);

  const filtered = mockCourses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = (id: string) => {
    if (!selectedCourse) return;
    setDocuments((prev) => ({
      ...prev,
      [selectedCourse.id]: (prev[selectedCourse.id] || []).filter((d) => d.id !== id),
    }));
  };

  const courseDocs = selectedCourse ? documents[selectedCourse.id] || [] : [];

  // Course selector
  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a course to manage its teaching materials
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
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No courses found</p>
          )}
          {filtered.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer transition-colors hover:bg-accent/50 group"
              onClick={() => { setSelectedCourse(course); setSearch(""); }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">{course.code}</p>
                  <p className="text-sm text-muted-foreground">{course.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{course.semester}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.students}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">{(documents[course.id] || []).length} files</span>
                  <ChevronRight className="h-4 w-4 group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Documents view for selected course
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
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
            <span className="font-normal text-muted-foreground text-lg ml-2">Documents</span>
          </h1>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Upload
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, or any teaching material</p>
          </div>
          <Button variant="outline" size="sm">Browse files</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {courseDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
          ) : (
            courseDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.type} · {doc.uploadedAt}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
