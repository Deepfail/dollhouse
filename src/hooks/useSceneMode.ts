import { getDb, saveDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import { uuid } from '@/lib/uuid';
import { useEffect, useState } from 'react';

interface SceneSession {
  id: string;
  name: string;
  description?: string;
  participantIds: string[];
  type: 'scene';
  active: boolean;
  createdAt: Date;
  hiddenGoals?: Record<string, { goal: string; priority: 'low' | 'medium' | 'high' }>;
  chatSessionId?: string;
  playerPrompt?: string;
  locationId?: string; // ID of the location where scene takes place
}

export function useSceneMode() {
  const [activeSessions, setActiveSessions] = useState<SceneSession[]>([]);

  // Load persisted scene sessions on mount so independent hook instances see the same data
  useEffect(() => {
    (async () => {
      try {
        const { db } = await getDb();
        const rows: { key: string; value: string }[] = [];
        db.exec({
          sql: "SELECT key, value FROM settings WHERE key LIKE 'scene_session:%'",
          rowMode: 'object',
          callback: (r: unknown) => rows.push(r as { key: string; value: string })
        });
        const sessions: SceneSession[] = [];
        for (const r of rows) {
          try {
            const parsed = JSON.parse(r.value || '{}');
            // Basic validation
            if (parsed && parsed.id && parsed.type === 'scene') {
              // Deserialize dates
              parsed.createdAt = parsed.createdAt ? new Date(parsed.createdAt) : new Date();
              sessions.push(parsed as SceneSession);
            }
          } catch (parseErr) {
            logger.warn('Failed to parse scene session', parseErr);
          }
        }
        if (sessions.length) setActiveSessions(sessions.filter(s => s.active !== false));
      } catch (e) {
        logger.warn('Failed to load scene sessions from settings', e);
      }
    })();
  }, []);

  const createSceneSession = (
    participantIds: string[],
    options?: {
      name?: string;
      description?: string;
      hiddenGoals?: Record<string, { goal: string; priority: 'low' | 'medium' | 'high' }>;
      chatSessionId?: string;
      playerPrompt?: string;
      locationId?: string; // Location where scene takes place
    }
  ) => {
    const sessionId = uuid();
    const session: SceneSession = {
      id: sessionId,
      name: options?.name || 'New Scene',
      description: options?.description,
      participantIds,
      type: 'scene',
      active: true,
      createdAt: new Date(),
      hiddenGoals: options?.hiddenGoals,
      chatSessionId: options?.chatSessionId,
      playerPrompt: options?.playerPrompt,
      locationId: options?.locationId
    };

    setActiveSessions(prev => [...prev, session]);
    setActiveSessions(prev => [...prev, session]);

    // Persist the scene session record itself for cross-mount visibility
    (async () => {
      try {
        const { db } = await getDb();
        const key = `scene_session:${sessionId}`;
        const serialized = JSON.stringify({
          ...session,
          // Ensure date is serialized
          createdAt: session.createdAt.toISOString()
        });
        const before: { c: number }[] = [];
        db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => before.push(r as { c: number }) });
        db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serialized, key] });
        const after: { c: number }[] = [];
        db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => after.push(r as { c: number }) });
        const changed = (after[0]?.c ?? 0) - (before[0]?.c ?? 0);
        if (changed === 0) {
          db.exec({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', bind: [key, serialized] });
        }
        await saveDatabase();
      } catch (e) {
        logger.warn('Failed to persist scene session:', e);
      }
    })();

    // Persist hidden goals in DB settings for durability
    if (options?.hiddenGoals && Object.keys(options.hiddenGoals).length > 0) {
      (async () => {
        try {
          const { db } = await getDb();
          const key = `scene_goals:${sessionId}`;
          const serialized = JSON.stringify(options.hiddenGoals);
          // Upsert into settings
          const before: { c: number }[] = [];
          db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => before.push(r as { c: number }) });
          db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serialized, key] });
          const after: { c: number }[] = [];
          db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => after.push(r as { c: number }) });
          const changed = (after[0]?.c ?? 0) - (before[0]?.c ?? 0);
          if (changed === 0) {
            db.exec({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', bind: [key, serialized] });
          }
          await saveDatabase();
        } catch (e) {
          logger.warn('Failed to persist scene hidden goals:', e);
        }
      })();
    }
    return sessionId;
  };

  const updateSceneSession = (sessionId: string, updates: Partial<SceneSession>) => {
    setActiveSessions(prev => {
      const next = prev.map(session => (session.id === sessionId ? { ...session, ...updates } : session));
      // Persist updated session record
      const target = next.find(s => s.id === sessionId);
      if (target) {
        (async () => {
          try {
            const { db } = await getDb();
            const key = `scene_session:${sessionId}`;
            const serialized = JSON.stringify({ ...target, createdAt: target.createdAt.toISOString?.() || target.createdAt });
            const before: { c: number }[] = [];
            db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => before.push(r as { c: number }) });
            db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serialized, key] });
            const after: { c: number }[] = [];
            db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => after.push(r as { c: number }) });
            const changed = (after[0]?.c ?? 0) - (before[0]?.c ?? 0);
            if (changed === 0) {
              db.exec({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', bind: [key, serialized] });
            }
            await saveDatabase();
          } catch (e) {
            logger.warn('Failed to persist updated scene session', e);
          }
        })();
      }
      return next;
    });
  };

  const updateSceneGoal = async (
    sceneId: string,
    characterId: string,
    goalText: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    // Update in-memory state first
    setActiveSessions(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      const nextGoals = { ...(s.hiddenGoals || {}) } as Record<string, { goal: string; priority: 'low' | 'medium' | 'high' }>;
      if (!goalText.trim()) {
        delete nextGoals[characterId];
      } else {
        nextGoals[characterId] = { goal: goalText.trim(), priority };
      }
      return { ...s, hiddenGoals: nextGoals };
    }));

    // Persist to settings under scene_goals:sceneId
    try {
      const { db } = await getDb();
      const key = `scene_goals:${sceneId}`;
      // Compute latest goals from state-like approach: read back the session from local latest
      let latest: Record<string, { goal: string; priority: 'low' | 'medium' | 'high' }> = {};
      // Unlike React state sync, we will fetch from DB first and then override target key for determinism
      const existing: { value: string }[] = [];
      db.exec({ sql: 'SELECT value FROM settings WHERE key = ?', bind: [key], rowMode: 'object', callback: (r: unknown) => existing.push(r as { value: string }) });
      if (existing.length > 0) {
        try { latest = JSON.parse(existing[0].value || '{}') || {}; } catch { latest = {}; }
      }
      if (!goalText.trim()) {
        delete latest[characterId];
      } else {
        latest[characterId] = { goal: goalText.trim(), priority };
      }
      const serialized = JSON.stringify(latest);
      const before: { c: number }[] = [];
      db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => before.push(r as { c: number }) });
      db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serialized, key] });
      const after: { c: number }[] = [];
      db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: unknown) => after.push(r as { c: number }) });
      const changed = (after[0]?.c ?? 0) - (before[0]?.c ?? 0);
      if (changed === 0) {
        db.exec({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', bind: [key, serialized] });
      }
      await saveDatabase();
      await saveDatabase();
    } catch (e) {
      logger.warn('Failed to persist updated scene goal', e);
    }
    // Also update the persisted scene_session record's hiddenGoals snapshot
    try {
      const { db } = await getDb();
      const sessionKey = `scene_session:${sceneId}`;
      const rows: { value: string }[] = [];
      db.exec({ sql: 'SELECT value FROM settings WHERE key = ?', bind: [sessionKey], rowMode: 'object', callback: (r: unknown) => rows.push(r as { value: string }) });
      if (rows.length > 0) {
        try {
          const parsed = JSON.parse(rows[0].value || '{}');
          const goals = parsed.hiddenGoals || {};
          if (!goalText.trim()) delete goals[characterId]; else goals[characterId] = { goal: goalText.trim(), priority };
          parsed.hiddenGoals = goals;
          const serialized = JSON.stringify(parsed);
          db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serialized, sessionKey] });
          await saveDatabase();
        } catch (parseErr) {
          logger.warn('Failed to parse scene session for goal sync', parseErr);
        }
      }
    } catch (e) {
      logger.warn('Failed to sync hiddenGoals into scene_session record', e);
    }
  };

  return {
    activeSessions: activeSessions || [],
    createSceneSession,
    updateSceneSession,
    updateSceneGoal
  };
}
