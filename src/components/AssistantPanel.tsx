import { useEffect, useRef } from 'react';
import { Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/sessionStore';
import { motion } from 'framer-motion';
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
  const steps = ['CAPTURING', 'PROCESSING'];
  const current = steps.indexOf(step);

  return (
    <div className="flex flex-col gap-3 p-4">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
              i <= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {i < current ? <Check size={12} /> : i + 1}
          </div>
          <span
            className={cn(
              'text-sm font-medium',
              i <= current ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {s}
          </span>
          <div className="flex-1 h-0.5 bg-muted/70 rounded overflow-hidden">
            <div
              key={`${step}-line-${i}`}
              className={cn(
                'h-full bg-primary rounded',
                i < current && 'w-full',
                i === current && s === 'CAPTURING' && 'w-full stepper-progress',
                i === current && s === 'PROCESSING' && 'processing-progress',
                i > current && 'w-0'
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AssistantPanel() {
  const {
    assistantState,
    inputText,
    messages,
    setInputText,
    sendQuestion,
  } = useSessionStore();
  const listRef = useRef<HTMLDivElement | null>(null);

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

  const processingStep = useSessionStore((s) => s.processingStep);
  const visibleMessages = messages.filter((msg) => msg.role === 'user' || msg.text.trim().length > 0);
  const hasMessages = visibleMessages.length > 0;
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // Keep Codex-like browsing behavior, but auto-scroll when the user sends a new message.
  useEffect(() => {
    if (!lastMessage || lastMessage.role !== 'user') return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [lastMessage?.id, lastMessage?.role]);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Assistant</h3>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto">
        {!hasMessages && assistantState === 'idle' && (
          <div className="p-4 flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Send size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Ask Me</kbd> or type a question
            </p>
          </div>
        )}

        {hasMessages && (
          <div className="p-4 space-y-3">
            {visibleMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {(assistantState === 'capturing' || assistantState === 'processing') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pb-4"
          >
            <div className="rounded-xl bg-muted max-w-md">
              <ProcessingStepper step={processingStep} />
            </div>
          </motion.div>
        )}
      </div>

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

      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2 bg-muted rounded-lg px-3 py-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask WeMee... or press hotkey to capture this moment"
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
