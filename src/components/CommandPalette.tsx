import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Home, Radio, Clock, BookOpen, Settings, Camera } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { cn } from '@/lib/utils';

const commands = [
  { id: 'home', label: 'Go to Home', icon: Home, path: '/home' },
  { id: 'session', label: 'Go to Session', icon: Radio, path: '/session', requiresSession: true },
  { id: 'history', label: 'Go to History', icon: Clock, path: '/history' },
  { id: 'courses', label: 'Go to Courses', icon: BookOpen, path: '/courses' },
  { id: 'settings', label: 'Open Settings', icon: Settings, path: '/settings' },
  { id: 'capture', label: 'Capture Moment', icon: Camera, action: 'capture', requiresSession: true },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { sessionStatus, captureMoment } = useSessionStore();
  const isActive = sessionStatus === 'active';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = commands.filter((c) => {
    if (c.requiresSession && !isActive) return false;
    return c.label.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (cmd: typeof commands[0]) => {
    if (cmd.action === 'capture') {
      captureMoment();
    } else if (cmd.path) {
      navigate(cmd.path);
    }
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-md bg-card border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command…"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
          />
        </div>
        <div className="p-1 max-h-64 overflow-auto">
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => handleSelect(cmd)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-foreground',
                'hover:bg-accent transition-colors'
              )}
            >
              <cmd.icon size={16} className="text-muted-foreground" />
              {cmd.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results</p>
          )}
        </div>
        <div className="px-3 py-2 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">↑↓</kbd>
          Navigate
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] ml-2">↵</kbd>
          Select
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] ml-2">Esc</kbd>
          Close
        </div>
      </DialogContent>
    </Dialog>
  );
}
