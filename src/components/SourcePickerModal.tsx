import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Monitor, AppWindow, Globe, Volume2 } from 'lucide-react';
import { useSessionStore, SharedSource } from '@/stores/sessionStore';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type ShareSource = SharedSource & { thumbnail?: string };

const iconMap = { screen: Monitor, window: AppWindow, tab: Globe };

export function SourcePickerModal() {
  const { sessionStatus, setSessionStatus, setSelectedSource, includeAudio, setIncludeAudio, audioSource, setAudioSource, startSession } = useSessionStore();
  const [selected, setSelected] = useState<ShareSource | null>(null);
  const [sources, setSources] = useState<ShareSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [reloadTick, setReloadTick] = useState(0);
  const navigate = useNavigate();
  const open = sessionStatus === 'source-picking';

  const sourceMap = useMemo(
    () => ({
      screen: sources.filter((s) => s.type === 'screen'),
      window: sources.filter((s) => s.type === 'window'),
      tab: [] as ShareSource[],
    }),
    [sources]
  );

  useEffect(() => {
    if (!open || !window.taAPI) return;

    const loadSources = async () => {
      setIsLoadingSources(true);
      setSourceError(null);
      try {
        let status = await window.taAPI.getScreenPermissionStatus();
        setPermissionStatus(status);

        if (status !== 'granted') {
          status = await window.taAPI.requestScreenPermission();
          setPermissionStatus(status);
        }

        if (status !== 'granted') {
          setSources([]);
          setSourceError(
            status === 'denied' || status === 'restricted'
              ? 'Screen access was denied. Open System Settings to allow screen recording for this app.'
              : 'Screen access is required to list share sources. Please allow access when prompted.'
          );
          return;
        }

        const raw = await window.taAPI?.listShareSources();
        const normalized = Array.isArray(raw)
          ? raw.filter((item): item is ShareSource => {
              if (!item || typeof item !== 'object') return false;
              const value = item as ShareSource;
              return !!value.id && !!value.name && (value.type === 'screen' || value.type === 'window');
            })
          : [];
        setSources(normalized);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('SCREEN_PERMISSION_')) {
          const status = message.replace('SCREEN_PERMISSION_', '');
          setPermissionStatus(status);
        }
        setSourceError('Unable to load share sources. Check system permissions and try again.');
      } finally {
        setIsLoadingSources(false);
      }
    };

    void loadSources();
  }, [open, reloadTick]);

  const handleClose = () => {
    setSessionStatus('idle');
    setSelected(null);
  };

  const handleContinue = async () => {
    if (!selected) return;
    setSelectedSource({ id: selected.id, type: selected.type, name: selected.name });
    await startSession();
    navigate('/session');
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg bg-card border-border p-0 gap-0">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="text-lg">Select what to share</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="screen" className="p-5 pt-4">
          <TabsList className="w-full bg-muted">
            <TabsTrigger value="screen" className="flex-1 text-xs">Entire Screen</TabsTrigger>
            <TabsTrigger value="window" className="flex-1 text-xs">Application Window</TabsTrigger>
            <TabsTrigger value="tab" className="flex-1 text-xs">Browser Tab</TabsTrigger>
          </TabsList>

          {Object.entries(sourceMap).map(([key, items]) => {
            const Icon = iconMap[key as keyof typeof iconMap];
            return (
              <TabsContent key={key} value={key} className="mt-4">
                {key === 'tab' && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Browser-tab enumeration is not available in this desktop shell. Use Entire Screen or Application Window.
                  </div>
                )}
                {sourceError && key !== 'tab' && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-2">
                    <p>{sourceError}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-[11px]"
                        onClick={() => void window.taAPI?.openScreenPermissionSettings()}
                      >
                        Open System Settings
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => setReloadTick((value) => value + 1)}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
                <div className="max-h-[340px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                  {isLoadingSources && key !== 'tab' && (
                    <>
                      <div className="rounded-lg border border-border p-3">
                        <Skeleton className="aspect-video w-full rounded mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <Skeleton className="aspect-video w-full rounded mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </>
                  )}
                  {items.map((src) => (
                    <button
                      key={src.id}
                      onClick={() => setSelected(src)}
                      className={cn(
                        'rounded-lg border-2 p-3 transition-all duration-150 text-left',
                        selected?.id === src.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground/30 bg-muted/50'
                      )}
                    >
                      {src.thumbnail ? (
                        <img
                          src={src.thumbnail}
                          alt={src.name}
                          className="aspect-video w-full object-cover rounded bg-background/50 mb-2"
                        />
                      ) : (
                        <div className="aspect-video rounded bg-background/50 mb-2 flex items-center justify-center">
                          <Icon size={28} className="text-muted-foreground/40" />
                        </div>
                      )}
                      <p className="text-xs font-medium truncate">{src.name}</p>
                    </button>
                  ))}
                  {!isLoadingSources && items.length === 0 && (
                    <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                      {permissionStatus === 'granted'
                        ? 'No sources available in this category.'
                        : 'Grant screen access to show available sources.'}
                    </div>
                  )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <DialogFooter className="p-5 pt-0 flex-row items-center gap-4 border-t border-border mt-0 pt-4">
          <div className="flex items-center gap-2 flex-1">
            <Switch checked={includeAudio} onCheckedChange={setIncludeAudio} />
            <Volume2 size={14} className="text-muted-foreground" />
            <Select value={audioSource} onValueChange={setAudioSource}>
              <SelectTrigger className="h-8 w-36 text-xs bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System Audio</SelectItem>
                <SelectItem value="mic">Microphone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
            <Button size="sm" disabled={!selected} onClick={() => void handleContinue()}>
              Share & Continue
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
