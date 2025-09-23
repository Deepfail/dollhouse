import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useChat';
import { useState } from 'react';

export function SessionManager() {
  const { sessions, deleteSession, loadSessions, sessionsLoaded } = useChat();
  const [clearing, setClearing] = useState(false);

  const handleClearAll = async () => {
    if (!sessionsLoaded || clearing) return;
    setClearing(true);
    for (const s of sessions) {
      await deleteSession(s.id);
    }
    await loadSessions();
    setClearing(false);
  };

  return (
    <div className="p-4 bg-black/80 rounded-xl border border-white/10 text-white max-h-[60vh] overflow-y-auto min-w-[320px]">
      <div className="font-bold text-lg mb-2">Chat Sessions</div>
      <div className="mb-3 text-xs text-white/70">{sessions.length} sessions loaded</div>
      <ul className="mb-4 space-y-2">
        {sessions.map(s => (
          <li key={s.id} className="flex items-center justify-between gap-2 border-b border-white/5 pb-1">
            <div>
              <div className="font-mono text-xs">{s.id.slice(0, 8)}…</div>
              <div className="text-xs text-white/60">{s.type} | {s.context || 'Untitled'} | {s.messageCount} msgs</div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => deleteSession(s.id)} disabled={clearing}>Delete</Button>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="destructive" onClick={handleClearAll} disabled={clearing || sessions.length === 0}>
        {clearing ? 'Clearing…' : 'Clear All Sessions'}
      </Button>
    </div>
  );
}

export default SessionManager;
