import { SessionTopBar } from '@/components/SessionTopBar';
import { AssistantPanel } from '@/components/AssistantPanel';
import { useSessionStore } from '@/stores/sessionStore';
import { Navigate } from 'react-router-dom';
import { Monitor, Volume2, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Session() {
  const { sessionStatus, selectedSource, includeAudio, setSessionStatus } = useSessionStore();

  if (sessionStatus !== 'active' && sessionStatus !== 'paused') {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex flex-col h-full">
      <SessionTopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Shared View */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="relative flex-1 rounded-xl bg-muted/30 border border-border flex items-center justify-center overflow-hidden">
            <div className="text-center space-y-3">
              <Monitor size={48} className="mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Sharing: <span className="text-foreground font-medium">{selectedSource?.name}</span>
              </p>
            </div>

            {/* Overlay badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className="bg-card/80 backdrop-blur text-xs gap-1 border-border">
                <Monitor size={10} />
                Sharing Screen
              </Badge>
              {includeAudio && (
                <Badge className="bg-card/80 backdrop-blur text-xs gap-1 border-border">
                  <Volume2 size={10} />
                  Audio On
                </Badge>
              )}
            </div>

            {/* Change source button */}
            <div className="absolute bottom-3 right-3">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 text-xs"
                onClick={() => setSessionStatus('source-picking')}
              >
                <ArrowRightLeft size={12} />
                Change Source
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Assistant Panel */}
        <div className="w-[380px] shrink-0">
          <AssistantPanel />
        </div>
      </div>
    </div>
  );
}
