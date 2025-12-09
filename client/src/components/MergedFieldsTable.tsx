import { useMemo, useState, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UploadedFile, TableRow as TableRowType, PathFilterSettings } from '@/types';
import { Badge } from '@/components/ui/badge';
import { FileRenameSettings } from './FileRenameSettings';
import { FilterSettings } from './FilterControls';
import { ChevronRight, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MergedFieldsTableProps {
  tableRows: TableRowType[];
  uploadedFiles: UploadedFile[];
  renameSettings: FileRenameSettings;
  filterSettings: FilterSettings;
  pathFilterSettings: PathFilterSettings;
  onPathFilterSettingsChange?: (settings: PathFilterSettings) => void;
}

export default function MergedFieldsTable({
  tableRows,
  uploadedFiles,
  renameSettings,
  filterSettings,
  pathFilterSettings,
  onPathFilterSettingsChange,
}: MergedFieldsTableProps) {
  const [firstColumnWidth, setFirstColumnWidth] = useState(300);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(200, Math.min(600, startWidthRef.current + diff));
    setFirstColumnWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = firstColumnWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [firstColumnWidth, handleMouseMove, handleMouseUp]);

  // Helper function to get path prefix up to a certain depth

  // depth parameter is 1-based (depth 1 = first segment, depth 2 = first two segments, etc.)
  const getPathPrefix = (segments: string[] | undefined, depth: number): string | null => {
    if (!segments || segments.length === 0) return null;
    if (depth <= 0 || depth > segments.length) return null;
    return segments.slice(0, depth).join(' > ');
  };

  // Helper function to check if a row should be visible based on depth and expanded paths
  // Depth filtering works automatically when paths exist, regardless of enabled flag
  const isRowVisible = useCallback((row: TableRowType): boolean => {
    // Get path segments - use existing pathSegments or try parsing from fieldName
    let pathSegments = row.pathSegments;
    if (!pathSegments || pathSegments.length === 0) {
      // Try parsing from field name if pathSegments aren't set
      if (row.fieldName && row.fieldName.includes(' > ')) {
        pathSegments = row.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
      } else {
        // No path segments at all, always show
        return true;
      }
    }

    // If still no segments after parsing, show the row
    if (!pathSegments || pathSegments.length === 0) {
      return true;
    }

    const depth = pathSegments.length;
    const maxDepth = pathFilterSettings.maxDepth ?? 2;

    // Always show rows at or below maxDepth
    if (depth <= maxDepth) {
      return true;
    }

    // For deeper rows, check if all ancestors from maxDepth to depth-1 are expanded
    // For a row at depth N, we need to check paths at depths maxDepth, maxDepth+1, ..., N-1
    for (let i = maxDepth; i < depth; i++) {
      const ancestorPrefix = getPathPrefix(pathSegments, i);
      if (!ancestorPrefix || !pathFilterSettings.expandedPaths.has(ancestorPrefix)) {
        return false;
      }
    }

    return true;
  }, [pathFilterSettings]);

  // Helper function to check if a row has children (deeper paths with same prefix)
  const hasChildren = useCallback((row: TableRowType, allRows: TableRowType[]): boolean => {
    // Get path segments for this row
    let pathSegments = row.pathSegments;
    if (!pathSegments || pathSegments.length === 0) {
      if (row.fieldName && row.fieldName.includes(' > ')) {
        pathSegments = row.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
      } else {
        return false;
      }
    }
    
    if (!pathSegments || pathSegments.length === 0) return false;
    
    const currentPath = pathSegments.join(' > ');
    return allRows.some(otherRow => {
      // Get path segments for other row
      let otherPathSegments = otherRow.pathSegments;
      if (!otherPathSegments || otherPathSegments.length === 0) {
        if (otherRow.fieldName && otherRow.fieldName.includes(' > ')) {
          otherPathSegments = otherRow.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
        } else {
          return false;
        }
      }
      
      if (!otherPathSegments || otherPathSegments.length === 0) return false;
      const otherPath = otherPathSegments.join(' > ');
      return otherPath.startsWith(currentPath + ' > ');
    });
  }, []);

  // Helper function to toggle path expansion
  const togglePathExpansion = useCallback((path: string) => {
    if (!onPathFilterSettingsChange) return;
    
    const newExpandedPaths = new Set(pathFilterSettings.expandedPaths);
    if (newExpandedPaths.has(path)) {
      newExpandedPaths.delete(path);
    } else {
      newExpandedPaths.add(path);
    }
    
    onPathFilterSettingsChange({
      ...pathFilterSettings,
      expandedPaths: newExpandedPaths,
    });
  }, [pathFilterSettings, onPathFilterSettingsChange]);

  // Helper function to expand all paths
  const expandAllPaths = useCallback(() => {
    if (!onPathFilterSettingsChange) return;
    
    // Get all unique path prefixes from all rows
    const allPaths = new Set<string>();
    tableRows.forEach(row => {
      let pathSegments = row.pathSegments;
      if (!pathSegments || pathSegments.length === 0) {
        if (row.fieldName && row.fieldName.includes(' > ')) {
          pathSegments = row.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
        }
      }
      
      if (pathSegments && pathSegments.length > 0) {
        const maxDepth = pathFilterSettings.maxDepth ?? 2;
        // Add all path prefixes from maxDepth to the full depth
        for (let depth = maxDepth; depth <= pathSegments.length; depth++) {
          const prefix = pathSegments.slice(0, depth).join(' > ');
          allPaths.add(prefix);
        }
      }
    });
    
    onPathFilterSettingsChange({
      ...pathFilterSettings,
      expandedPaths: allPaths,
    });
  }, [tableRows, pathFilterSettings, onPathFilterSettingsChange]);

  // Helper function to collapse all paths
  const collapseAllPaths = useCallback(() => {
    if (!onPathFilterSettingsChange) return;
    
    onPathFilterSettingsChange({
      ...pathFilterSettings,
      expandedPaths: new Set(),
    });
  }, [pathFilterSettings, onPathFilterSettingsChange]);

  // Check if all paths are expanded
  const areAllPathsExpanded = useMemo(() => {
    if (!pathFilterSettings.enabled) return false;
    
    const maxDepth = pathFilterSettings.maxDepth ?? 2;
    const allPaths = new Set<string>();
    
    tableRows.forEach(row => {
      let pathSegments = row.pathSegments;
      if (!pathSegments || pathSegments.length === 0) {
        if (row.fieldName && row.fieldName.includes(' > ')) {
          pathSegments = row.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
        }
      }
      
      if (pathSegments && pathSegments.length > maxDepth) {
        for (let depth = maxDepth; depth < pathSegments.length; depth++) {
          const prefix = pathSegments.slice(0, depth).join(' > ');
          allPaths.add(prefix);
        }
      }
    });
    
    // Check if all required paths are expanded
    if (allPaths.size === 0) return false;
    return Array.from(allPaths).every(path => pathFilterSettings.expandedPaths.has(path));
  }, [tableRows, pathFilterSettings]);

  // Filter and sort files based on selected file IDs and sort setting
  const visibleFiles = useMemo(() => {
    let files = uploadedFiles;
    
    // Filter by selected file IDs
    if (filterSettings.selectedFileIds.size > 0) {
      files = files.filter((file) =>
        filterSettings.selectedFileIds.has(file.id)
      );
    }
    
    // Sort files based on sort setting
    const sortType = filterSettings.fileSort || 'none';
    if (sortType !== 'none') {
      files = [...files].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (sortType === 'name-asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
    }
    
    return files;
  }, [uploadedFiles, filterSettings.selectedFileIds, filterSettings.fileSort]);

  const fileColumns = useMemo(() => {
    // Get base names (without extension) for visible files only
    const baseNames = visibleFiles.map((file) =>
      file.name.replace(/\.xlsx?$/i, '')
    );

    // Apply rename logic if enabled
    let displayNames: string[];
    if (renameSettings.enabled) {
      displayNames = baseNames.map((name) => {
        const { mode, characterCount } = renameSettings;
        if (mode === 'first') {
          return name.substring(0, characterCount);
        } else {
          // Last characters
          return name.length > characterCount
            ? name.substring(name.length - characterCount)
            : name;
        }
      });
    } else {
      displayNames = baseNames;
    }

    // Handle duplicates by appending numbers
    const finalNames = displayNames.map((name, index) => {
      if (!renameSettings.enabled) {
        // When not renaming, use original name
        return name;
      }

      // Check how many files before this one have the same display name
      let duplicateCount = 0;
      for (let i = 0; i < index; i++) {
        if (displayNames[i] === name) {
          duplicateCount++;
        }
      }

      // If this is a duplicate, append a number
      if (duplicateCount > 0) {
        return `${name} (${duplicateCount + 1})`;
      }

      return name;
    });

    return visibleFiles.map((file, index) => ({
      id: file.id,
      name: baseNames[index], // Full name for tooltip
      shortName: finalNames[index], // Display name (may be shortened/renamed)
    }));
  }, [visibleFiles, renameSettings]);

  // Filter table rows based on filter settings
  const filteredRows = useMemo(() => {
    let filtered = tableRows;

    // Filter by field name search
    if (filterSettings.fieldNameSearch.trim() !== '') {
      const searchLower = filterSettings.fieldNameSearch.toLowerCase().trim();
      filtered = filtered.filter((row) =>
        row.fieldName.toLowerCase().includes(searchLower)
      );
    }

    // Filter by field presence
    if (filterSettings.selectedFileIds.size > 0) {
      const selectedFileIdsArray = Array.from(filterSettings.selectedFileIds);

      filtered = filtered.filter((row) => {
        // Count how many selected files have this field
        const presentCount = selectedFileIdsArray.filter(
          (fileId) => row[fileId] === true
        ).length;

        // Hide fields not present in any selected file
        if (presentCount === 0) {
          return false;
        }

        // Apply presence filter
        switch (filterSettings.fieldPresenceFilter) {
          case 'all-selected':
            return presentCount === selectedFileIdsArray.length;
          case 'any-selected':
            return presentCount > 0;
          case 'exactly':
            return (
              presentCount === (filterSettings.exactCount || 1)
            );
          case 'all':
          default:
            return true;
        }
      });
    } else {
      // If no files selected, apply presence filter to all files
      switch (filterSettings.fieldPresenceFilter) {
        case 'all-selected':
          // Show fields present in all files
          filtered = filtered.filter((row) => {
            return uploadedFiles.every((file) => row[file.id] === true);
          });
          break;
        case 'any-selected':
          // Show fields present in at least one file
          filtered = filtered.filter((row) => {
            return uploadedFiles.some((file) => row[file.id] === true);
          });
          break;
        case 'exactly':
          // Show fields present in exactly N files
          const exactCount = filterSettings.exactCount || 1;
          filtered = filtered.filter((row) => {
            const presentCount = uploadedFiles.filter(
              (file) => row[file.id] === true
            ).length;
            return presentCount === exactCount;
          });
          break;
        case 'all':
        default:
          // Show all fields
          break;
      }
    }

    // Filter by hidden path prefixes if path filtering is enabled
    if (pathFilterSettings.enabled && pathFilterSettings.hiddenSegments.size > 0) {
      filtered = filtered.filter((row) => {
        // If field has no path segments, show it
        let pathSegments = row.pathSegments;
        if (!pathSegments || pathSegments.length === 0) {
          if (row.fieldName && row.fieldName.includes(' > ')) {
            pathSegments = row.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
          } else {
            return true;
          }
        }
        
        if (!pathSegments || pathSegments.length === 0) {
          return true;
        }
        
        // Check if any path prefix (at any depth) of this row matches a hidden prefix
        // For example, if "RefOrderDetail > Notification" is hidden, hide all fields
        // that start with that path (e.g., "RefOrderDetail > Notification > Items")
        const rowPath = pathSegments.join(' > ');
        const hasHiddenPrefix = Array.from(pathFilterSettings.hiddenSegments).some(hiddenPrefix => {
          // Check if the row's path starts with the hidden prefix, or if they match exactly
          return rowPath === hiddenPrefix || rowPath.startsWith(hiddenPrefix + ' > ');
        });
        
        return !hasHiddenPrefix;
      });
    }

    // Depth filtering only applies when path filtering is enabled
    // When enabled, rows without pathSegments will always pass (shown), rows with paths will be filtered by depth
    if (pathFilterSettings.enabled) {
      filtered = filtered.filter((row) => isRowVisible(row));
    }

    return filtered;
  }, [
    tableRows,
    filterSettings,
    uploadedFiles,
    pathFilterSettings,
    isRowVisible,
  ]);

  if (tableRows.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center h-full">
        <div>
          <p className="text-muted-foreground">No data to display</p>
          <p className="text-sm text-muted-foreground/75">
            Upload Excel files to see merged fields
          </p>
        </div>
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center h-full">
        <div>
          <p className="text-muted-foreground">No fields match the current filters</p>
          <p className="text-sm text-muted-foreground/75">
            Try adjusting your filter settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {pathFilterSettings.enabled && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={areAllPathsExpanded ? collapseAllPaths : expandAllPaths}
            className="h-7 text-xs gap-1.5"
          >
            {areAllPathsExpanded ? (
              <>
                <Minimize2 className="h-3 w-3" />
                Collapse All
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" />
                Expand All
              </>
            )}
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead 
                className="font-semibold text-foreground sticky left-0 z-20 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] border-r border-border/50 group"
                style={{
                  width: `${firstColumnWidth}px`,
                  minWidth: `${firstColumnWidth}px`,
                  backgroundColor: 'oklch(0.9835 0.0005 286.375)',
                  position: 'sticky'
                }}
              >
                <div className="flex items-center justify-between pr-1 relative">
                  <span>Fields</span>
                  <div
                    ref={resizeRef}
                    onMouseDown={handleMouseDown}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/60 transition-colors group-hover:bg-primary/40 -mr-0.5"
                    style={{ touchAction: 'none' }}
                    title="Drag to resize column"
                  />
                </div>
              </TableHead>
              {fileColumns.map((col) => (
                <TableHead
                  key={col.id}
                  className="font-semibold text-foreground text-center min-w-[100px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="hidden sm:inline" title={col.name}>
                      {col.shortName}
                    </span>
                    <span className="sm:hidden text-xs">{col.shortName}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row, index) => {
              const isEven = index % 2 === 0;
              // Count how many visible files have this field
              const presentCount = fileColumns.filter((col) => row[col.id] === true).length;
              
              // Determine depth and if row has children
              // Get path segments - use existing or parse from fieldName
              let pathSegmentsForDisplay = row.pathSegments;
              if (!pathSegmentsForDisplay || pathSegmentsForDisplay.length === 0) {
                if (row.fieldName && row.fieldName.includes(' > ')) {
                  pathSegmentsForDisplay = row.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
                }
              }
              const depth = pathSegmentsForDisplay?.length ?? 0;
              const hasRowChildren = hasChildren(row, tableRows);
              const maxDepth = pathFilterSettings.maxDepth ?? 2;
              
              // Get the current path to check if it's expanded (for expand/collapse button)
              const currentPath = pathSegmentsForDisplay ? pathSegmentsForDisplay.join(' > ') : null;
              const isExpanded = currentPath ? pathFilterSettings.expandedPaths.has(currentPath) : false;
              
              // Calculate indentation based on depth (always show when paths exist)
              // Indent based on actual depth to show hierarchy clearly
              const indentLevel = depth > 0 ? depth - 1 : 0;
              
              // Show expand/collapse button if row has children (always show when paths exist)
              const showExpandButton = hasRowChildren;
              
              return (
                <TableRow
                  key={index}
                  className={isEven ? 'bg-background' : 'bg-muted/30'}
                >
                  <TableCell 
                    className={`font-medium text-foreground sticky left-0 z-20 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] border-r border-border/50 ${isEven ? '!bg-background' : ''}`}
                    style={{
                      width: `${firstColumnWidth}px`,
                      minWidth: `${firstColumnWidth}px`,
                      ...(!isEven ? {
                        backgroundColor: 'oklch(0.9901 0.0003 286.375)'
                      } : {})
                    }}
                  >
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${indentLevel * 20}px` }}>
                      {showExpandButton ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentPath) {
                              togglePathExpansion(currentPath);
                            }
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <div className="w-5" /> // Spacer for alignment
                      )}
                      <span className="truncate flex-1">{row.fieldName}</span>
                      <Badge
                        variant="secondary"
                        className="text-xs whitespace-nowrap"
                      >
                        {presentCount}/{fileColumns.length}
                      </Badge>
                    </div>
                  </TableCell>
                {fileColumns.map((col) => (
                  <TableCell
                    key={col.id}
                    className="text-center"
                  >
                    {row[col.id] ? (
                      <div className="flex justify-center">
                        <Badge variant="default" className="text-xs">
                          ✓
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-3 bg-muted/30 border-t border-border text-sm text-muted-foreground flex-shrink-0">
        Showing <span className="font-semibold text-foreground">{filteredRows.length}</span> of{' '}
        <span className="font-semibold text-foreground">{tableRows.length}</span> fields
      </div>
    </div>
  );
}
