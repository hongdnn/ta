import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export function ConsentModal() {
  const { sessionStatus, setSessionStatus, startSession, selectedSource } = useSessionStore();
  const [agreed, setAgreed] = useState(false);
  const open = sessionStatus === 'consenting';

  const handleClose = () => {
    setSessionStatus('idle');
    setAgreed(false);
  };

  const handleStart = () => {
    if (!agreed) return;
    startSession();
    setAgreed(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield size={24} className="text-primary" />
          </div>
          <DialogTitle className="text-center">Confirm Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            TA will access <span className="text-foreground font-medium">{selectedSource?.name}</span> and audio during this session.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            TA only analyzes moments when you press Capture or send a question.
          </p>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              I understand and want to start this session.
            </span>
          </label>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={handleClose}>Cancel</Button>
          <Button className="flex-1" disabled={!agreed} onClick={handleStart}>
            Start Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
