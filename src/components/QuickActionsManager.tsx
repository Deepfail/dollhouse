import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuickActions, QuickAction } from '@/hooks/useQuickActions';
import { toast } from 'sonner';
import { 
  Plus,
  Trash,
  Gear,
  House,
  Bed,
  Heart,
  ChartBar,
  Star,
  Lightning,
  Shield,
  Gift
} from '@phosphor-icons/react';

const ICON_OPTIONS = [
  { value: 'House', label: 'House', icon: House },
  { value: 'Bed', label: 'Bed', icon: Bed },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'ChartBar', label: 'Chart', icon: ChartBar },
  { value: 'Star', label: 'Star', icon: Star },
  { value: 'Lightning', label: 'Lightning', icon: Lightning },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Gift', label: 'Gift', icon: Gift }
];

export function QuickActionsManager() {
  const { quickActions, addQuickAction, updateQuickAction, removeQuickAction, resetQuickActions } = useQuickActions();
  const [isOpen, setIsOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickAction | null>(null);
  const [newAction, setNewAction] = useState({
    label: '',
    icon: 'Star',
    action: '',
    enabled: true
  });

  const handleAddAction = () => {
    if (!newAction.label.trim() || !newAction.action.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    addQuickAction({
      ...newAction,
      customizable: true
    });

    setNewAction({
      label: '',
      icon: 'Star',
      action: '',
      enabled: true
    });

    toast.success('Quick action added successfully');
  };

  const handleUpdateAction = (action: QuickAction) => {
    if (!action.label.trim()) {
      toast.error('Label is required');
      return;
    }

    updateQuickAction(action.id, action);
    setEditingAction(null);
    toast.success('Quick action updated');
  };

  const handleRemoveAction = (actionId: string) => {
    removeQuickAction(actionId);
    setEditingAction(null);
    toast.success('Quick action removed');
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Star;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Gear size={16} />
          Customize Actions
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Quick Actions Manager</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Current Actions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Current Actions</h3>
              <Button variant="outline" size="sm" onClick={resetQuickActions}>
                Reset to Default
              </Button>
            </div>
            
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {quickActions.map(action => {
                  const IconComponent = getIconComponent(action.icon);
                  
                  return (
                    <Card key={action.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent size={20} className="text-accent" />
                          <div>
                            <p className="font-medium">{action.label}</p>
                            <p className="text-xs text-muted-foreground">
                              Action: {action.action}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={action.enabled}
                            onCheckedChange={(enabled) => 
                              updateQuickAction(action.id, { enabled })
                            }
                          />
                          
                          {action.customizable && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingAction(action)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAction(action.id)}
                                className="text-destructive"
                              >
                                <Trash size={16} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Add New Action */}
          <div>
            <h3 className="font-medium mb-4">Add New Action</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-label">Label</Label>
                  <Input
                    id="new-label"
                    value={newAction.label}
                    onChange={(e) => setNewAction(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Boost Mood"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-icon">Icon</Label>
                  <Select value={newAction.icon} onValueChange={(icon) => setNewAction(prev => ({ ...prev, icon }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(option => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent size={16} />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="new-action">Action Code</Label>
                <Input
                  id="new-action"
                  value={newAction.action}
                  onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))}
                  placeholder="e.g., boostMood or custom JavaScript code"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter predefined action name or custom code to execute
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={newAction.enabled}
                  onCheckedChange={(enabled) => setNewAction(prev => ({ ...prev, enabled }))}
                />
                <Label>Enabled by default</Label>
              </div>
              
              <Button onClick={handleAddAction} className="w-full">
                <Plus size={16} className="mr-2" />
                Add Quick Action
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Action Dialog */}
        {editingAction && (
          <Dialog open={!!editingAction} onOpenChange={() => setEditingAction(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Quick Action</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-label">Label</Label>
                  <Input
                    id="edit-label"
                    value={editingAction.label}
                    onChange={(e) => setEditingAction(prev => 
                      prev ? { ...prev, label: e.target.value } : null
                    )}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-icon">Icon</Label>
                  <Select 
                    value={editingAction.icon} 
                    onValueChange={(icon) => setEditingAction(prev => 
                      prev ? { ...prev, icon } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(option => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent size={16} />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-action">Action Code</Label>
                  <Input
                    id="edit-action"
                    value={editingAction.action}
                    onChange={(e) => setEditingAction(prev => 
                      prev ? { ...prev, action: e.target.value } : null
                    )}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingAction.enabled}
                    onCheckedChange={(enabled) => setEditingAction(prev => 
                      prev ? { ...prev, enabled } : null
                    )}
                  />
                  <Label>Enabled</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleUpdateAction(editingAction)}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingAction(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}