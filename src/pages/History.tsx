import { useSessionStore } from '@/stores/sessionStore';
import { Clock, Trash2, Download, Filter, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function History() {
  const { historyItems, deleteHistoryItem } = useSessionStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = historyItems.find((i) => i.id === selectedId);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-3">History</h2>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Filter size={12} /> Course
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Filter size={12} /> Source
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Filter size={12} /> Tags
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <Clock size={32} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No saved items yet</p>
              <p className="text-xs text-muted-foreground/60">
                Capture moments during a session and save them here
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {historyItems.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedId === item.id ? 'bg-accent' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.question || 'Captured moment'}
                  </p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <FileText size={32} className="text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Select an item to view details</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Capture Detail</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  <Download size={12} /> Export
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-destructive hover:text-destructive"
                  onClick={() => { deleteHistoryItem(selected.id); setSelectedId(null); }}
                >
                  <Trash2 size={12} /> Delete
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Screenshot</label>
              <div className="aspect-video rounded-lg bg-muted/30 border border-border flex items-center justify-center">
                <Image size={32} className="text-muted-foreground/20" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Transcript</label>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Response</label>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
