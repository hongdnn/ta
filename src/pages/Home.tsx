import { Play, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/sessionStore';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { fetchCoursesByInstitution, fetchInstitutions, type CourseItem, type InstitutionItem } from '@/api/catalog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


export default function Home() {
  const { setSessionStatus, sessionStatus, setSessionContext } = useSessionStore();
  const [showSetup, setShowSetup] = useState(false);
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [institutionId, setInstitutionId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedInstitution = useMemo(
    () => institutions.find((item) => item.id === institutionId) ?? null,
    [institutions, institutionId]
  );
  const selectedCourse = useMemo(
    () => courses.find((item) => item.id === courseId) ?? null,
    [courses, courseId]
  );

  const handleStart = () => {
    if (!showSetup) {
      setShowSetup(true);
      return;
    }
    if (!selectedInstitution || !selectedCourse) return;
    setSessionContext({
      institutionId: selectedInstitution.id,
      institutionName: selectedInstitution.name,
      courseId: selectedCourse.id,
      courseName: selectedCourse.title,
    });
    setSessionStatus('source-picking');
  };

  useEffect(() => {
    if (!showSetup) return;
    setIsLoadingInstitutions(true);
    setLoadError(null);
    void fetchInstitutions()
      .then((items) => setInstitutions(items))
      .catch(() => {
        setLoadError('Failed to load institutions from backend.');
      })
      .finally(() => setIsLoadingInstitutions(false));
  }, [showSetup]);

  useEffect(() => {
    if (!institutionId) {
      setCourses([]);
      setCourseId('');
      return;
    }
    setIsLoadingCourses(true);
    setLoadError(null);
    setCourseId('');
    void fetchCoursesByInstitution(institutionId)
      .then((items) => setCourses(items))
      .catch(() => {
        setLoadError('Failed to load courses for the selected institution.');
        setCourses([]);
      })
      .finally(() => setIsLoadingCourses(false));
  }, [institutionId]);

  // If session is active, go straight to session screen.
  if (sessionStatus === 'active' || sessionStatus === 'paused') {
    return <Navigate to="/session" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6 max-w-md"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Play size={28} className="text-primary ml-1" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Start a Learning Session</h1>
          <p className="text-sm text-muted-foreground">
            Share your screen and let TA help you understand what you're learning.
          </p>
        </div>

        {showSetup && (
          <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4 text-left">
            <p className="text-xs font-medium text-muted-foreground">Step 1: Select Institution</p>
            <Select
              value={institutionId}
              onValueChange={setInstitutionId}
              disabled={isLoadingInstitutions}
            >
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={isLoadingInstitutions ? 'Loading institutions...' : 'Choose institution'}
                />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((institution) => (
                  <SelectItem key={institution.id} value={institution.id}>
                    {institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs font-medium text-muted-foreground pt-1">Step 2: Select Course</p>
            <Select
              value={courseId}
              onValueChange={setCourseId}
              disabled={!institutionId || isLoadingCourses}
            >
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={
                    !institutionId
                      ? 'Choose institution first'
                      : isLoadingCourses
                        ? 'Loading courses...'
                        : 'Choose course'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {loadError && <p className="text-xs text-destructive">{loadError}</p>}
          </div>
        )}

        <Button
          size="lg"
          className="w-full gap-2 text-base"
          onClick={handleStart}
          disabled={showSetup && (!selectedInstitution || !selectedCourse)}
        >
          <Play size={18} />
          Start Session
        </Button>

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Shield size={14} className="shrink-0 mt-0.5" />
          <span>TA only analyzes moments when you press Capture or send a question.</span>
        </div>
      </motion.div>
    </div>
  );
}
