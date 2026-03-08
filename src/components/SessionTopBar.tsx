import { useEffect, useState } from 'react';
import { Camera, Pause, Play, Square, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/stores/sessionStore';
import { useNavigate } from 'react-router-dom';

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function SessionTopBar() {
  const {
    sessionStatus,
    sessionStartTime,
    stopSession,
    pauseSession,
    resumeSession,
    captureMoment,
    settings,
    bufferStatus,
    lastCaptureUpload,
    lastCaptureReason,
    activeCourseName,
  } = useSessionStore();
  const [elapsed, setElapsed] = useState(0);
  const navigate = useNavigate();
  const isPaused = sessionStatus === 'paused';

  useEffect(() => {
    if (!sessionStartTime || isPaused) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - sessionStartTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime, isPaused]);

  const handleStop = () => {
    stopSession();
    navigate('/home');
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border">
      <Badge variant="outline" className="text-xs bg-muted/50">
        {activeCourseName || 'No Course'}
      </Badge>

      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-live live-pulse" />
        <span className="text-xs font-semibold text-live">LIVE</span>
      </div>

      <span className="text-xs font-mono text-muted-foreground">{formatTime(elapsed)}</span>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Keyboard size={12} />
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">{settings.hotkey}</kbd>
      </div>

      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        Last {settings.captureDuration}s
      </Badge>

      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        Audio Buffer: {bufferStatus}
      </Badge>

      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        Upload: {lastCaptureUpload}
      </Badge>

      {lastCaptureReason && (
        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
          {lastCaptureReason}
        </Badge>
      )}

      <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={captureMoment}>
        <Camera size={14} />
        Capture Moment
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="text-xs"
        onClick={isPaused ? resumeSession : pauseSession}
      >
        {isPaused ? <Play size={14} /> : <Pause size={14} />}
      </Button>

      <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={handleStop}>
        <Square size={14} />
      </Button>
    </div>
  );
}
