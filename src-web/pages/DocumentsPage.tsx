import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Trash2, Plus } from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
}

const mockDocuments: Document[] = [
  { id: "1", name: "Lecture 1 - Introduction.pdf", type: "PDF", uploadedAt: "Feb 24, 2025" },
  { id: "2", name: "Lecture 2 - Recursion.pdf", type: "PDF", uploadedAt: "Feb 26, 2025" },
  { id: "3", name: "Homework 1 Solutions.docx", type: "DOCX", uploadedAt: "Feb 28, 2025" },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);

  const handleRemove = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage teaching materials for this course
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Upload area */}
      <Card className="border-dashed">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, PPTX, or any teaching material
            </p>
          </div>
          <Button variant="outline" size="sm">
            Browse files
          </Button>
        </CardContent>
      </Card>

      {/* Document list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No documents uploaded yet
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · {doc.uploadedAt}
                    </p>
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
