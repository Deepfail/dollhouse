import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { 
  ArrowLeft, 
  ChatCircle, 
  Heart,
  User,
  ChartBar,
  Gear,
  CheckCircle,
  Crown,
  WifiHigh,
  BatteryMedium
} from '@phosphor-icons/react';

interface ChatInterfaceProps {
  sessionId?: string | null;
  onBack?: () => void;
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
}

export function ChatInterface({ sessionId, onBack, onStartChat, onStartGroupChat }: ChatInterfaceProps) {
  const { characters } = useHouseFileStorage();
  const { sessions } = useChat();
  const [activeTab, setActiveTab] = useState('profile');

  const session = sessions?.find((s: any) => s.id === sessionId);
  const sessionCharacters = characters?.filter((c: any) => session?.participantIds.includes(c.id)) || [];
  
  // Get the main character for profile display
  const mainCharacter = sessionCharacters[0] || characters?.[0];
  
  // Mock stats for the design
  const stats = {
    love: 65,
    wet: 45,
    trust: 78,
    confidence: 82,
    intelligence: 94,
    creativity: 89,
    humor: 71,
    kindness: 92,
    adventurous: 63
  };

  if (!mainCharacter) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <ChatCircle size={48} className="mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No Character Selected</h3>
            <p className="text-muted-foreground text-sm">Select a character from the sidebar to view their profile.</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" /> Back to House
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white">
      {/* Status Bar */}
      <div className="bg-[#0f0f0f] h-[32px] flex items-center justify-between px-6 text-white text-xs flex-shrink-0">
        <span className="font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <WifiHigh size={16} className="text-white" />
          <WifiHigh size={16} className="text-white" />
          <BatteryMedium size={16} className="text-white" />
        </div>
      </div>

      {/* Header */}
      <div className="bg-[#1a1a1a] h-[73px] border-b border-gray-700 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={mainCharacter.avatar} alt={mainCharacter.name} />
            <AvatarFallback>{mainCharacter.name?.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-white font-semibold">{mainCharacter.name}</h2>
            <p className="text-[#43e97b] text-xs">Online now</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <ChatCircle size={16} className="text-gray-400" />
          </Button>
          <Button variant="ghost" size="sm">
            <CheckCircle size={16} className="text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-neutral-800 h-[34px] border-b border-gray-700 shadow-[0px_-1px_22.6px_0px_#ff1372] flex items-center justify-center px-3 flex-shrink-0">
        <div className="flex items-center justify-between w-full max-w-[358px] text-xs">
          {/* Love */}
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-red-400" />
            <span className="text-gray-300">Love</span>
            <div className="w-8 h-1.5 bg-gray-600 rounded-full">
              <div className="w-5 h-1.5 bg-gradient-to-r from-red-400 to-[#ff1372] rounded-full"></div>
            </div>
            <span className="text-red-400 font-semibold">{stats.love}%</span>
          </div>
          
          {/* Wet */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3.5 bg-blue-400 rounded-sm"></div>
            <span className="text-gray-300">Wet</span>
            <div className="w-8 h-1.5 bg-gray-600 rounded-full">
              <div className="w-3 h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></div>
            </div>
            <span className="text-blue-400 font-semibold">{stats.wet}%</span>
          </div>
          
          {/* Trust */}
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-green-400" />
            <span className="text-gray-300">Trust</span>
            <div className="w-8 h-1.5 bg-gray-600 rounded-full">
              <div className="w-6 h-1.5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"></div>
            </div>
            <span className="text-green-400 font-semibold">{stats.trust}%</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {/* Character Profile */}
          <div className="space-y-6">
            {/* Main Avatar and Info */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-[#667eea]">
                  <AvatarImage src={mainCharacter.avatar} alt={mainCharacter.name} />
                  <AvatarFallback className="text-2xl">{mainCharacter.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#43e97b] rounded-full border-4 border-[#1a1a1a] flex items-center justify-center">
                  <CheckCircle size={12} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{mainCharacter.name}</h1>
                <p className="text-[#667eea]">Age 26</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <User size={18} className="text-white" />
                <h3 className="text-white font-semibold">Description</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {mainCharacter.description || "Sarah is a talented UX/UI designer with a passion for creating beautiful and functional digital experiences. She has a warm personality and loves working with innovative teams. Her creative mind is always buzzing with new ideas, and she approaches every project with enthusiasm and dedication."}
              </p>
            </div>

            {/* Appearance */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <User size={18} className="text-white" />
                <h3 className="text-white font-semibold">Appearance</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                {mainCharacter.appearance || "Sarah has long, silky black hair that cascades down to her shoulders. Her expressive brown eyes sparkle with intelligence and warmth. She has a petite frame and carries herself with confidence and grace."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-[rgba(102,126,234,0.2)] text-[#667eea] border-none">Petite</Badge>
                <Badge variant="secondary" className="bg-[rgba(236,72,153,0.2)] text-[#ff1372] border-none">Brown Eyes</Badge>
                <Badge variant="secondary" className="bg-[rgba(79,172,254,0.2)] text-[#4facfe] border-none">Black Hair</Badge>
                <Badge variant="secondary" className="bg-[rgba(67,233,123,0.2)] text-[#43e97b] border-none">Elegant</Badge>
              </div>
            </div>

            {/* Personality */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={18} className="text-white" />
                <h3 className="text-white font-semibold">Personality</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                {mainCharacter.personality || "Sarah is naturally curious and loves learning new things. She's empathetic and always tries to understand others' perspectives. Her creative nature makes her approach problems from unique angles, and she has a gentle but determined personality."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-[rgba(102,126,234,0.2)] text-[#667eea] border-none">Creative</Badge>
                <Badge variant="secondary" className="bg-[rgba(236,72,153,0.2)] text-[#ff1372] border-none">Empathetic</Badge>
                <Badge variant="secondary" className="bg-[rgba(79,172,254,0.2)] text-[#4facfe] border-none">Curious</Badge>
                <Badge variant="secondary" className="bg-[rgba(67,233,123,0.2)] text-[#43e97b] border-none">Determined</Badge>
                <Badge variant="secondary" className="bg-[rgba(250,112,154,0.2)] text-[#fa709a] border-none">Gentle</Badge>
              </div>
            </div>

            {/* Character Stats */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <h3 className="text-white font-semibold mb-4">Character Stats</h3>
              <div className="space-y-3">
                {Object.entries(stats).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-300 text-xs capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-[rgba(55,65,81,0.5)] rounded-full">
                        <div 
                          className={`h-1.5 rounded-full ${
                            key === 'confidence' ? 'bg-[#667eea]' :
                            key === 'intelligence' ? 'bg-[#4facfe]' :
                            key === 'creativity' ? 'bg-[#ff1372]' :
                            key === 'humor' ? 'bg-[#43e97b]' :
                            key === 'kindness' ? 'bg-[#fa709a]' :
                            'bg-red-400'
                          }`}
                          style={{ width: `${(value / 100) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-semibold ${
                        key === 'confidence' ? 'text-[#667eea]' :
                        key === 'intelligence' ? 'text-[#4facfe]' :
                        key === 'creativity' ? 'text-[#ff1372]' :
                        key === 'humor' ? 'text-[#43e97b]' :
                        key === 'kindness' ? 'text-[#fa709a]' :
                        'text-red-400'
                      }`}>{value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <h3 className="text-white font-semibold mb-4">History</h3>
              
              {/* Story Summary */}
              <div className="bg-[rgba(15,15,15,0.7)] rounded-lg p-3 mb-4">
                <h4 className="text-[#667eea] text-sm font-medium mb-2">Story Summary</h4>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Sarah joined the creative community 6 months ago. She's been working on building her portfolio and 
                  has shown remarkable growth in her design skills. Recently, she's been more open about sharing her 
                  personal thoughts and experiences.
                </p>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#43e97b] rounded-full flex items-center justify-center">
                    <CheckCircle size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">Shared her first personal design project</p>
                    <p className="text-gray-500 text-xs">3 days ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#667eea] rounded-full flex items-center justify-center">
                    <ChatCircle size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">Had a deep conversation about creative inspiration</p>
                    <p className="text-gray-500 text-xs">1 week ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#ff1372] rounded-full flex items-center justify-center">
                    <Heart size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">Reached a milestone in trust level</p>
                    <p className="text-gray-500 text-xs">2 weeks ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[rgba(26,26,26,0.95)] h-[89px] border-t border-gray-700 px-3 flex items-center justify-center flex-shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 bg-transparent h-16 gap-2">
            <TabsTrigger 
              value="profile" 
              className={`flex flex-col items-center gap-1 h-16 rounded-lg ${
                activeTab === 'profile' 
                  ? 'bg-[rgba(255,19,145,0.16)] text-[#ff1372]' 
                  : 'text-gray-400'
              }`}
            >
              <User size={18} />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex flex-col items-center gap-1 h-16 rounded-lg text-gray-400"
              onClick={() => onStartChat?.(mainCharacter.id)}
            >
              <ChatCircle size={18} />
              <span className="text-xs">Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="feed" 
              className="flex flex-col items-center gap-1 h-16 rounded-lg text-gray-400"
            >
              <Heart size={18} />
              <span className="text-xs">Feed</span>
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="flex flex-col items-center gap-1 h-16 rounded-lg text-gray-400"
            >
              <ChartBar size={18} />
              <span className="text-xs">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex flex-col items-center gap-1 h-16 rounded-lg text-gray-400"
            >
              <Gear size={18} />
              <span className="text-xs">Settings</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}