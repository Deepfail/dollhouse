// Component stub - legacy storage removed
import { Character } from '@/types';

interface CharacterCreatorProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  character?: Character;
}

export function CharacterCreator({ open, onOpenChange }: CharacterCreatorProps) {
  return <div className="p-4 text-center text-muted-foreground">Character Creator disabled - legacy storage removed</div>;
}
