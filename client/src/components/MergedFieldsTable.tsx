import { useMemo, useState, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UploadedFile, TableRow as TableRowType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { FileRenameSettings } from './FileRenameSettings';
import { FilterSettings } from './FilterControls';

interface MergedFieldsTableProps {
  tableRows: TableRowType[];
  uploadedFiles: UploadedFile[];
  renameSettings: FileRenameSettings;
  filterSettings: FilterSettings;
}

export default function MergedFieldsTable({
  tableRows,
  uploadedFiles,
  renameSettings,
  filterSettings,
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

    return filtered;
  }, [
    tableRows,
    filterSettings,
    uploadedFiles,
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
                    <div className="flex items-center gap-2">
                      <span className="truncate">{row.fieldName}</span>
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
