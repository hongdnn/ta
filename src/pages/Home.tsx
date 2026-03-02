import { Play, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/sessionStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Home() {
  const { setSessionStatus, courses, sessionStatus } = useSessionStore();
  const navigate = useNavigate();

  const handleStart = () => {
    setSessionStatus('source-picking');
  };

  // If session is active, redirect to session
  if (sessionStatus === 'active' || sessionStatus === 'paused') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-live live-pulse" />
            <span className="text-sm font-semibold text-live">Session Active</span>
          </div>
          <Button onClick={() => navigate('/session')}>Go to Session</Button>
        </motion.div>
      </div>
    );
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

        <Select>
          <SelectTrigger className="w-full bg-muted border-border">
            <SelectValue placeholder="Select a course (optional)" />
          </SelectTrigger>
          <SelectContent>
            {courses.length === 0 && (
              <SelectItem value="none" disabled>No courses yet</SelectItem>
            )}
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="lg" className="w-full gap-2 text-base" onClick={handleStart}>
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
