import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Bug, Database, ArrowClockwise, Trash, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { fileStorage } from '@/lib/fileStorage';

export function PersistenceDebugger() {
  const { house, updateHouse } = useHouseFileStorage();
  const [testKey, setTestKey] = useState('test-persistence-key');
  const [testValue, setTestValue] = useState('test-value-123');
  const [isOpen, setIsOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});

  const updateStorageInfo = () => {
    try {
      const info: any = {
        totalKeys: 0, // browserStorage disabled
        quota: 'unknown',
        used: 'unknown',
        houseKeyExists: false, // browserStorage disabled
        houseDataSize: 0,
        lastModified: 'unknown'
      };

      // Try to get storage estimate
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          setStorageInfo(prev => ({
            ...prev,
            quota: estimate.quota ? `${(estimate.quota / 1024 / 1024).toFixed(1)} MB` : 'unknown',
            used: estimate.usage ? `${(estimate.usage / 1024 / 1024).toFixed(1)} MB` : 'unknown'
          }));
        });
      }

      // browserStorage disabled
      // const houseData = browserStorage.getItem('character-house');
      const houseData = null;
      if (houseData) {
        info.houseDataSize = `${(houseData.length / 1024).toFixed(1)} KB`;
        try {
          const parsed = JSON.parse(houseData);
          if (parsed.updatedAt) {
            info.lastModified = new Date(parsed.updatedAt).toLocaleString();
          }
        } catch (e) {
          // ignore
        }
      }

      setStorageInfo(info);
    } catch (error) {
      console.error('Error getting storage info:', error);
    }
  };

  const runPersistenceTest = () => {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Basic browserStorage write/read
    try {
      browserStorage.setItem(testKey, testValue);
      const readValue = browserStorage.getItem(testKey);
      results.tests.push({
        name: 'Basic browserStorage',
        passed: readValue === testValue,
        expected: testValue,
        actual: readValue
      });
    } catch (error) {
      results.tests.push({
        name: 'Basic browserStorage',
        passed: false,
        error: error.message
      });
    }

    // Test 2: JSON serialization
    try {
      const testObj = { test: 'value', number: 123, array: [1, 2, 3] };
      browserStorage.setItem(`${testKey}-json`, JSON.stringify(testObj));
      const readJson = browserStorage.getItem(`${testKey}-json`);
      if (readJson) {
        const parsed = JSON.parse(readJson);
        results.tests.push({
          name: 'JSON serialization',
          passed: JSON.stringify(parsed) === JSON.stringify(testObj),
          expected: testObj,
          actual: parsed
        });
      } else {
        results.tests.push({
          name: 'JSON serialization',
          passed: false,
          error: 'Failed to read JSON from browserStorage'
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'JSON serialization',
        passed: false,
        error: error.message
      });
    }

    // Test 3: House data persistence
    try {
      // For now, just check if house object exists from the hook
      const hasApiKey = !!(house?.aiSettings?.textApiKey || house?.aiSettings?.apiKey);
      const characterCount = house?.characters?.length || 0;

      results.tests.push({
        name: 'House data persistence',
        passed: !!house,
        hasApiKey,
        characterCount,
        dataSize: house ? JSON.stringify(house).length : 0
      });
    } catch (error) {
      results.tests.push({
        name: 'House data persistence',
        passed: false,
        error: error.message
      });
    }

    // Test 4: Page reload persistence
    results.tests.push({
      name: 'Page reload test',
      instruction: 'Reload the page and check if test data persists',
      checkKey: testKey,
      expectedValue: testValue
    });

    setTestResults(results);

    // Clean up test keys
    browserStorage.removeItem(testKey);
    browserStorage.removeItem(`${testKey}-json`);
  };

  const checkReloadPersistence = () => {
    const savedValue = browserStorage.getItem(testKey);
    const results = { ...testResults };

    if (results.tests) {
      const reloadTest = results.tests.find((t: any) => t.name === 'Page reload test');
      if (reloadTest) {
        reloadTest.passed = savedValue === testValue;
        reloadTest.actual = savedValue;
        setTestResults(results);
      }
    }

    // Clean up
    browserStorage.removeItem(testKey);
  };

  const clearAllData = () => {
    if (confirm('This will delete ALL browserStorage data including your characters and settings. Are you sure?')) {
      browserStorage.clear();
      toast.success('All data cleared');
      updateStorageInfo();
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const exportDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      storageInfo,
      testResults,
      houseData: house,
      allKeys: Object.keys(browserStorage),
      browserStorageDump: Object.fromEntries(
        Object.keys(browserStorage).map(key => [key, browserStorage.getItem(key)])
      )
    };

    const dataStr = JSON.stringify(debugData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dollhouse-debug-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Debug data exported');
  };

  useEffect(() => {
    if (isOpen) {
      updateStorageInfo();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bug size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug size={20} />
            Persistence Debugger
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6">
            {/* Storage Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database size={18} />
                  Storage Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Keys</div>
                    <div className="text-muted-foreground">{storageInfo.totalKeys}</div>
                  </div>
                  <div>
                    <div className="font-medium">Storage Quota</div>
                    <div className="text-muted-foreground">{storageInfo.quota}</div>
                  </div>
                  <div>
                    <div className="font-medium">Used Space</div>
                    <div className="text-muted-foreground">{storageInfo.used}</div>
                  </div>
                  <div>
                    <div className="font-medium">House Data Size</div>
                    <div className="text-muted-foreground">{storageInfo.houseDataSize}</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={updateStorageInfo} variant="outline" size="sm">
                    <ArrowClockwise size={14} className="mr-1" />
                    Refresh
                  </Button>
                  <Button onClick={exportDebugData} variant="outline" size="sm">
                    Export Debug Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Persistence Tests */}
            <Card>
              <CardHeader>
                <CardTitle>Persistence Tests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Test Key</Label>
                    <Input
                      value={testKey}
                      onChange={(e) => setTestKey(e.target.value)}
                      placeholder="test-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Test Value</Label>
                    <Input
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      placeholder="test-value"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={runPersistenceTest}>
                    Run Tests
                  </Button>
                  <Button onClick={checkReloadPersistence} variant="outline">
                    Check Reload Persistence
                  </Button>
                  <Button onClick={clearAllData} variant="destructive">
                    <Trash size={14} className="mr-1" />
                    Clear All Data
                  </Button>
                </div>

                {testResults.tests && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Test Results:</h4>
                    {testResults.tests.map((test: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        {test.passed === true ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : test.passed === false ? (
                          <XCircle size={16} className="text-red-500" />
                        ) : (
                          <Warning size={16} className="text-yellow-500" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{test.name}</div>
                          {test.instruction && (
                            <div className="text-sm text-muted-foreground">{test.instruction}</div>
                          )}
                          {test.error && (
                            <div className="text-sm text-red-500">{test.error}</div>
                          )}
                          {test.hasApiKey !== undefined && (
                            <div className="text-sm">
                              API Key: {test.hasApiKey ? 'Present' : 'Missing'} |
                              Characters: {test.characterCount}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Troubleshooting Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Warning className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Common causes of data loss:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Browser clearing data when storage quota is exceeded</li>
                      <li>• Browser extensions or privacy settings clearing browserStorage</li>
                      <li>• Incognito/private browsing mode</li>
                      <li>• Browser crashes or forced shutdowns</li>
                      <li>• Antivirus software interfering with storage</li>
                      <li>• Multiple tabs/windows causing race conditions</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium">Quick Checks:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Are you in incognito/private browsing mode?</li>
                    <li>• Do you have browser extensions that clear data?</li>
                    <li>• Is your browser's storage quota exceeded?</li>
                    <li>• Are you using multiple tabs of the app simultaneously?</li>
                    <li>• Have you recently cleared browser data?</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Recommendations:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Use regular browsing mode (not incognito)</li>
                    <li>• Disable extensions that clear browsing data</li>
                    <li>• Export your data regularly as backup</li>
                    <li>• Use only one tab of the app at a time</li>
                    <li>• Check browser settings for storage limits</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}