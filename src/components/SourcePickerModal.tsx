import { useState } from 'react';
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

const sources: Record<string, SharedSource[]> = {
  screen: [
    { id: 's1', type: 'screen', name: 'Screen 1' },
    { id: 's2', type: 'screen', name: 'Screen 2' },
  ],
  window: [
    { id: 'w1', type: 'window', name: 'Zoom' },
    { id: 'w2', type: 'window', name: 'Google Chrome' },
    { id: 'w3', type: 'window', name: 'VS Code' },
  ],
  tab: [
    { id: 't1', type: 'tab', name: 'Lecture Video' },
    { id: 't2', type: 'tab', name: 'Course Notes' },
  ],
};

const iconMap = { screen: Monitor, window: AppWindow, tab: Globe };

export function SourcePickerModal() {
  const { sessionStatus, setSessionStatus, setSelectedSource, includeAudio, setIncludeAudio, audioSource, setAudioSource } = useSessionStore();
  const [selected, setSelected] = useState<SharedSource | null>(null);
  const open = sessionStatus === 'source-picking';

  const handleClose = () => {
    setSessionStatus('idle');
    setSelected(null);
  };

  const handleContinue = () => {
    if (!selected) return;
    setSelectedSource(selected);
    setSessionStatus('consenting');
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

          {Object.entries(sources).map(([key, items]) => {
            const Icon = iconMap[key as keyof typeof iconMap];
            return (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="grid grid-cols-2 gap-3">
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
                      <div className="aspect-video rounded bg-background/50 mb-2 flex items-center justify-center">
                        <Icon size={28} className="text-muted-foreground/40" />
                      </div>
                      <p className="text-xs font-medium truncate">{src.name}</p>
                    </button>
                  ))}
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
            <Button size="sm" disabled={!selected} onClick={handleContinue}>
              Share & Continue
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
