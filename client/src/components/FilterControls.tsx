import { useState, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, X, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { UploadedFile } from '@/types';

export interface FilterSettings {
  selectedFileIds: Set<string>;
  fieldNameSearch: string;
  fieldPresenceFilter: 'all' | 'all-selected' | 'any-selected' | 'exactly';
  exactCount?: number;
  fileSort?: 'none' | 'name-asc' | 'name-desc';
}

interface FilterControlsProps {
  uploadedFiles: UploadedFile[];
  filterSettings: FilterSettings;
  onFilterChange: (settings: FilterSettings) => void;
}

export default function FilterControls({
  uploadedFiles,
  filterSettings,
  onFilterChange,
}: FilterControlsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleFileToggle = (fileId: string, checked: boolean) => {
    const newSelectedFileIds = new Set(filterSettings.selectedFileIds);
    if (checked) {
      newSelectedFileIds.add(fileId);
    } else {
      newSelectedFileIds.delete(fileId);
    }
    onFilterChange({
      ...filterSettings,
      selectedFileIds: newSelectedFileIds,
    });
  };

  const handleSelectAllFiles = () => {
    const allFileIds = new Set(uploadedFiles.map((f) => f.id));
    onFilterChange({
      ...filterSettings,
      selectedFileIds: allFileIds,
    });
  };

  const handleDeselectAllFiles = () => {
    onFilterChange({
      ...filterSettings,
      selectedFileIds: new Set(),
    });
  };

  const handleFieldNameSearchChange = (value: string) => {
    onFilterChange({
      ...filterSettings,
      fieldNameSearch: value,
    });
  };

  const handleFieldPresenceFilterChange = (
    value: 'all' | 'all-selected' | 'any-selected' | 'exactly'
  ) => {
    onFilterChange({
      ...filterSettings,
      fieldPresenceFilter: value,
      exactCount: value === 'exactly' ? filterSettings.exactCount || 1 : undefined,
    });
  };

  const handleExactCountChange = (value: string) => {
    const count = parseInt(value, 10);
    if (!isNaN(count) && count > 0) {
      onFilterChange({
        ...filterSettings,
        exactCount: count,
      });
    }
  };

  const handleFileSortChange = (value: 'none' | 'name-asc' | 'name-desc') => {
    onFilterChange({
      ...filterSettings,
      fileSort: value,
    });
  };

  const clearAllFilters = () => {
    const allFileIds = new Set(uploadedFiles.map((f) => f.id));
    onFilterChange({
      selectedFileIds: allFileIds,
      fieldNameSearch: '',
      fieldPresenceFilter: 'all',
      exactCount: undefined,
      fileSort: 'none',
    });
  };

  const hasActiveFilters =
    filterSettings.selectedFileIds.size !== uploadedFiles.length ||
    filterSettings.fieldNameSearch !== '' ||
    filterSettings.fieldPresenceFilter !== 'all' ||
    filterSettings.fileSort !== 'none';

  const selectedCount = filterSettings.selectedFileIds.size;

  // Sort files based on sort setting
  const sortedFiles = useMemo(() => {
    const sortType = filterSettings.fileSort || 'none';
    if (sortType === 'none') {
      return uploadedFiles;
    }
    
    const sorted = [...uploadedFiles].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortType === 'name-asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    
    return sorted;
  }, [uploadedFiles, filterSettings.fileSort]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Files ({selectedCount}/{uploadedFiles.length} selected)
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllFiles}
                    className="h-7 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAllFiles}
                    className="h-7 text-xs"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="file-sort" className="text-xs text-muted-foreground">
                  Sort:
                </Label>
                <Select
                  value={filterSettings.fileSort || 'none'}
                  onValueChange={handleFileSortChange}
                >
                  <SelectTrigger id="file-sort" className="h-7 w-[140px] text-xs">
                    <div className="flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto border rounded-md p-2 bg-muted/30 max-h-48">
                <div className="flex flex-col flex-wrap gap-2" style={{ height: '192px', width: 'max-content' }}>
                  {sortedFiles.map((file) => {
                    const isSelected = filterSettings.selectedFileIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-background transition-colors min-w-[200px]"
                      >
                        <Checkbox
                          id={`file-${file.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleFileToggle(file.id, checked === true)
                          }
                        />
                        <Label
                          htmlFor={`file-${file.id}`}
                          className="flex-1 cursor-pointer text-sm min-w-0"
                        >
                          <div className="truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {file.headers.length} columns
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Field Name Search */}
            <div className="space-y-2">
              <Label htmlFor="field-search" className="text-sm font-semibold">
                Search Fields
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="field-search"
                  placeholder="Search by field name..."
                  value={filterSettings.fieldNameSearch}
                  onChange={(e) => handleFieldNameSearchChange(e.target.value)}
                  className="pl-9"
                />
                {filterSettings.fieldNameSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFieldNameSearchChange('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Field Presence Filter */}
            <div className="space-y-2">
              <Label htmlFor="presence-filter" className="text-sm font-semibold">
                Field Presence
              </Label>
              <Select
                value={filterSettings.fieldPresenceFilter}
                onValueChange={handleFieldPresenceFilterChange}
              >
                <SelectTrigger id="presence-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Show all fields</SelectItem>
                  <SelectItem value="all-selected">
                    Present in all selected files
                  </SelectItem>
                  <SelectItem value="any-selected">
                    Present in any selected file
                  </SelectItem>
                  <SelectItem value="exactly">
                    Present in exactly N files
                  </SelectItem>
                </SelectContent>
              </Select>
              {filterSettings.fieldPresenceFilter === 'exactly' && (
                <div className="mt-2">
                  <Label htmlFor="exact-count" className="text-xs text-muted-foreground">
                    Number of files:
                  </Label>
                  <Input
                    id="exact-count"
                    type="number"
                    min="1"
                    max={uploadedFiles.length}
                    value={filterSettings.exactCount || 1}
                    onChange={(e) => handleExactCountChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

