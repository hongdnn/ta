import { useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { BookOpen, Plus, FileText, Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function Courses() {
  const { courses, addCourse, setActiveCourse, addMaterial, activeCourse } = useSessionStore();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    addCourse(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const handleAddMaterial = (courseId: string) => {
    // Simulated file picker
    const name = `material-${Date.now().toString(36)}.pdf`;
    addMaterial(courseId, name);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Courses</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Create Course
        </Button>
      </div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 rounded-lg bg-card border border-border"
        >
          <h3 className="text-sm font-medium mb-3">New Course</h3>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Course name"
              className="bg-muted border-border"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button size="sm" onClick={handleCreate}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {courses.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <BookOpen size={36} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No courses yet</p>
          <p className="text-xs text-muted-foreground/60">Create a course to organize your learning materials</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-muted-foreground" />
                  <span className="font-medium text-sm">{course.name}</span>
                  {activeCourse === course.id && (
                    <Badge className="bg-live/10 text-live text-[10px] gap-0.5">
                      <Check size={8} /> Active
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {activeCourse !== course.id && (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setActiveCourse(course.id)}>
                      Set Active
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => handleAddMaterial(course.id)}>
                    <Upload size={12} /> Add Material
                  </Button>
                </div>
              </div>

              {course.materials.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 italic">No materials added</p>
              ) : (
                <div className="space-y-1">
                  {course.materials.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText size={12} />
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
