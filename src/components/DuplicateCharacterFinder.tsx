/**
 * DuplicateCharacterFinder Component
 * 
 * A simple tool to find and remove duplicate characters
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { Character } from '@/types';
import { toast } from 'sonner';

interface DuplicateGroup {
  name: string;
  characters: Character[];
  duplicateType: 'exact_name' | 'exact_id' | 'recent_creation';
}

export function DuplicateCharacterFinder() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanForDuplicates = () => {
    setIsScanning(true);
    
    try {
      // Get current localStorage data
      const currentDataStr = localStorage.getItem('character-house');
      if (!currentDataStr) {
        toast.info('No character data found');
        setDuplicates([]);
        return;
      }
      
      const currentData = JSON.parse(currentDataStr);
      const characters: Character[] = currentData.characters || [];
      
      if (characters.length === 0) {
        toast.info('No characters found');
        setDuplicates([]);
        return;
      }
      
      const duplicateGroups: DuplicateGroup[] = [];
      
      // Find exact name duplicates
      const nameGroups = characters.reduce((acc, char) => {
        const key = char.name.toLowerCase();
        if (!acc[key]) acc[key] = [];
        acc[key].push(char);
        return acc;
      }, {} as Record<string, Character[]>);
      
      Object.entries(nameGroups).forEach(([name, chars]) => {
        if (chars.length > 1) {
          duplicateGroups.push({
            name: name,
            characters: chars,
            duplicateType: 'exact_name'
          });
        }
      });
      
      // Find exact ID duplicates
      const idGroups = characters.reduce((acc, char) => {
        const key = char.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(char);
        return acc;
      }, {} as Record<string, Character[]>);
      
      Object.entries(idGroups).forEach(([id, chars]) => {
        if (chars.length > 1) {
          duplicateGroups.push({
            name: `ID: ${id.slice(0, 8)}...`,
            characters: chars,
            duplicateType: 'exact_id'
          });
        }
      });
      
      // Find characters created within 30 seconds of each other with similar names
      const sortedByCreation = [...characters].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      for (let i = 0; i < sortedByCreation.length - 1; i++) {
        const char1 = sortedByCreation[i];
        const char2 = sortedByCreation[i + 1];
        
        const timeDiff = new Date(char2.createdAt).getTime() - new Date(char1.createdAt).getTime();
        const nameSimilar = char1.name.toLowerCase() === char2.name.toLowerCase();
        
        if (timeDiff < 30000 && nameSimilar) { // 30 seconds
          const existingGroup = duplicateGroups.find(group => 
            group.duplicateType === 'recent_creation' && 
            (group.characters.includes(char1) || group.characters.includes(char2))
          );
          
          if (!existingGroup) {
            duplicateGroups.push({
              name: `Recent: ${char1.name}`,
              characters: [char1, char2],
              duplicateType: 'recent_creation'
            });
          }
        }
      }
      
      setDuplicates(duplicateGroups);
      
      if (duplicateGroups.length === 0) {
        toast.success('No duplicates found!');
      } else {
        toast.warning(`Found ${duplicateGroups.length} duplicate groups`);
      }
      
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
      toast.error('Failed to scan for duplicates');
    } finally {
      setIsScanning(false);
    }
  };

  const removeDuplicate = (characterToRemove: Character, groupIndex: number) => {
    try {
      // Get current localStorage data
      const currentDataStr = localStorage.getItem('character-house');
      if (!currentDataStr) return;
      
      const currentData = JSON.parse(currentDataStr);
      
      // Remove the character
      currentData.characters = currentData.characters.filter((char: Character) => 
        char.id !== characterToRemove.id
      );
      
      // Remove from room residents
      if (currentData.rooms) {
        currentData.rooms = currentData.rooms.map((room: any) => ({
          ...room,
          residents: room.residents.filter((id: string) => id !== characterToRemove.id)
        }));
      }
      
      // Update timestamp
      currentData.updatedAt = new Date().toISOString();
      
      // Save back to localStorage
      localStorage.setItem('character-house', JSON.stringify(currentData));
      
      // Update local state
      setDuplicates(prev => {
        const newDuplicates = [...prev];
        newDuplicates[groupIndex] = {
          ...newDuplicates[groupIndex],
          characters: newDuplicates[groupIndex].characters.filter(char => char.id !== characterToRemove.id)
        };
        
        // Remove group if only one character left
        return newDuplicates.filter(group => group.characters.length > 1);
      });
      
      toast.success(`Removed duplicate: ${characterToRemove.name}`);
      
    } catch (error) {
      console.error('Error removing duplicate:', error);
      toast.error('Failed to remove duplicate');
    }
  };

  const removeAllDuplicatesInGroup = (groupIndex: number) => {
    const group = duplicates[groupIndex];
    if (group.characters.length <= 1) return;
    
    // Keep the first character, remove the rest
    const toKeep = group.characters[0];
    const toRemove = group.characters.slice(1);
    
    toRemove.forEach(char => {
      removeDuplicate(char, groupIndex);
    });
    
    toast.success(`Kept ${toKeep.name}, removed ${toRemove.length} duplicates`);
  };

  useEffect(() => {
    scanForDuplicates();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Duplicate Character Finder
            </span>
            <Button 
              onClick={scanForDuplicates}
              disabled={isScanning}
              size="sm"
              variant="outline"
            >
              {isScanning ? 'Scanning...' : 'Scan Again'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {duplicates.length === 0 ? (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                {isScanning ? 'Scanning for duplicates...' : 'No duplicate characters found!'}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Found {duplicates.length} groups with duplicate characters. You can remove the duplicates you don't want to keep.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {duplicates.map((group, groupIndex) => (
                  <Card key={groupIndex} className="border-red-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.name}</span>
                          <Badge variant="destructive">
                            {group.duplicateType === 'exact_name' && 'Same Name'}
                            {group.duplicateType === 'exact_id' && 'Same ID'}
                            {group.duplicateType === 'recent_creation' && 'Recent Creation'}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => removeAllDuplicatesInGroup(groupIndex)}
                          size="sm"
                          variant="destructive"
                        >
                          Remove All Duplicates
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {group.characters.map((character, charIndex) => (
                          <div key={character.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex-1">
                              <div className="font-medium">{character.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {character.id.slice(0, 16)}...
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(character.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {charIndex === 0 && (
                                <Badge variant="outline">Keep This One</Badge>
                              )}
                              <Button
                                onClick={() => removeDuplicate(character, groupIndex)}
                                size="sm"
                                variant="destructive"
                                className="flex items-center gap-1"
                              >
                                <Trash className="w-3 h-3" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DuplicateCharacterFinder;