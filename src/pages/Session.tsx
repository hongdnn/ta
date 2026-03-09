import { SessionTopBar } from '@/components/SessionTopBar';
import { AssistantPanel } from '@/components/AssistantPanel';
import { useSessionStore } from '@/stores/sessionStore';
import { Navigate } from 'react-router-dom';

export default function Session() {
  const { sessionStatus } = useSessionStore();

  if (sessionStatus !== 'active') {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex flex-col h-full">
      <SessionTopBar />
      <div className="flex flex-1 overflow-hidden p-4">
        <div className="w-full rounded-xl border border-border bg-card/30 overflow-hidden">
          <AssistantPanel />
        </div>
      </div>
    </div>
  );
}
