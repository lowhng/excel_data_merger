import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface FileRenameSettings {
  enabled: boolean;
  mode: 'first' | 'last';
  characterCount: number;
}

interface FileRenameSettingsProps {
  settings: FileRenameSettings;
  onSettingsChange: (settings: FileRenameSettings) => void;
}

export default function FileRenameSettingsDialog({
  settings,
  onSettingsChange,
}: FileRenameSettingsProps) {
  const [open, setOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<FileRenameSettings>(settings);

  // Sync local settings when prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [settings, open]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    setOpen(false);
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset to original settings when closing
      setLocalSettings(settings);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Rename Files
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File Name Display Settings</DialogTitle>
          <DialogDescription>
            Configure how file names are displayed in the table. You can show
            either the first or last X characters of each file name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-rename"
              checked={localSettings.enabled}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, enabled: checked === true })
              }
            />
            <Label htmlFor="enable-rename" className="cursor-pointer">
              Enable file name renaming
            </Label>
          </div>

          {localSettings.enabled && (
            <>
              <div className="space-y-3">
                <Label>Select characters from:</Label>
                <RadioGroup
                  value={localSettings.mode}
                  onValueChange={(value: 'first' | 'last') =>
                    setLocalSettings({ ...localSettings, mode: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="first" id="first" />
                    <Label htmlFor="first" className="cursor-pointer">
                      First characters
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last" id="last" />
                    <Label htmlFor="last" className="cursor-pointer">
                      Last characters
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="character-count">
                  Number of characters: {localSettings.characterCount}
                </Label>
                <Input
                  id="character-count"
                  type="number"
                  min="1"
                  max="100"
                  value={localSettings.characterCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value > 0) {
                      setLocalSettings({
                        ...localSettings,
                        characterCount: Math.min(100, Math.max(1, value)),
                      });
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

