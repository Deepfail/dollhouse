import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSceneMode } from '@/hooks/useSceneMode';
import { useHouse } from '@/hooks/useHouse';
import { ChatSession, ChatMessage } from '@/types';
import { 
  Play, 
  Pause, 
  Stop, 
  PaperPlaneRight,
  Users,
  Eye,
  EyeSlash,
  Clock,
  Warning
} from '@phosphor-icons/react';

interface SceneInterfaceProps {
  sessionId: string;
  onClose: () => void;
}

export const SceneInterface: React.FC<SceneInterfaceProps> = ({ sessionId, onClose }) => {
  const { house } = useHouse();
  const { 
    activeSessions, 
    startAutoPlay, 
    endScene, 
    pauseScene, 
    resumeScene, 
    addUserMessage,
    loadFromStorage,
    isProcessing 
  } = useSceneMode();
  
  const [userInput, setUserInput] = useState('');
  const [showObjectives, setShowObjectives] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const session = activeSessions.find(s => s.id === sessionId);
  
  // Debug logging
  useEffect(() => {
    console.log('SceneInterface Debug:', {
      sessionId,
      activeSessionsCount: activeSessions.length,
      sessionFound: !!session,
      activeSessionIds: activeSessions.map(s => s.id)
    });
  }, [sessionId, activeSessions, session]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  // Load session from storage on mount and when session not found
  useEffect(() => {
    // Always load from storage on mount to ensure we have latest data
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!session && sessionId) {
      // If still not found after loading, check localStorage directly and force reload
      const stored = JSON.parse(localStorage.getItem('scene-sessions') || '[]');
      const found = stored.find((s: any) => s.id === sessionId);
      if (found) {
        console.log('Scene found in localStorage, reloading sessions:', found);
        loadFromStorage();
      } else {
        console.log('Scene not found in localStorage either, sessionId:', sessionId);
        console.log('Available sessions in localStorage:', stored.map((s: any) => s.id));
      }
    }
  }, [session, sessionId, loadFromStorage]);

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Warning className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Scene not found</p>
              <p className="text-sm text-muted-foreground">
                The requested scene session could not be found. It may still be loading or may have been removed.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Session ID: {sessionId}
              </p>
            </div>
            <Button onClick={onClose} className="mt-4">
              Back to House
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAutoPlaying = session.sceneSettings?.autoPlay && session.active;
  const participatingCharacters = session.participantIds
    .map(id => house.characters?.find(c => c.id === id))
    .filter((character): character is NonNullable<typeof character> => Boolean(character));

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    await addUserMessage(sessionId, userInput, !isAutoPlaying);
    setUserInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePlayPause = () => {
    if (isAutoPlaying) {
      pauseScene(sessionId);
    } else if (session.active) {
      resumeScene(sessionId);
    } else {
      startAutoPlay(sessionId);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="text-primary" />
              Scene Session
              <Badge variant={session.active ? "default" : "secondary"}>
                {session.active ? "Active" : "Ended"}
              </Badge>
              {isProcessing && (
                <Badge variant="outline" className="animate-pulse">
                  Processing...
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowObjectives(!showObjectives)}
              >
                {showObjectives ? <EyeSlash size={16} /> : <Eye size={16} />}
                Objectives
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {participatingCharacters.map(character => (
              <Badge key={character.id} variant="secondary">
                {character.name}
              </Badge>
            ))}
          </div>
          
          {session.context && (
            <p className="text-sm text-muted-foreground mt-2">
              {session.context}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Objectives Panel */}
      {showObjectives && session.sceneObjectives && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Secret Objectives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(session.sceneObjectives).map(([characterId, objective]) => {
              const character = house.characters?.find(c => c.id === characterId);
              return (
                <div key={characterId} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{character?.name}</Badge>
                  </div>
                  <p className="text-sm">{objective}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {session.messages.map((message) => (
                <MessageBubble 
                  key={message.id}
                  message={message}
                  character={message.characterId ? house.characters?.find(c => c.id === message.characterId) : undefined}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Controls */}
          <div className="border-t p-4 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={handlePlayPause}
                disabled={!session.active}
                variant={isAutoPlaying ? "default" : "outline"}
              >
                {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isAutoPlaying ? 'Pause' : 'Start Auto-Play'}
              </Button>
              
              <Button
                onClick={() => endScene(sessionId)}
                variant="destructive"
                disabled={!session.active}
              >
                <Stop size={16} />
                End Scene
              </Button>
            </div>
            
            {/* User Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add your input to the scene..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!session.active || isAutoPlaying}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || !session.active || isAutoPlaying}
              >
                <PaperPlaneRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
  character?: any;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, character }) => {
  const isUser = !message.characterId;
  const isSystem = message.type === 'system';
  
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm text-muted-foreground">
          <Clock size={14} />
          <span>{message.content}</span>
          <span className="text-xs">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {character?.name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[70%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isUser && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{character?.name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}
        
        <div
          className={`
            px-3 py-2 rounded-lg text-sm
            ${isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted border'
            }
          `}
        >
          {message.content}
        </div>
        
        {isUser && (
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </div>
      
      {isUser && (
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-accent text-accent-foreground text-xs">
            You
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};