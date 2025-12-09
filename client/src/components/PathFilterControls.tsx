import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TableRow, PathFilterSettings } from '@/types';
import { hasHierarchicalPaths, getAllPathSegments, getPathPrefixesByDepth } from '@/lib/excelProcessor';

interface PathFilterControlsProps {
  tableRows: TableRow[];
  pathFilterSettings: PathFilterSettings;
  onSettingsChange: (settings: PathFilterSettings) => void;
}

export default function PathFilterControls({
  tableRows,
  pathFilterSettings,
  onSettingsChange,
}: PathFilterControlsProps) {
  const [isPathSectionOpen, setIsPathSectionOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  
  const hasPaths = useMemo(() => hasHierarchicalPaths(tableRows), [tableRows]);
  const allSegments = useMemo(() => getAllPathSegments(tableRows), [tableRows]);
  const prefixesByDepth = useMemo(() => getPathPrefixesByDepth(tableRows), [tableRows]);
  
  // Get all path prefixes (for backward compatibility with hiddenSegments)
  const allPathPrefixes = useMemo(() => {
    const allPrefixes = new Set<string>();
    prefixesByDepth.forEach((prefixes) => {
      prefixes.forEach(prefix => allPrefixes.add(prefix));
    });
    return Array.from(allPrefixes).sort();
  }, [prefixesByDepth]);

  // Get available depth levels
  const availableLevels = useMemo(() => {
    return Array.from(prefixesByDepth.keys()).sort();
  }, [prefixesByDepth]);

  const handleToggle = (enabled: boolean) => {
    if (enabled && !hasPaths) {
      // Don't enable if no paths detected
      return;
    }
    onSettingsChange({
      ...pathFilterSettings,
      enabled,
      // Clear hidden segments when disabling
      hiddenSegments: enabled ? pathFilterSettings.hiddenSegments : new Set(),
    });
  };

  const handleSegmentToggle = (segment: string, checked: boolean) => {
    const newHiddenSegments = new Set(pathFilterSettings.hiddenSegments);
    if (checked) {
      newHiddenSegments.add(segment);
    } else {
      newHiddenSegments.delete(segment);
    }
    onSettingsChange({
      ...pathFilterSettings,
      hiddenSegments: newHiddenSegments,
    });
  };

  const handlePathPrefixToggle = (prefix: string, checked: boolean) => {
    const newHiddenSegments = new Set(pathFilterSettings.hiddenSegments);
    if (checked) {
      newHiddenSegments.add(prefix);
    } else {
      newHiddenSegments.delete(prefix);
    }
    onSettingsChange({
      ...pathFilterSettings,
      hiddenSegments: newHiddenSegments,
    });
  };

  const handleSelectAll = () => {
    if (selectedLevel !== null) {
      // Select all paths at the selected level
      const prefixesAtLevel = prefixesByDepth.get(selectedLevel) || [];
      const newHiddenSegments = new Set(pathFilterSettings.hiddenSegments);
      prefixesAtLevel.forEach(prefix => newHiddenSegments.add(prefix));
      onSettingsChange({
        ...pathFilterSettings,
        hiddenSegments: newHiddenSegments,
      });
    } else {
      // Select all paths at all levels
      onSettingsChange({
        ...pathFilterSettings,
        hiddenSegments: new Set(allPathPrefixes),
      });
    }
  };

  const handleDeselectAll = () => {
    if (selectedLevel !== null) {
      // Deselect all paths at the selected level
      const prefixesAtLevel = prefixesByDepth.get(selectedLevel) || [];
      const newHiddenSegments = new Set(pathFilterSettings.hiddenSegments);
      prefixesAtLevel.forEach(prefix => newHiddenSegments.delete(prefix));
      onSettingsChange({
        ...pathFilterSettings,
        hiddenSegments: newHiddenSegments,
      });
    } else {
      // Deselect all paths at all levels
      onSettingsChange({
        ...pathFilterSettings,
        hiddenSegments: new Set(),
      });
    }
  };

  // Get paths for selected level
  const pathsForSelectedLevel = useMemo(() => {
    if (selectedLevel === null) return [];
    return prefixesByDepth.get(selectedLevel) || [];
  }, [selectedLevel, prefixesByDepth]);

  // Count hidden paths at selected level
  const hiddenCountAtLevel = useMemo(() => {
    if (selectedLevel === null) return pathFilterSettings.hiddenSegments.size;
    return pathsForSelectedLevel.filter(prefix => 
      pathFilterSettings.hiddenSegments.has(prefix)
    ).length;
  }, [selectedLevel, pathsForSelectedLevel, pathFilterSettings.hiddenSegments]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="path-filter-toggle" className="text-sm font-semibold">
            Path Filtering
          </Label>
          <p className="text-xs text-muted-foreground">
            Show top 2 levels by default, expand to see deeper paths (for hierarchical XML-derived fields)
          </p>
        </div>
        <Switch
          id="path-filter-toggle"
          checked={pathFilterSettings.enabled}
          onCheckedChange={handleToggle}
          disabled={!hasPaths}
        />
      </div>

      {pathFilterSettings.enabled && !hasPaths && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2 text-xs">
            Path filtering is enabled but no hierarchical paths were detected in the field names.
            Field names must contain &quot; &gt; &quot; separator to use path filtering.
          </AlertDescription>
        </Alert>
      )}

      {pathFilterSettings.enabled && hasPaths && (
        <Collapsible open={isPathSectionOpen} onOpenChange={setIsPathSectionOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold cursor-pointer">
                  Hide Path Segments
                </Label>
                {pathFilterSettings.hiddenSegments.size > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {pathFilterSettings.hiddenSegments.size}
                  </span>
                )}
              </div>
              {isPathSectionOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 border rounded-md p-3 bg-muted/30 mt-2">
              {/* Level Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Level</Label>
                <Select
                  value={selectedLevel?.toString() || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedLevel(null);
                    } else {
                      setSelectedLevel(parseInt(value, 10));
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {availableLevels.map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Path List for Selected Level */}
              {selectedLevel !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Level {selectedLevel} ({hiddenCountAtLevel}/{pathsForSelectedLevel.length} hidden)
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-xs text-primary hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {pathsForSelectedLevel.map((prefix) => {
                      const isHidden = pathFilterSettings.hiddenSegments.has(prefix);
                      return (
                        <div
                          key={prefix}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-background transition-colors"
                        >
                          <Checkbox
                            id={`path-prefix-${prefix}`}
                            checked={isHidden}
                            onCheckedChange={(checked) =>
                              handlePathPrefixToggle(prefix, checked === true)
                            }
                          />
                          <Label
                            htmlFor={`path-prefix-${prefix}`}
                            className="flex-1 cursor-pointer text-xs"
                          >
                            {prefix}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Levels View */}
              {selectedLevel === null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      All Levels ({pathFilterSettings.hiddenSegments.size}/{allPathPrefixes.length} hidden)
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-xs text-primary hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {availableLevels.map((level) => {
                      const prefixes = prefixesByDepth.get(level) || [];
                      const hiddenAtLevel = prefixes.filter(p => 
                        pathFilterSettings.hiddenSegments.has(p)
                      ).length;
                      return (
                        <div key={level} className="space-y-1">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Level {level} ({hiddenAtLevel}/{prefixes.length})
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Select a specific level above to view and manage paths.
                  </p>
                </div>
              )}

              {pathFilterSettings.hiddenSegments.size > 0 && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Fields containing any selected path will be hidden.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

