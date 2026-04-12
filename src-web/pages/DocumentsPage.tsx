import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchMyCourses, type CourseItem } from "@web/api/catalog";
import {
  fetchCourseMaterials,
  fetchCourseMaterialViewUrl,
  uploadCourseMaterial,
  type CourseMaterial,
} from "@web/api/courseMaterials";

const ACCEPTED_FILE_TYPES = ".pdf,.txt,.md,.docx,.pptx";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function materialType(material: CourseMaterial) {
  const extension = material.file_name.split(".").pop();
  return extension ? extension.toUpperCase() : material.mime_type;
}

function sortMaterialsNewestFirst(items: CourseMaterial[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

function mergeMaterialsPreservingCurrentOrder(current: CourseMaterial[], incoming: CourseMaterial[]) {
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const mergedExisting = current
    .map((item) => incomingById.get(item.id))
    .filter((item): item is CourseMaterial => Boolean(item));
  const currentIds = new Set(current.map((item) => item.id));
  const newItems = sortMaterialsNewestFirst(incoming.filter((item) => !currentIds.has(item.id)));
  return [...newItems, ...mergedExisting];
}

export default function DocumentsPage() {
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(
    () => courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
  ),
    [courses, search]
  );

  useEffect(() => {
    setIsLoadingCourses(true);
    setLoadError(null);
    void fetchMyCourses()
      .then((items) => setCourses(items))
      .catch(() => setLoadError("Failed to load your courses."))
      .finally(() => setIsLoadingCourses(false));
  }, []);

  const loadMaterials = (courseId: string, options?: { quiet?: boolean }) => {
    if (!options?.quiet) {
      setIsLoadingMaterials(true);
    }
    setMaterialsError(null);
    void fetchCourseMaterials(courseId)
      .then((items) => {
        if (options?.quiet) {
          setMaterials((prev) => mergeMaterialsPreservingCurrentOrder(prev, items));
        } else {
          setMaterials(sortMaterialsNewestFirst(items));
        }
      })
      .catch(() => setMaterialsError("Failed to load course materials."))
      .finally(() => {
        if (!options?.quiet) {
          setIsLoadingMaterials(false);
        }
      });
  };

  useEffect(() => {
    if (!selectedCourse) {
      setMaterials([]);
      return;
    }
    loadMaterials(selectedCourse.id);
  }, [selectedCourse?.id]);

  useEffect(() => {
    if (!selectedCourse || !materials.some((item) => item.status === "processing")) {
      return;
    }
    const timer = window.setInterval(() => loadMaterials(selectedCourse.id, { quiet: true }), 3000);
    return () => window.clearInterval(timer);
  }, [selectedCourse?.id, materials]);

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!selectedCourse) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setIsUploading(true);
    setMaterialsError(null);
    try {
      for (const file of files) {
        const uploaded = await uploadCourseMaterial(selectedCourse.id, file);
        setMaterials((prev) => [uploaded, ...prev.filter((item) => item.id !== uploaded.id)]);
      }
    } catch {
      setMaterialsError("Upload failed. Check R2 and Chroma configuration, then try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      void handleUploadFiles(event.target.files);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleUploadFiles(event.dataTransfer.files);
  };

  const handleOpenMaterial = async (material: CourseMaterial) => {
    if (material.status !== "ready") return;
    try {
      const url = await fetchCourseMaterialViewUrl(material.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setMaterialsError("Failed to create a file view link.");
    }
  };

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
          {isLoadingCourses && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading courses...</p>
          )}
          {!isLoadingCourses && loadError && (
            <p className="text-sm text-destructive text-center py-8">{loadError}</p>
          )}
          {!isLoadingCourses && !loadError && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No courses found</p>
          )}
          {!isLoadingCourses && !loadError && filtered.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer transition-colors hover:bg-accent/50 group"
              onClick={() => { setSelectedCourse(course); setSearch(""); }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">{course.code}</p>
                  <p className="text-sm text-muted-foreground">{course.title}</p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">Manage materials</span>
                  <ChevronRight className="h-4 w-4 group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_FILE_TYPES}
        multiple
        onChange={handleFileInput}
      />

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
            <span className="font-normal text-muted-foreground text-lg ml-2">{selectedCourse.title} Documents</span>
          </h1>
        </div>
        <Button size="sm" className="gap-2" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          <Plus className="h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      <Card
        className={`border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, TXT, MD, DOCX, or PPTX teaching materials</p>
          </div>
          <Button variant="outline" size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
            Browse files
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {materialsError && (
            <p className="text-sm text-destructive py-2">{materialsError}</p>
          )}
          {isLoadingMaterials ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading documents...</p>
          ) : materials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
          ) : (
            materials.map((material) => (
              <button
                key={material.id}
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left disabled:cursor-default disabled:hover:bg-transparent"
                disabled={material.status !== "ready"}
                onClick={() => void handleOpenMaterial(material)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{material.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {materialType(material)} · {formatFileSize(material.file_size)} · {formatUploadedDate(material.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs rounded-full px-2 py-1 ${
                    material.status === "ready"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : material.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {material.status}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
