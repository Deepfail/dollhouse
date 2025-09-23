import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from '@phosphor-icons/react';

interface AliResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: string;
  action: string;
}

export function AliResponseModal({ isOpen, onClose, character, action }: AliResponseModalProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowModal(true);
    }
  }, [isOpen]);

  if (!isOpen && !showModal) return null;

  const responses = [
    `✨ *Ali's eyes light up with a knowing smile* Of course! I'll send ${character} to your room right away. She's been thinking about you...`,
    `🌟 *Ali nods with a mischievous grin* Consider it done. ${character} will be there shortly - I have a feeling she's been waiting for this invitation.`,
    `💫 *Ali gestures gracefully* ${character} is on her way to you now. She seemed excited when I mentioned it...`,
    `✨ *Ali's voice carries a hint of magic* I'll bring ${character} to your room immediately. Something tells me this encounter will be... special.`
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-purple-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Ali</h3>
              <p className="text-gray-400 text-sm">Your Companion</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>
        
        <div className="bg-[#0f0f0f] rounded-xl p-4 mb-4 border border-gray-700">
          <p className="text-white text-sm leading-relaxed">{response}</p>
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={onClose}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6"
          >
            Perfect! ✨
          </Button>
        </div>
      </div>
    </div>
  );
}