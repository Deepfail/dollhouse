import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { 
  Bug, 
  Eye, 
  Gear, 
  Database, 
  ChatCircle, 
  Users,
  Warning,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react';

interface DevDashboardProps {
  onClose?: () => void;
}

export function DevDashboard({ onClose }: DevDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'data' | 'errors'>('overview');
  const [errors, setErrors] = useState<string[]>([]);
  const [componentStates, setComponentStates] = useState<Record<string, any>>({});
  
  const { sessions, characters: chatCharacters, activeSessionId } = useChat();
  const { characters, house, isLoading } = useHouseFileStorage();

  // Error tracking
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setErrors(prev => [...prev.slice(-4), `${event.filename}:${event.lineno} - ${event.message}`]);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setErrors(prev => [...prev.slice(-4), `Promise rejection: ${event.reason}`]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Component state tracking
  useEffect(() => {
    setComponentStates({
      'useChat': {
        sessions: sessions.length,
        activeSessionId,
        characters: chatCharacters?.length || 0
      },
      'useHouseFileStorage': {
        characters: characters?.length || 0,
        house: house?.name || 'No house',
        isLoading
      }
    });
  }, [sessions, activeSessionId, chatCharacters, characters, house, isLoading]);

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database size={16} />
              Data Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Characters:</span>
              <Badge variant={characters?.length ? 'default' : 'destructive'}>
                {characters?.length || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Sessions:</span>
              <Badge variant={sessions.length ? 'default' : 'secondary'}>
                {sessions.length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">House:</span>
              <Badge variant={house ? 'default' : 'destructive'}>
                {house ? 'Loaded' : 'Missing'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Warning size={16} />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Storage:</span>
              {isLoading ? (
                <Badge variant="secondary">Loading...</Badge>
              ) : (
                <Badge variant="default">
                  <CheckCircle size={12} className="mr-1" />
                  Ready
                </Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Errors:</span>
              <Badge variant={errors.length ? 'destructive' : 'default'}>
                {errors.length ? (
                  <>
                    <XCircle size={12} className="mr-1" />
                    {errors.length}
                  </>
                ) : (
                  <>
                    <CheckCircle size={12} className="mr-1" />
                    None
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a1a1a] border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Reload App
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => localStorage.clear()}
              className="text-xs"
            >
              Clear Storage
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setErrors([])}
              className="text-xs"
            >
              Clear Errors
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => console.log('DevDashboard State:', { componentStates, errors })}
              className="text-xs"
            >
              Log State
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderComponents = () => (
    <div className="space-y-4">
      {Object.entries(componentStates).map(([component, state]) => (
        <Card key={component} className="bg-[#1a1a1a] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{component}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">
              {JSON.stringify(state, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderData = () => (
    <div className="space-y-4">
      <Card className="bg-[#1a1a1a] border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users size={16} />
            Characters ({characters?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40">
            {characters?.map(char => (
              <div key={char.id} className="text-xs py-1 border-b border-gray-700">
                <strong>{char.name}</strong> - {char.id}
              </div>
            )) || <div className="text-xs text-gray-400">No characters loaded</div>}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-[#1a1a1a] border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChatCircle size={16} />
            Sessions ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40">
            {sessions.map(session => (
              <div key={session.id} className="text-xs py-1 border-b border-gray-700">
                <strong>{session.type}</strong> - {session.id}
                {session.id === activeSessionId && <Badge className="ml-2 text-xs">Active</Badge>}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderErrors = () => (
    <div className="space-y-4">
      <Card className="bg-[#1a1a1a] border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bug size={16} />
            Recent Errors ({errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length > 0 ? (
            <ScrollArea className="h-60">
              {errors.map((error, i) => (
                <div key={i} className="text-xs py-2 border-b border-gray-700 text-red-400">
                  {error}
                </div>
              ))}
            </ScrollArea>
          ) : (
            <div className="text-xs text-gray-400 text-center py-4">
              No errors recorded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center">
      <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg w-[90vw] h-[90vh] max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Eye size={20} />
            Development Dashboard
          </h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'components', label: 'Components', icon: Gear },
            { id: 'data', label: 'Data', icon: Database },
            { id: 'errors', label: 'Errors', icon: Bug }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <ScrollArea className="h-full">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'components' && renderComponents()}
            {activeTab === 'data' && renderData()}
            {activeTab === 'errors' && renderErrors()}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}