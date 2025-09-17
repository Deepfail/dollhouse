import { uuid } from '@/lib/uuid';
import { useState } from 'react';

interface SceneSession {
  id: string;
  name: string;
  description?: string;
  participantIds: string[];
  type: 'scene';
  active: boolean;
  createdAt: Date;
}

export function useSceneMode() {
  const [activeSessions, setActiveSessions] = useState<SceneSession[]>([]);

  const createSceneSession = (participantIds: string[], options?: { name?: string; description?: string }) => {
    const sessionId = uuid();
    const session: SceneSession = {
      id: sessionId,
      name: options?.name || 'New Scene',
      description: options?.description,
      participantIds,
      type: 'scene',
      active: true,
      createdAt: new Date()
    };

    setActiveSessions(prev => [...prev, session]);
    return sessionId;
  };

  const updateSceneSession = (sessionId: string, updates: Partial<SceneSession>) => {
    setActiveSessions(prev =>
      prev.map(session =>
        session.id === sessionId ? { ...session, ...updates } : session
      )
    );
  };

  return {
    activeSessions,
    createSceneSession,
    updateSceneSession
  };
}
