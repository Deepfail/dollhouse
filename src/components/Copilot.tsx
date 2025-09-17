import { CopilotPresets } from './CopilotPresets';

interface CopilotProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function Copilot({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps) {
  return <CopilotPresets />;
}