import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
    Robot,
    Lightning,
    ChartBar,
    Users,
    Gift,
    PaperPlaneRight,
    Sparkle,
    TrendUp,
    MagnifyingGlass,
    Lightbulb
} from '@phosphor-icons/react';
import { useState } from 'react';

interface CopilotProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function Copilot({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps) {
  const [inputMessage, setInputMessage] = useState('');

  const insights = {
    engagement: 87,
    contentQuality: 92,
    growthRate: 74
  };

  const quickActions = [
    { icon: Sparkle, label: 'Generate creative content' },
    { icon: TrendUp, label: 'Analyze engagement trends' },
    { icon: MagnifyingGlass, label: 'Find similar profiles' },
    { icon: Lightbulb, label: 'Get post ideas' }
  ];

  const messages = [
    {
      id: '1',
      sender: 'copilot' as const,
      content: "Hello! I'm your AI assistant. How can I help you improve your social media presence today?",
      timestamp: 'Just now'
    },
    {
      id: '2',
      sender: 'user' as const,
      content: "Can you help me write a caption for my latest design post?",
      timestamp: '2 min ago'
    },
    {
      id: '3',
      sender: 'copilot' as const,
      content: "Absolutely! Here are some engaging caption ideas for your design post:",
      timestamp: '1 min ago',
      suggestions: [
        "✨ When pixels meet passion. What do you think of this latest creation?",
        "🎨 Another late night, another design breakthrough. The creative process never stops!"
      ]
    },
    {
      id: '4',
      sender: 'copilot' as const,
      content: "Based on your recent activity, here are some personalized recommendations:",
      timestamp: '30 sec ago',
      recommendations: [
        {
          type: 'optimal',
          title: 'OPTIMAL POSTING',
          content: 'Best time to post: 2-4 PM today for maximum engagement',
          color: 'bg-[rgba(102,126,234,0.1)] border-[#667eea]'
        },
        {
          type: 'trending',
          title: 'TRENDING TAGS', 
          content: '#DesignInspiration #UIDesign #CreativeProcess',
          color: 'bg-[rgba(240,147,251,0.1)] border-[#ff1372]'
        }
      ]
    }
  ];

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    // Handle sending message
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white border-l border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#4facfe] to-[#667eea] flex items-center justify-center">
            <Robot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Copilot</h2>
            <p className="text-sm text-gray-400">Your smart assistant</p>
          </div>
          <div className="ml-auto">
            <div className="w-3 h-3 bg-[#43e97b] rounded-full opacity-70"></div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-[#0f0f0f] p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">AI INSIGHTS</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Engagement Score</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[#43e97b] to-[#4facfe] rounded-full"
                  style={{ width: `${insights.engagement}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-[#43e97b]">{insights.engagement}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Content Quality</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[#667eea] to-[#f093fb] rounded-full"
                  style={{ width: `${insights.contentQuality}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-[#667eea]">{insights.contentQuality}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Growth Rate</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[#fa709a] to-[#ff1372] rounded-full"
                  style={{ width: `${insights.growthRate}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-[#ff1372]">{insights.growthRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">QUICK ACTIONS</h3>
        <div className="space-y-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start h-11 bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white"
            >
              <action.icon size={14} className="mr-3" />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              {message.sender === 'copilot' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#4facfe] to-[#667eea] flex items-center justify-center flex-shrink-0">
                  <Robot size={12} className="text-white" />
                </div>
              )}
              
              <div className={`flex-1 ${message.sender === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-xl p-3 ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-[#ff5a5d] to-[#ff1372] text-white ml-12' 
                    : 'bg-neutral-800 text-gray-300'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Suggestions */}
                  {message.suggestions && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion, index) => (
                        <div key={index} className="bg-[#0f0f0f] rounded-lg p-2">
                          <p className="text-xs text-gray-300">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Recommendations */}
                  {message.recommendations && (
                    <div className="mt-3 space-y-2">
                      {message.recommendations.map((rec, index) => (
                        <div key={index} className={`rounded-lg p-3 border ${rec.color}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb size={12} />
                            <span className="text-xs font-semibold text-[#667eea]">{rec.title}</span>
                          </div>
                          <p className="text-xs text-gray-300">{rec.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mt-1 px-3">
                  {message.timestamp}
                </div>
              </div>
              
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-center bg-cover flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="relative">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your AI copilot..."
            className="pr-12 bg-gray-200 border-gray-600 text-black placeholder-gray-600"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 p-0"
          >
            <PaperPlaneRight size={12} />
          </Button>
        </div>
        
        {/* Status Dots */}
        <div className="flex justify-center gap-2 mt-2">
          <div className="w-2 h-2 bg-[#667eea] rounded-full opacity-90"></div>
          <div className="w-2 h-2 bg-[#f093fb] rounded-full opacity-90"></div>
          <div className="w-2 h-2 bg-[#4facfe] rounded-full opacity-90"></div>
        </div>
      </div>
    </div>
  );
}