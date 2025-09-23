import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRelationshipContext } from '@/hooks/useConversationAnalytics';
import { useChat } from '@/hooks/useChat';
import { logger } from '@/lib/logger';
import { Brain, Clock, Heart, MessageCircle } from '@phosphor-icons/react';

export function ConversationDebugger() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { contexts, loading, loadContexts, getContextSummaryForAli } = useRelationshipContext();
  const { sessions, getSessionMessages } = useChat();
  const [aliContext, setAliContext] = useState<string>('');

  const handleLoadContexts = async () => {
    await loadContexts();
  };

  const handleGetAliContext = async () => {
    setIsProcessing(true);
    try {
      const contextSummary = await getContextSummaryForAli();
      setAliContext(contextSummary);
      logger.log('🤖 Ali context loaded:', contextSummary);
    } catch (error) {
      logger.error('Failed to get Ali context:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSummarize = async (sessionId: string) => {
    setIsProcessing(true);
    try {
      const messages = await getSessionMessages(sessionId);
      if (!messages || messages.length < 3) {
        throw new Error('Not enough messages to summarize');
      }

      // Import and trigger manual summarization
      const { conversationSummarizer } = await import('@/lib/conversationSummarizer');
      const { contextStorage } = await import('@/lib/contextStorage');
      
      // This is a simplified manual trigger - in real app, this would be done by the analytics hook
      logger.log('🔄 Manually triggering summarization for session:', sessionId);
      // Note: We'd need to get participants and other info for real implementation
      // For now, just reload contexts to see if auto-summarization worked
      await loadContexts();
      
    } catch (error) {
      logger.error('Manual summarization failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-[#0f0f0f] text-white">
      <Card className="bg-[#1a1a1a] border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain size={20} />
            Conversation Analytics Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleLoadContexts} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <MessageCircle size={16} className="mr-1" />
              Load Contexts
            </Button>
            <Button 
              onClick={handleGetAliContext}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <Brain size={16} className="mr-1" />
              Get Ali Context
            </Button>
          </div>

          {contexts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Relationship Contexts:</h4>
              {contexts.map((context: any) => (
                <div key={context.characterId} className="bg-[#0f0f0f] p-3 rounded border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{context.characterName}</h5>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {context.relationshipType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Heart size={12} className="mr-1" />
                        {context.intimacyLevel}/10
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">{context.emotionalState}</p>
                  <p className="text-xs text-gray-500 mt-1">{context.conversationStyle}</p>
                  {context.recentSummaries.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Latest: {context.recentSummaries[0].summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {aliContext && (
            <div className="bg-[#0f0f0f] p-3 rounded border border-blue-700">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain size={16} />
                Ali's Context
              </h4>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">{aliContext}</pre>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Recent Sessions:</h4>
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="bg-[#0f0f0f] p-2 rounded border border-gray-700 flex items-center justify-between">
                  <div>
                    <span className="text-sm">{session.type} session</span>
                    <div className="text-xs text-gray-500">
                      <Clock size={12} className="inline mr-1" />
                      {new Date(session.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleManualSummarize(session.id)}
                    disabled={isProcessing}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                  >
                    Summarize
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}