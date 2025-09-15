/**
 * Emergency Data Repair Utility
 * 
 * Fixes corrupted localStorage data and helps recover from editing mistakes
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, RefreshCw, Wrench, Database } from 'lucide-react';
import { toast } from 'sonner';
import { House, Character } from '@/types';

interface DataIssue {
  key: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  autoFixable: boolean;
  description: string;
}

const DEFAULT_HOUSE_TEMPLATE: Partial<House> = {
  id: 'main-house',
  name: 'My Character House',
  description: 'A cozy place for your AI companions',
  rooms: [
    {
      id: 'common-room',
      name: 'Common Room',
      description: 'A shared space for everyone to gather',
      type: 'shared',
      capacity: 10,
      residents: [],
      facilities: ['chat', 'games'],
      unlocked: true,
      decorations: [],
      createdAt: new Date()
    }
  ],
  currency: 1000,
  worldPrompt: 'Welcome to your Character Creator House!',
  copilotPrompt: 'You are a helpful House Manager AI.',
  copilotMaxTokens: 75,
  autoCreator: {
    enabled: false,
    interval: 30,
    maxCharacters: 20,
    themes: ['college', 'prime', 'fresh']
  },
  aiSettings: {
    textProvider: 'openrouter',
    textModel: 'deepseek/deepseek-chat-v3.1',
    textApiKey: '',
    textApiUrl: '',
    imageProvider: 'venice',
    imageModel: 'lustify-sdxl',
    imageApiKey: '',
    imageApiUrl: ''
  },
  characters: [], // Empty characters array
  createdAt: new Date(),
  updatedAt: new Date()
};

export function EmergencyDataRepair() {
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [manualData, setManualData] = useState('');
  const [backupCreated, setBackupCreated] = useState(false);

  const scanForIssues = () => {
    setIsScanning(true);
    const foundIssues: DataIssue[] = [];

    try {
      // Check character-house data
      const houseData = localStorage.getItem('character-house');
      
      if (!houseData) {
        foundIssues.push({
          key: 'character-house',
          issue: 'missing',
          severity: 'error',
          autoFixable: true,
          description: 'No house data found. Can create default house.'
        });
      } else {
        try {
          const parsed = JSON.parse(houseData);
          
          // Check for missing characters array
          if (!parsed.characters) {
            foundIssues.push({
              key: 'character-house',
              issue: 'missing_characters_array',
              severity: 'error',
              autoFixable: true,
              description: 'Missing characters array. This causes the "length" error.'
            });
          } else if (!Array.isArray(parsed.characters)) {
            foundIssues.push({
              key: 'character-house',
              issue: 'invalid_characters_type',
              severity: 'error',
              autoFixable: true,
              description: 'Characters field is not an array.'
            });
          }

          // Check for missing required fields
          const requiredFields = ['id', 'name', 'rooms', 'currency'];
          requiredFields.forEach(field => {
            if (!parsed[field]) {
              foundIssues.push({
                key: 'character-house',
                issue: `missing_${field}`,
                severity: field === 'rooms' ? 'error' : 'warning',
                autoFixable: true,
                description: `Missing required field: ${field}`
              });
            }
          });

          // Check rooms array
          if (parsed.rooms && !Array.isArray(parsed.rooms)) {
            foundIssues.push({
              key: 'character-house',
              issue: 'invalid_rooms_type',
              severity: 'error',
              autoFixable: true,
              description: 'Rooms field is not an array.'
            });
          } else if (!parsed.rooms || parsed.rooms.length === 0) {
            foundIssues.push({
              key: 'character-house',
              issue: 'no_rooms',
              severity: 'warning',
              autoFixable: true,
              description: 'No rooms found. Will create default room.'
            });
          }

        } catch (parseError) {
          foundIssues.push({
            key: 'character-house',
            issue: 'invalid_json',
            severity: 'error',
            autoFixable: true,
            description: 'Data is not valid JSON. Can attempt to repair or reset.'
          });
        }
      }

      // Check other keys for corruption
      Object.keys(localStorage).forEach(key => {
        if (key === 'character-house') return; // Already checked

        try {
          const value = localStorage.getItem(key);
          if (value) {
            JSON.parse(value);
          }
        } catch (error) {
          foundIssues.push({
            key,
            issue: 'invalid_json',
            severity: 'warning',
            autoFixable: false,
            description: 'Contains invalid JSON data.'
          });
        }
      });

      setIssues(foundIssues);
      
      if (foundIssues.length === 0) {
        toast.success('No issues found!');
      } else {
        toast.warning(`Found ${foundIssues.length} issues`);
      }
      
    } catch (error) {
      console.error('Error scanning for issues:', error);
      toast.error('Failed to scan for issues');
    } finally {
      setIsScanning(false);
    }
  };

  const createBackup = () => {
    try {
      const backup: Record<string, string | null> = {};
      Object.keys(localStorage).forEach(key => {
        backup[key] = localStorage.getItem(key);
      });

      const backupData = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dollhouse-backup-corrupted-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setBackupCreated(true);
      toast.success('Backup created successfully');
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast.error('Failed to create backup');
    }
  };

  const autoRepairIssues = async () => {
    if (!backupCreated) {
      toast.error('Please create a backup first');
      return;
    }

    setIsRepairing(true);

    try {
      const autoFixableIssues = issues.filter(issue => issue.autoFixable);
      
      if (autoFixableIssues.length === 0) {
        toast.info('No auto-fixable issues found');
        return;
      }

      // Repair character-house data
      const houseIssues = autoFixableIssues.filter(issue => issue.key === 'character-house');
      
      if (houseIssues.length > 0) {
        let repairedHouse = { ...DEFAULT_HOUSE_TEMPLATE };
        
        // Try to preserve existing data
        const existingData = localStorage.getItem('character-house');
        if (existingData) {
          try {
            const parsed = JSON.parse(existingData);
            
            // Preserve good data, fix bad data
            repairedHouse = {
              ...repairedHouse,
              ...parsed,
              characters: Array.isArray(parsed.characters) ? parsed.characters : [],
              rooms: Array.isArray(parsed.rooms) && parsed.rooms.length > 0 
                ? parsed.rooms 
                : DEFAULT_HOUSE_TEMPLATE.rooms,
              updatedAt: new Date()
            };
            
          } catch (error) {
            console.log('Could not parse existing data, using defaults');
          }
        }

        // Save repaired data
        localStorage.setItem('character-house', JSON.stringify(repairedHouse, null, 2));
        toast.success('Repaired house data');
      }

      // Re-scan for issues
      setTimeout(() => {
        scanForIssues();
        toast.success('Auto-repair completed');
      }, 500);

    } catch (error) {
      console.error('Auto-repair failed:', error);
      toast.error('Auto-repair failed');
    } finally {
      setIsRepairing(false);
    }
  };

  const resetToDefaults = () => {
    if (!confirm('This will reset your house to default settings. Are you sure?')) {
      return;
    }

    try {
      localStorage.setItem('character-house', JSON.stringify(DEFAULT_HOUSE_TEMPLATE, null, 2));
      toast.success('Reset to default house data');
      scanForIssues();
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset data');
    }
  };

  const applyManualFix = () => {
    if (!manualData.trim()) {
      toast.error('Please enter data to apply');
      return;
    }

    try {
      const parsed = JSON.parse(manualData);
      localStorage.setItem('character-house', JSON.stringify(parsed, null, 2));
      toast.success('Manual fix applied');
      scanForIssues();
      setManualData('');
    } catch (error) {
      toast.error('Invalid JSON data');
    }
  };

  const loadCurrentData = () => {
    const data = localStorage.getItem('character-house');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setManualData(JSON.stringify(parsed, null, 2));
      } catch (error) {
        setManualData(data);
      }
    } else {
      setManualData(JSON.stringify(DEFAULT_HOUSE_TEMPLATE, null, 2));
    }
  };

  useEffect(() => {
    scanForIssues();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Emergency Data Repair
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This tool helps fix corrupted localStorage data. <strong>Always create a backup first!</strong>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 mb-4">
            <Button 
              onClick={scanForIssues} 
              disabled={isScanning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan for Issues'}
            </Button>
            
            <Button 
              onClick={createBackup}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Create Backup
              {backupCreated && <CheckCircle className="w-4 h-4 text-green-500" />}
            </Button>
          </div>

          {/* Issues Display */}
          {issues.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="font-medium">Found Issues:</h4>
              {issues.map((issue, index) => (
                <Alert key={index} variant={issue.severity === 'error' ? 'destructive' : 'default'}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{issue.key}</span>
                        {issue.autoFixable && (
                          <Badge variant="outline">Auto-fixable</Badge>
                        )}
                      </div>
                      <AlertDescription>{issue.description}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Repair Actions */}
          {issues.some(issue => issue.autoFixable) && (
            <div className="flex gap-2 mb-4">
              <Button 
                onClick={autoRepairIssues}
                disabled={isRepairing || !backupCreated}
                className="flex items-center gap-2"
              >
                <Wrench className={`w-4 h-4 ${isRepairing ? 'animate-spin' : ''}`} />
                {isRepairing ? 'Repairing...' : 'Auto-Repair Issues'}
              </Button>
              
              <Button 
                onClick={resetToDefaults}
                variant="destructive"
                disabled={!backupCreated}
              >
                Reset to Defaults
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Data Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadCurrentData} variant="outline" size="sm">
              Load Current Data
            </Button>
            <Button onClick={() => setManualData(JSON.stringify(DEFAULT_HOUSE_TEMPLATE, null, 2))} variant="outline" size="sm">
              Load Default Template
            </Button>
          </div>
          
          <div>
            <Label>House Data JSON:</Label>
            <Textarea
              value={manualData}
              onChange={(e) => setManualData(e.target.value)}
              className="font-mono text-xs h-64 mt-2"
              placeholder="Paste your house data JSON here..."
            />
          </div>
          
          <Button onClick={applyManualFix} disabled={!backupCreated}>
            Apply Manual Fix
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmergencyDataRepair;