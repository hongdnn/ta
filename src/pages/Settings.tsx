import { useSessionStore } from '@/stores/sessionStore';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function Settings() {
  const { settings, updateSettings } = useSessionStore();

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* Hotkey */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Global Hotkey</label>
        <Input
          value={settings.hotkey}
          onChange={(e) => updateSettings({ hotkey: e.target.value })}
          className="bg-muted border-border font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">Keyboard shortcut to capture a moment during a session</p>
      </div>

      <Separator />

      {/* Capture Duration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Capture Duration</label>
          <span className="text-sm font-mono text-muted-foreground">{settings.captureDuration}s</span>
        </div>
        <Slider
          value={[settings.captureDuration]}
          onValueChange={([v]) => updateSettings({ captureDuration: v })}
          min={5}
          max={45}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>5s</span>
          <span>45s</span>
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Include Audio</p>
            <p className="text-xs text-muted-foreground">Capture audio with screen</p>
          </div>
          <Switch checked={settings.includeAudio} onCheckedChange={(v) => updateSettings({ includeAudio: v })} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Compact Mini Panel</p>
            <p className="text-xs text-muted-foreground">Smaller floating panel during sessions</p>
          </div>
          <Switch checked={settings.compactMiniPanel} onCheckedChange={(v) => updateSettings({ compactMiniPanel: v })} />
        </div>
      </div>

      <Separator />

      {/* Privacy */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Privacy</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Local-only Mode</p>
            <p className="text-xs text-muted-foreground">Keep all data on this device</p>
          </div>
          <Switch checked={settings.localOnly} onCheckedChange={(v) => updateSettings({ localOnly: v })} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto-save Captures</p>
            <p className="text-xs text-muted-foreground">Automatically save captured moments to history</p>
          </div>
          <Switch checked={settings.autoSaveCaptures} onCheckedChange={(v) => updateSettings({ autoSaveCaptures: v })} />
        </div>
      </div>
    </div>
  );
}
