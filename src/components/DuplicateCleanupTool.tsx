import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { cleanupDuplicateCharacters, previewDuplicateCleanup } from '@/utils/duplicateCleanup';
import { toast } from 'sonner';
import { Trash, Eye } from '@phosphor-icons/react';

export const DuplicateCleanupTool: React.FC = () => {
  const { house, updateHouse } = useHouseFileStorage();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [duplicatePreview, setDuplicatePreview] = useState<any>(null);

  const handlePreviewCleanup = async () => {
    try {
      const preview = previewDuplicateCleanup(house);
      setDuplicatePreview(preview);
      
      if (preview.removedCount === 0) {
        toast.success('No duplicate characters found!');
      } else {
        toast.info(`Found ${preview.removedCount} duplicate characters that can be removed`);
      }
    } catch (error) {
      console.error('Error previewing cleanup:', error);
      toast.error('Failed to preview cleanup');
    }
  };
  
  const handleCleanupDuplicates = async () => {
    if (!duplicatePreview || duplicatePreview.removedCount === 0) {
      toast.warning('No duplicates to clean up');
      return;
    }
    
    setIsCleaningUp(true);
    try {
      const { cleanedHouse, result } = cleanupDuplicateCharacters(house);
      await updateHouse(cleanedHouse);
      
      setDuplicatePreview(null);
      toast.success(`Cleaned up ${result.removedCount} duplicate characters, kept ${result.keptCount} characters`);
      
      // Log the cleanup results
      console.log('Duplicate cleanup results:');
      result.duplicateGroups.forEach(group => {
        console.log(`${group.name}: kept ${group.keptCharacter.id}, removed ${group.removedCharacters.length} duplicates`);
      });
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      toast.error('Failed to clean up duplicates');
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash size={18} />
          Character Duplicate Cleanup
        </CardTitle>
        <CardDescription>
          Remove duplicate characters while preserving the version with the most progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Finds characters with the same name</li>
            <li>• Keeps the version with conversation history, memories, and highest progression</li>
            <li>• Removes duplicates from storage and room assignments</li>
            <li>• Safe to run multiple times</li>
          </ul>
        </div>
        
        {duplicatePreview && (
          <div className="p-3 bg-background rounded border">
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Eye size={16} />
              Cleanup Preview:
            </h5>
            {duplicatePreview.removedCount === 0 ? (
              <p className="text-sm text-green-600">✅ No duplicates found!</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong className="text-red-600">{duplicatePreview.removedCount}</strong> duplicate characters will be removed.
                  <strong className="text-green-600 ml-2">{duplicatePreview.keptCount}</strong> characters will be kept.
                </p>
                <div className="space-y-1">
                  {duplicatePreview.duplicateGroups.map((group: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-muted rounded">
                      <strong>{group.name}:</strong> Keeping character with more progress/history, 
                      removing {group.removedCharacters.length} duplicate(s)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={handlePreviewCleanup}
            variant="outline"
            className="flex-1"
          >
            <Eye size={16} className="mr-2" />
            Preview Cleanup
          </Button>
          
          {duplicatePreview && duplicatePreview.removedCount > 0 && (
            <Button 
              onClick={handleCleanupDuplicates}
              disabled={isCleaningUp}
              variant="destructive"
              className="flex-1"
            >
              <Trash size={16} className="mr-2" />
              {isCleaningUp ? 'Cleaning...' : `Remove ${duplicatePreview.removedCount} Duplicates`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};