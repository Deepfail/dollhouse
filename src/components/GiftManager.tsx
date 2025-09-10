import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Gift, Heart, Star, Sparkles, Crown } from '@phosphor-icons/react';
import { Character, Gift as GiftType } from '@/types';
import { useHouse } from '@/hooks/useHouse';
import { useRelationshipDynamics } from '@/hooks/useRelationshipDynamics';
import { toast } from 'sonner';

interface GiftManagerProps {
  character: Character;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_GIFTS: GiftType[] = [
  {
    id: 'chocolate',
    name: 'Chocolate Box',
    description: 'Sweet chocolates that show you care',
    cost: 50,
    rarity: 'common',
    effects: {
      relationship: 5,
      happiness: 10
    },
    icon: '🍫'
  },
  {
    id: 'flowers',
    name: 'Beautiful Flowers',  
    description: 'A bouquet of fresh, fragrant flowers',
    cost: 75,
    rarity: 'common',
    effects: {
      relationship: 8,
      happiness: 12,
      energy: -5
    },
    icon: '💐'
  },
  {
    id: 'jewelry',
    name: 'Elegant Jewelry',
    description: 'A piece of beautiful jewelry they can treasure',
    cost: 200,
    rarity: 'rare',
    effects: {
      relationship: 15,
      happiness: 20
    },
    icon: '💎'
  },
  {
    id: 'teddy_bear',
    name: 'Cute Teddy Bear',
    description: 'A soft, cuddly companion for comfort',
    cost: 100,
    rarity: 'common',
    effects: {
      relationship: 10,
      happiness: 15
    },
    icon: '🧸'
  },
  {
    id: 'perfume',
    name: 'Luxury Perfume',
    description: 'An intoxicating fragrance that makes them feel special',
    cost: 150,
    rarity: 'rare',
    effects: {
      relationship: 12,
      happiness: 8,
      energy: 10
    },
    icon: '🌸'
  },
  {
    id: 'romantic_dinner',
    name: 'Romantic Dinner',
    description: 'An intimate candlelit dinner for two',
    cost: 300,
    rarity: 'rare',
    effects: {
      relationship: 20,
      happiness: 25,
      energy: 15
    },
    icon: '🕯️'
  },
  {
    id: 'diamond_necklace',
    name: 'Diamond Necklace',
    description: 'An exquisite diamond necklace that sparkles like their eyes',
    cost: 500,
    rarity: 'legendary',
    effects: {
      relationship: 30,
      happiness: 35
    },
    icon: '💍'
  },
  {
    id: 'weekend_getaway',
    name: 'Weekend Getaway',
    description: 'A romantic weekend trip to somewhere special',
    cost: 750,
    rarity: 'legendary', 
    effects: {
      relationship: 40,
      happiness: 45,
      energy: 25
    },
    icon: '🏖️'
  }
];

const getRarityColor = (rarity: GiftType['rarity']) => {
  switch (rarity) {
    case 'legendary': return 'text-amber-500 border-amber-500';
    case 'rare': return 'text-purple-500 border-purple-500';
    default: return 'text-blue-500 border-blue-500';
  }
};

const getRarityIcon = (rarity: GiftType['rarity']) => {
  switch (rarity) {
    case 'legendary': return <Crown size={16} className="text-amber-500" />;
    case 'rare': return <Sparkles size={16} className="text-purple-500" />;
    default: return <Star size={16} className="text-blue-500" />;
  }
};

export function GiftManager({ character, isOpen, onClose }: GiftManagerProps) {
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const { house, spendCurrency } = useHouse();
  const { updateRelationshipStats, addRelationshipEvent } = useRelationshipDynamics();

  const handleGiveGift = (gift: GiftType) => {
    if (house.currency < gift.cost) {
      toast.error('Not enough currency!');
      return;
    }

    // Spend currency
    spendCurrency(gift.cost);

    // Safely access character stats with defaults
    const stats = character.stats || {
      relationship: 0,
      wet: 0,
      happiness: 0,
      experience: 0,
      level: 1
    };

    // Update character stats
    const statUpdates: any = {};
    if (gift.effects.relationship) {
      statUpdates.relationship = stats.relationship + gift.effects.relationship;
    }
    if (gift.effects.happiness) {
      statUpdates.happiness = stats.happiness + gift.effects.happiness;
    }
    if (gift.effects.energy) {
      statUpdates.wet = stats.wet + gift.effects.energy;
    }

    updateRelationshipStats(character.id, statUpdates);

    // Add relationship event
    addRelationshipEvent(character.id, {
      type: 'gift_given',
      description: `Received ${gift.name}: ${gift.description}`,
      impact: {
        affection: gift.effects.relationship || 0,
        trust: Math.floor((gift.effects.relationship || 0) / 2)
      }
    });

    toast.success(`${character.name} loved the ${gift.name}!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift size={20} />
            Give Gift to {character.name}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Your Currency: {house.currency} coins
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] mt-4 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AVAILABLE_GIFTS.map((gift) => {
              const canAfford = house.currency >= gift.cost;
              const isSelected = selectedGift?.id === gift.id;
              
              return (
                <Card 
                  key={gift.id}
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    isSelected ? 'border-primary' : 'border-transparent'
                  } ${!canAfford ? 'opacity-50' : 'hover:shadow-md'}`}
                  onClick={() => canAfford && setSelectedGift(gift)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{gift.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{gift.name}</h4>
                        {getRarityIcon(gift.rarity)}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {gift.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs ${getRarityColor(gift.rarity)}`}>
                          {gift.rarity}
                        </Badge>
                        <div className="text-sm font-bold text-primary">
                          {gift.cost} coins
                        </div>
                      </div>
                      
                      {gift.effects && (
                        <div className="mt-2 space-y-1">
                          {gift.effects.relationship && (
                            <div className="flex items-center gap-1 text-xs">
                              <Heart size={10} className="text-red-500" />
                              <span>+{gift.effects.relationship} Relationship</span>
                            </div>
                          )}
                          {gift.effects.happiness && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                              <span>+{gift.effects.happiness} Happiness</span>
                            </div>
                          )}
                          {gift.effects.energy && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="w-2.5 h-2.5 bg-pink-500 rounded-full" />
                              <span>+{gift.effects.energy} Arousal</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!canAfford && (
                        <div className="text-xs text-red-500 mt-2">
                          Not enough currency
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {selectedGift && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold">Selected: {selectedGift.name}</h4>
                <p className="text-sm text-muted-foreground">Cost: {selectedGift.cost} coins</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedGift(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleGiveGift(selectedGift)}>
                  Give Gift
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}