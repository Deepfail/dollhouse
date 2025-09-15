/**
 * StorageMigration Component
 * 
 * Handles migration from localStorage to the new file-based storage system
 * Shows migration status and allows users to manage the transition
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, FileText, Database, Download, Upload, RefreshCw } from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { toast } from 'sonner';

interface MigrationStatus {
  hasLocalStorage: boolean;
  hasFileStorage: boolean;
  localStorageSize: number;
  fileStorageSize: number;
  needsMigration: boolean;
  canMigrate: boolean;
}

export function StorageMigration() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationStep, setMigrationStep] = useState('');

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      // localStorage migration disabled - no longer needed
      // const houseData = localStorage.getItem('character-house');
      // const localStorageKeys = Object.keys(localStorage);
      const localStorageKeys: string[] = [];
      const localStorageSize = 0;

      // Check file storage
      const houseExists = await fileStorage.fileExists('house');
      const charactersExists = await fileStorage.fileExists('characters');
      
      // Estimate file storage size (this would be more accurate with real file system)
      let fileStorageSize = 0;
      if (houseExists) {
        const houseFileData = await fileStorage.readFile('house');
        fileStorageSize += JSON.stringify(houseFileData).length;
      }
      if (charactersExists) {
        const charactersData = await fileStorage.readFile('characters');
        fileStorageSize += JSON.stringify(charactersData).length;
      }

      // Migration logic disabled - localStorage no longer used
      const hasFileStorageData = houseExists || charactersExists;
      const hasLocalStorageData = false; // Always false now

      const migrationStatus: MigrationStatus = {
        hasLocalStorage: hasLocalStorageData,
        hasFileStorage: hasFileStorageData,
        localStorageSize,
        fileStorageSize,
        needsMigration: hasLocalStorageData && !hasFileStorageData,
        canMigrate: hasLocalStorageData && !hasFileStorageData
      };

      setStatus(migrationStatus);
    } catch (error) {
      console.error('Failed to check migration status:', error);
      toast.error('Failed to check storage status');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const performMigration = async () => {
    if (!status?.canMigrate) return;

    setIsMigrating(true);
    setMigrationProgress(0);
    
    try {
      setMigrationStep('Migration disabled - no localStorage to migrate');
      setMigrationProgress(10);
      
      // localStorage migration disabled
      // const backup = Object.keys(localStorage).reduce((acc, key) => {
      //   acc[key] = localStorage.getItem(key);
      //   return acc;
      // }, {} as Record<string, string | null>);
      
      setMigrationStep('Checking file storage...');
      setMigrationProgress(30);
      
      // Skip actual migration since localStorage is disabled
      // await fileStorage.migrateFromLocalStorage();
      
      setMigrationStep('Verifying storage...');
      setMigrationProgress(70);
      
      // Verify file storage exists
      const houseExists = await fileStorage.fileExists('house');
      const charactersExists = await fileStorage.fileExists('characters');
      
      if (!houseExists) {
        console.warn('No house data in file storage - localStorage migration disabled');
      }
      
      setMigrationStep('Migration completed!');
      setMigrationProgress(100);
      
      // Update status
      await checkMigrationStatus();
      
      toast.success('Migration completed successfully!');
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed: ' + (error as Error).message);
      setMigrationStep('Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const exportData = async () => {
    try {
      const data = await fileStorage.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dollhouse-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await fileStorage.importAllData(text);
      await checkMigrationStatus();
      toast.success('Data imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import data');
    }
  };

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Checking Storage Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Storage Migration Center
          </CardTitle>
          <CardDescription>
            Manage your transition from localStorage to the new file-based storage system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="font-medium">localStorage (Old System)</span>
                <Badge variant={status.hasLocalStorage ? "default" : "secondary"}>
                  {status.hasLocalStorage ? "Has Data" : "Empty"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Size: {formatBytes(status.localStorageSize)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="font-medium">File Storage (New System)</span>
                <Badge variant={status.hasFileStorage ? "default" : "secondary"}>
                  {status.hasFileStorage ? "Has Data" : "Empty"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Size: {formatBytes(status.fileStorageSize)}
              </div>
            </div>
          </div>

          {/* Migration Status */}
          {status.needsMigration && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                You have data in localStorage that needs to be migrated to the new file storage system.
                This will improve performance and make your data easier to manage.
              </AlertDescription>
            </Alert>
          )}

          {status.hasFileStorage && !status.needsMigration && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                Your data has been successfully migrated to the new file storage system!
              </AlertDescription>
            </Alert>
          )}

          {status.hasFileStorage && status.hasLocalStorage && !status.canMigrate && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Both localStorage and file storage contain data. Migration is disabled to prevent overwriting your file storage data.
                Use Export/Import to manage your data or clear localStorage from the Emergency Repair tab.
              </AlertDescription>
            </Alert>
          )}

          {/* Migration Progress */}
          {isMigrating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Migration Progress</span>
                <span className="text-sm text-muted-foreground">{migrationProgress}%</span>
              </div>
              <Progress value={migrationProgress} />
              <div className="text-sm text-muted-foreground">{migrationStep}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {status.canMigrate && (
              <Button 
                onClick={performMigration} 
                disabled={isMigrating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                {isMigrating ? 'Migrating...' : 'Start Migration'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={exportData}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Data
            </Button>
            
            <div className="relative">
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => document.getElementById('file-import')?.click()}
              >
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
              <input
                id="file-import"
                type="file"
                accept=".json"
                onChange={importData}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            
            <Button 
              variant="outline" 
              onClick={checkMigrationStatus}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Benefits of the New File Storage System</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span><strong>Better Organization:</strong> Separate files for house data, characters, settings, and chats</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span><strong>Easy Backup:</strong> Individual files can be backed up and restored separately</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span><strong>User-Friendly:</strong> Data stored in readable JSON files</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span><strong>Performance:</strong> Faster loading and saving of individual data components</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span><strong>Automatic Backups:</strong> System creates backups before saving changes</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default StorageMigration;