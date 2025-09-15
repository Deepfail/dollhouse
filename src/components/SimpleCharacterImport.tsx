/**
 * SimpleCharacterImport Component
 * 
 * A straightforward way to import characters directly into the current localStorage system
 * No complex migration - just simple character importing
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { Character } from '@/types';
import { toast } from 'sonner';

export function SimpleCharacterImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewCharacters, setPreviewCharacters] = useState<Character[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Extract characters from different possible structures
      let characters: Character[] = [];
      
      if (Array.isArray(data)) {
        // Direct array of characters
        characters = data;
      } else if (data.characters && Array.isArray(data.characters)) {
        // House object with characters array
        characters = data.characters;
      } else if (data.house && data.house.characters) {
        // Nested house structure
        characters = data.house.characters;
      }
      
      // Validate characters
      const validCharacters = characters.filter(char => 
        char && 
        typeof char === 'object' && 
        char.id && 
        char.name
      );
      
      setPreviewCharacters(validCharacters);
      
      if (validCharacters.length === 0) {
        toast.error('No valid characters found in the file');
      } else {
        toast.success(`Found ${validCharacters.length} characters to import`);
      }
      
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file - make sure it\'s a valid JSON file');
      setPreviewCharacters([]);
    }
  };

  const importCharacters = async () => {
    if (previewCharacters.length === 0) {
      toast.error('No characters to import');
      return;
    }

    setIsImporting(true);
    
    try {
      // localStorage import disabled - use file storage instead
      toast.info('localStorage import disabled - please use the file-based character import system');
      return;
      let skippedCount = 0;
      
      for (const character of previewCharacters) {
        if (existingIds.has(character.id)) {
          skippedCount++;
          console.log(`Skipping duplicate character: ${character.name} (${character.id})`);
        } else {
          // Ensure character has a roomId
          if (!character.roomId) {
            character.roomId = 'common-room';
          }
          
          currentData.characters.push(character);
          addedCount++;
        }
      }
      
      // Update timestamps
      currentData.updatedAt = new Date().toISOString();
      
      // localStorage disabled
      // localStorage.setItem('character-house', JSON.stringify(currentData));
      
      // Show results
      if (addedCount > 0) {
        toast.success(`Successfully imported ${addedCount} characters!`);
      }
      if (skippedCount > 0) {
        toast.info(`Skipped ${skippedCount} duplicate characters`);
      }
      
      // Reset form
      setSelectedFile(null);
      setPreviewCharacters([]);
      
      // Reset file input
      const fileInput = document.getElementById('character-import-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import characters: ' + error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Simple Character Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              This tool imports characters directly into your current localStorage system. 
              Just select your JSON file and import - no complex migration needed!
            </AlertDescription>
          </Alert>

          {/* File Selection */}
          <div className="space-y-2">
            <label htmlFor="character-import-file" className="text-sm font-medium">
              Select Character File
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById('character-import-file')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Choose JSON File
              </Button>
              {selectedFile && (
                <Badge variant="outline" className="px-3 py-1">
                  {selectedFile.name}
                </Badge>
              )}
            </div>
            <input
              id="character-import-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Character Preview */}
          {previewCharacters.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                Characters to Import
                <Badge>{previewCharacters.length}</Badge>
              </h4>
              
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-3">
                {previewCharacters.map((character, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <div className="font-medium">{character.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {character.id.slice(0, 16)}...
                      </div>
                    </div>
                    <Badge variant="outline">
                      {character.rarity || 'common'}
                    </Badge>
                  </div>
                ))}
              </div>

              <Button 
                onClick={importCharacters}
                disabled={isImporting}
                className="w-full flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {isImporting ? 'Importing...' : `Import ${previewCharacters.length} Characters`}
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <div><strong>Supported formats:</strong></div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Direct character array: <code>[{"{"}"id": "...", "name": "..."{"}"}, ...]</code></li>
              <li>House object: <code>{"{"}"characters": [...]{"}"}</code></li>
              <li>Your old-data.json file format</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SimpleCharacterImport;