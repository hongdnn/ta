import { useState } from 'react';
import { Send, Save, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/stores/sessionStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const suggestedPrompts = [
  'Explain',
  'Explain simpler',
  'Explain deeper',
  'Summarize',
  'What should I focus on?',
  'Give me a hint',
];

function ProcessingStepper({ step }: { step: string }) {
  const steps = ['CAPTURING', 'PROCESSING', 'DONE'];
  const current = steps.indexOf(step);

  return (
    <div className="flex flex-col gap-3 p-4">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
            i <= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {i < current ? <Check size={12} /> : i + 1}
          </div>
          <span className={cn(
            'text-sm font-medium',
            i <= current ? 'text-foreground' : 'text-muted-foreground'
          )}>{s}</span>
          {i === current && i < steps.length - 1 && (
            <div className="flex-1 h-0.5 bg-muted rounded overflow-hidden">
              <div className="h-full bg-primary stepper-progress rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ResultLayout() {
  const addHistoryItem = useSessionStore((s) => s.addHistoryItem);

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Inferred Question</label>
        <div className="p-3 rounded-lg bg-muted/50 border border-border min-h-[40px]">
          <span className="text-sm text-muted-foreground/50 italic">No question inferred yet</span>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Short Hint</label>
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Step-by-step Guidance</label>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">What to Check Next</label>
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Citations</label>
        <p className="text-xs text-muted-foreground/50 italic">No citations available</p>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => addHistoryItem({ type: 'capture', question: '', courseName: '' })}
        >
          <Save size={14} /> Save to History
        </Button>
        <Button size="sm" variant="ghost" disabled className="gap-1.5">
          <Copy size={14} /> Copy
        </Button>
      </div>
    </div>
  );
}

function ThreadView() {
  return (
    <div className="px-4 py-2 space-y-3">
      <Badge variant="outline" className="text-[10px]">Context: Captured Moment</Badge>
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-primary/15 px-3 py-2">
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-muted px-3 py-2 space-y-1.5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssistantPanel() {
  const { assistantState, processingStep, inputText, setInputText, sendQuestion, captureMoment } = useSessionStore();
  const [showThread, setShowThread] = useState(false);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendQuestion(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Assistant</h3>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {assistantState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 flex flex-col items-center justify-center h-full gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Send size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Capture</kbd> or type a question
              </p>
            </motion.div>
          )}

          {(assistantState === 'capturing' || assistantState === 'processing') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {assistantState === 'capturing' && (
                <div className="p-6 flex flex-col items-center gap-3">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary" />
                  </motion.div>
                  <p className="text-sm font-medium text-foreground">Capturing…</p>
                </div>
              )}
              <ProcessingStepper step={processingStep} />
            </motion.div>
          )}

          {assistantState === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ResultLayout />
              {showThread && <ThreadView />}
              {!showThread && (
                <div className="px-4 pb-2">
                  <button
                    onClick={() => setShowThread(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Show follow-up thread
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggested prompts */}
      {(assistantState === 'idle' || assistantState === 'result') && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-border">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              onClick={() => sendQuestion(p)}
              className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2 bg-muted rounded-lg px-3 py-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask TA… or press hotkey to capture this moment"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-20"
            rows={1}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
