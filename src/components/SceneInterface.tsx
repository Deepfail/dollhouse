import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useSceneMode } from '@/hooks/useSceneMode';
import { getDb } from '@/lib/db';
import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { ChatInterface } from './ChatInterface';

interface SceneInterfaceProps {
  sessionId?: string;
  onClose?: () => void;
}

export function SceneInterface({ sessionId, onClose }: SceneInterfaceProps) {
  const { activeSessions, updateSceneGoal } = useSceneMode();
  const { updateSessionGoal } = useChat();
  const { characters } = useHouseFileStorage();
  const session = activeSessions.find(s => s.id === sessionId);
  const participants = (characters || []).filter(c => session?.participantIds.includes(c.id));
  const [chatSessionId, setChatSessionId] = useState<string | null>(session?.chatSessionId || null);

  // Attempt to hydrate hiddenGoals and chat link from DB if not present in-memory
  useEffect(() => {
    (async () => {
      try {
        if (!session) return;
        const { db } = await getDb();
        // Hydrate chat link if missing
        if (!chatSessionId) {
          const keyLink = `scene_chat:${sessionId}`;
          const rowsLink: any[] = [];
          db.exec({ sql: 'SELECT value FROM settings WHERE key = ?', bind: [keyLink], rowMode: 'object', callback: (r: any) => rowsLink.push(r) });
          if (rowsLink.length > 0) {
            try {
              const parsed = JSON.parse(rowsLink[0].value || '{}');
              if (parsed?.chatSessionId) {
                setChatSessionId(parsed.chatSessionId);
              }
            } catch (error) {
              console.error('Failed to parse scene chat link', error);
            }
          }
        }
        // Hidden goals hydration (no-op if already present)
        if (!(session.hiddenGoals && Object.keys(session.hiddenGoals).length > 0)) {
          const key = `scene_goals:${sessionId}`;
          const rows: any[] = [];
          db.exec({ sql: 'SELECT value FROM settings WHERE key = ?', bind: [key], rowMode: 'object', callback: (r: any) => rows.push(r) });
          if (rows.length > 0) {
            // Parsed goals are available if needed for future sync.
            try {
              JSON.parse(rows[0].value || '{}');
            } catch (error) {
              console.error('Failed to parse scene goals', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to hydrate scene session info', error);
      }
    })();
  }, [session, sessionId, chatSessionId]);

  if (!session) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Scene not found or has ended.
        <div className="mt-3">
          <Button variant="outline" onClick={onClose}><ArrowLeft size={14} className="mr-1"/>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h2 className="text-xl font-semibold">{session.name}</h2>
          {session.description && (
            <div className="text-sm text-muted-foreground">{session.description}</div>
          )}
        </div>
        <Button variant="outline" onClick={onClose}><ArrowLeft size={14} className="mr-1"/>Back</Button>
      </div>

      {/* Chat fills remaining space; ChatInterface handles Director toggle and participants in-header */}
      {chatSessionId && (
        <div className="flex-1 min-h-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 overflow-hidden">
          <ChatInterface sessionId={chatSessionId} />
        </div>
      )}
    </div>
  );
}
