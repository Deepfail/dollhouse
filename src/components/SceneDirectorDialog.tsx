import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { WingmanSceneDirector, type SceneSetup } from '@/lib/wingmanSceneDirector';
import type { Character } from '@/types';
import { Sparkle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

interface SceneDirectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  onSceneReady?: (scene: SceneSetup) => void;
}

export function SceneDirectorDialog({
  open,
  onOpenChange,
  characters,
  onSceneReady,
}: SceneDirectorDialogProps) {
  const [director, setDirector] = useState<WingmanSceneDirector | null>(null);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize director when dialog opens
  useEffect(() => {
    if (open && characters.length > 0) {
      const newDirector = new WingmanSceneDirector(characters);
      setDirector(newDirector);
      setConversation([
        {
          role: 'assistant',
          content: "Hey! Tell me what scene you'd like to set up. For example: 'Send Bella to Mike's room' or 'Create a scene with Sarah and John'",
        },
      ]);
    } else if (!open) {
      // Reset when closing
      setDirector(null);
      setConversation([]);
      setUserInput('');
    }
  }, [open, characters]);

  const handleSend = async () => {
    if (!userInput.trim() || !director || isProcessing) return;

    const input = userInput.trim();
    setUserInput('');

    // Add user message to conversation
    setConversation((prev) => [...prev, { role: 'user', content: input }]);
    setIsProcessing(true);

    try {
      const result = await director.processInput(input);

      if (result.type === 'question') {
        // Wingman is asking a follow-up question
        setConversation((prev) => [
          ...prev,
          { role: 'assistant', content: result.message },
        ]);
      } else if (result.type === 'scene' && result.scene) {
        // Scene is ready!
        setConversation((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `**Scene Ready!**\n\n${result.message}\n\n*Click "Launch Scene" to start it in the main chat.*`,
          },
        ]);

        // Call the callback with the scene
        if (onSceneReady) {
          onSceneReady(result.scene);
        }
      } else {
        // Acknowledgment or error
        setConversation((prev) => [
          ...prev,
          { role: 'assistant', content: result.message },
        ]);
      }
    } catch {
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I had trouble processing that. Can you try rephrasing?",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] bg-[#0d0e17] border-white/10 text-white flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5ab9] to-[#7748ff]">
                <Sparkle size={20} weight="fill" className="text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl text-white">Scene Director</DialogTitle>
                <p className="text-sm text-white/60">Set up scenes with natural language</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Conversation Area */}
        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4 py-4">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-[#ff1372] text-white'
                      : 'bg-white/5 text-gray-200 border border-white/10'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-white/10 pt-4">
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe the scene you want... (e.g., 'Send Bella to Mike's room')"
              className="flex-1 min-h-[60px] bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!userInput.trim() || isProcessing}
              className="bg-[#ff1372] hover:bg-[#ff1372]/90 text-white self-end"
            >
              Send
            </Button>
          </div>
          <p className="text-xs text-white/40 mt-2">
            Wingman will ask follow-up questions to gather details, then generate the scene.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
