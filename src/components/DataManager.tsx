import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Database, 
  Download, 
  Upload, 
  Trash, 
  Eye,
  PencilSimple as Edit,
  FloppyDisk as Save,
  ArrowCounterClockwise as RotateCcw,
  FileText,
  Key
} from '@phosphor-icons/react';
import { StorageMigration } from './StorageMigration';
import { FileStorageTest } from './FileStorageTest';
import { EmergencyDataRepair } from './EmergencyDataRepair';
import { SimpleCharacterImport } from './SimpleCharacterImport';
import { DuplicateCharacterFinder } from './DuplicateCharacterFinder';

export function DataManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<string>('');
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh localStorage keys
  const refreshKeys = () => {
    const keys = Object.keys(localStorage).sort();
    setLocalStorageKeys(keys);
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (isOpen) {
      refreshKeys();
    }
  }, [isOpen]);

  const getStorageData = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return localStorage.getItem(key); // Return as string if not JSON
    }
  };

  const getFormattedData = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return '';
      
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return localStorage.getItem(key) || '';
    }
  };

  const handleEditData = (key: string) => {
    setSelectedKey(key);
    setEditingData(getFormattedData(key));
  };

  const handleSaveData = () => {
    if (!selectedKey) return;

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(editingData);
      localStorage.setItem(selectedKey, JSON.stringify(parsed));
      toast.success('Data saved successfully');
    } catch (error) {
      // Save as string if not valid JSON
      localStorage.setItem(selectedKey, editingData);
      toast.success('Data saved as string');
    }

    setSelectedKey(null);
    setEditingData('');
    refreshKeys();
  };

  const handleDeleteKey = (key: string) => {
    if (confirm(`Are you sure you want to delete "${key}"?`)) {
      localStorage.removeItem(key);
      toast.success('Data deleted');
      if (selectedKey === key) {
        setSelectedKey(null);
        setEditingData('');
      }
      refreshKeys();
    }
  };

  const handleExportAll = () => {
    const allData: Record<string, any> = {};
    
    localStorageKeys.forEach(key => {
      allData[key] = getStorageData(key);
    });

    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dollhouse-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully');
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        
        toast.success('Data imported successfully');
        refreshKeys();
      } catch (error) {
        toast.error('Failed to import data: Invalid JSON');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const getDataSize = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? `${(data.length / 1024).toFixed(1)} KB` : '0 KB';
  };

  const getDataType = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return 'empty';
      
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return 'array';
      if (typeof parsed === 'object') return 'object';
      return typeof parsed;
    } catch {
      return 'string';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database size={16} />
          Data Manager
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database size={20} />
            Data Manager - Storage Systems
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList>
            <TabsTrigger value="import">📥 Import Characters</TabsTrigger>
            <TabsTrigger value="duplicates">🔍 Find Duplicates</TabsTrigger>
            <TabsTrigger value="repair">🚨 Emergency Repair</TabsTrigger>
            <TabsTrigger value="migration">Storage Migration</TabsTrigger>
            <TabsTrigger value="test">Test Storage</TabsTrigger>
            <TabsTrigger value="browser">localStorage Browser</TabsTrigger>
            <TabsTrigger value="export">Import/Export</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <SimpleCharacterImport />
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-4">
            <DuplicateCharacterFinder />
          </TabsContent>

          <TabsContent value="repair" className="space-y-4">
            <EmergencyDataRepair />
          </TabsContent>

          <TabsContent value="migration" className="space-y-4">
            <StorageMigration />
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <FileStorageTest />
          </TabsContent>

          <TabsContent value="browser" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{localStorageKeys.length} Keys</Badge>
                <Badge variant="outline">{localStorage.length} Total Items</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={refreshKeys}>
                <RotateCcw size={16} className="mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Keys List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Storage Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {localStorageKeys.map(key => (
                        <Card key={key} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Key size={14} />
                                <p className="font-mono text-xs truncate">{key}</p>
                              </div>
                              <div className="flex gap-1 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {getDataType(key)}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {getDataSize(key)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditData(key)}
                              className="h-7 px-2"
                            >
                              <Edit size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKey(key)}
                              className="h-7 px-2 text-red-600"
                            >
                              <Trash size={12} />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Data Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Data Editor</span>
                    {selectedKey && (
                      <Button variant="outline" size="sm" onClick={handleSaveData}>
                        <Save size={14} className="mr-1" />
                        Save
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedKey ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Editing:</Label>
                        <Badge variant="outline" className="font-mono text-xs">
                          {selectedKey}
                        </Badge>
                      </div>
                      <Textarea
                        value={editingData}
                        onChange={(e) => setEditingData(e.target.value)}
                        className="font-mono text-xs h-48 resize-none"
                        placeholder="Edit JSON data here..."
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSaveData}>
                          <Save size={14} className="mr-1" />
                          Save Changes
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedKey(null);
                            setEditingData('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Eye size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Select a key to view and edit its data</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Download size={16} />
                    Export Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download all localStorage data as a JSON file for backup or transfer.
                  </p>
                  <Button onClick={handleExportAll} className="w-full">
                    <Download size={16} className="mr-2" />
                    Export All Data
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload size={16} />
                    Import Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a previously exported JSON file to restore data.
                  </p>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                      id="import-file"
                    />
                    <Label htmlFor="import-file" asChild>
                      <Button variant="outline" className="w-full cursor-pointer">
                        <Upload size={16} className="mr-2" />
                        Choose JSON File
                      </Button>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Main data key: <code className="bg-muted px-1 rounded">character-house</code>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditData('character-house')}
                  >
                    <FileText size={14} className="mr-1" />
                    Edit House Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(getFormattedData('character-house'));
                      toast.success('House data copied to clipboard');
                    }}
                  >
                    Copy House JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}