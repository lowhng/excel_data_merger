import { useState, useCallback, useRef, useEffect } from 'react';
import { UploadedFile, MergedField, TableRow, HeaderOrientation } from '@/types';
import {
  parseExcelFile,
  mergeHeaders,
  convertToTableRows,
  exportToExcel,
  downloadExcel,
} from '@/lib/excelProcessor';
import { FileRenameSettings } from '@/components/FileRenameSettings';
import { FilterSettings } from '@/components/FilterControls';

// Helper to auto-detect common sheet names
function detectCommonSheetNames(sheetNamesArrays: string[][]): number | null {
  if (sheetNamesArrays.length === 0) return null;
  
  // Check for common patterns: Sheet1, Sheet2, Sheet 1, Sheet 2, etc.
  const commonPatterns = [
    /^Sheet\s*(\d+)$/i,
    /^Sheet(\d+)$/i,
  ];
  
  // Get the first file's sheet names as reference
  const firstFileSheets = sheetNamesArrays[0];
  
  for (let i = 0; i < firstFileSheets.length; i++) {
    const sheetName = firstFileSheets[i];
    
    // Check if this sheet name matches a common pattern
    for (const pattern of commonPatterns) {
      const match = sheetName.match(pattern);
      if (match) {
        const sheetNum = parseInt(match[1], 10);
        // Check if all files have a sheet at this index
        const allHaveSheet = sheetNamesArrays.every(sheets => sheets.length > i);
        if (allHaveSheet) {
          return i;
        }
      }
    }
  }
  
  return null;
}

// Helper to detect sheet name discrepancies
function detectSheetNameDiscrepancy(
  uploadedFiles: UploadedFile[],
  selectedSheetIndex: number
): string | null {
  if (uploadedFiles.length === 0) return null;
  
  const sheetNames = uploadedFiles
    .map(file => file.sheetNames[selectedSheetIndex])
    .filter(name => name !== undefined);
  
  if (sheetNames.length === 0) return null;
  
  const firstSheetName = sheetNames[0];
  const allMatch = sheetNames.every(name => name === firstSheetName);
  
  if (!allMatch) {
    const discrepancies = uploadedFiles
      .map(file => {
        const sheetName = file.sheetNames[selectedSheetIndex];
        return sheetName ? `${file.name}: "${sheetName}"` : `${file.name}: (missing sheet)`;
      })
      .join(', ');
    return `Sheet names differ across files: ${discrepancies}`;
  }
  
  return null;
}

export function useExcelProcessor() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [mergedFields, setMergedFields] = useState<MergedField[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerOrientation, setHeaderOrientation] = useState<HeaderOrientation>('horizontal');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(null);
  const [sheetNameWarning, setSheetNameWarning] = useState<string | null>(null);
  
  // Store original file objects to reprocess when settings change
  const fileCacheRef = useRef<Map<string, File>>(new Map());
  // Store metadata for files
  const fileMetadataRef = useRef<Map<string, { uploadedAt: Date }>>(new Map());
  // Track if files have been loaded (to prevent initial useEffect run)
  const hasLoadedFilesRef = useRef(false);

  // Reprocess all files with current settings
  const reprocessAllFiles = useCallback(async () => {
    if (fileCacheRef.current.size === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const processedFiles: UploadedFile[] = [];
      const fileEntries = Array.from(fileCacheRef.current.entries());

      for (const [fileId, file] of fileEntries) {
        try {
          const result = await parseExcelFile(file, selectedSheetIndex, headerOrientation);

          if (result.headers.length === 0) {
            throw new Error(`No headers found in ${file.name}`);
          }

          // Get metadata from ref
          const metadata = fileMetadataRef.current.get(fileId);
          
          processedFiles.push({
            id: fileId,
            name: file.name,
            headers: result.headers,
            uploadedAt: metadata?.uploadedAt || new Date(),
            sheetNames: result.sheetNames,
            fieldPaths: result.fieldPaths,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
          throw new Error(`${errorMessage} (${file.name})`);
        }
      }

      setUploadedFiles(processedFiles);

      // Recalculate merged fields
      const merged = mergeHeaders(processedFiles);
      setMergedFields(merged);

      // Convert to table rows
      const rows = convertToTableRows(merged, processedFiles);
      setTableRows(rows);

      // Check for sheet name discrepancies
      const warning = detectSheetNameDiscrepancy(processedFiles, selectedSheetIndex);
      setSheetNameWarning(warning);

      // Update selected sheet name
      if (processedFiles.length > 0 && processedFiles[0].sheetNames[selectedSheetIndex]) {
        setSelectedSheetName(processedFiles[0].sheetNames[selectedSheetIndex]);
      } else {
        setSelectedSheetName(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reprocess files';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSheetIndex, headerOrientation]);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        const newFiles: UploadedFile[] = [];
        const sheetNamesArrays: string[][] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Validate file type
          if (!file.name.match(/\.xlsx?$/i)) {
            throw new Error(`Invalid file type: ${file.name}. Please upload Excel files only.`);
          }

          const result = await parseExcelFile(file, selectedSheetIndex, headerOrientation);

          if (result.headers.length === 0) {
            throw new Error(`No headers found in ${file.name}`);
          }

          const fileId = `file-${Date.now()}-${i}`;
          fileCacheRef.current.set(fileId, file);
          fileMetadataRef.current.set(fileId, { uploadedAt: new Date() });
          sheetNamesArrays.push(result.sheetNames);

          newFiles.push({
            id: fileId,
            name: file.name,
            headers: result.headers,
            uploadedAt: new Date(),
            sheetNames: result.sheetNames,
            fieldPaths: result.fieldPaths,
          });
        }

        // Auto-detect common sheet names if this is the first batch
        let finalSheetIndex = selectedSheetIndex;
        if (uploadedFiles.length === 0 && newFiles.length > 0) {
          const detectedIndex = detectCommonSheetNames(sheetNamesArrays);
          if (detectedIndex !== null) {
            finalSheetIndex = detectedIndex;
            // Only update if different to avoid unnecessary reprocessing
            if (detectedIndex !== selectedSheetIndex) {
              setSelectedSheetIndex(detectedIndex);
            }
          }
        }

        // If we detected a different sheet, we need to reprocess with the correct sheet
        // But files are already processed with selectedSheetIndex, so we'll let useEffect handle it
        // For now, use the detected index if available, otherwise use current
        const sheetIndexToUse = finalSheetIndex;

        // Combine with existing files
        const allFiles = [...uploadedFiles, ...newFiles];
        setUploadedFiles(allFiles);

        // Recalculate merged fields
        const merged = mergeHeaders(allFiles);
        setMergedFields(merged);

        // Convert to table rows
        const rows = convertToTableRows(merged, allFiles);
        setTableRows(rows);

        // Check for sheet name discrepancies
        const warning = detectSheetNameDiscrepancy(allFiles, sheetIndexToUse);
        setSheetNameWarning(warning);

        // Update selected sheet name
        if (allFiles.length > 0 && allFiles[0].sheetNames[sheetIndexToUse]) {
          setSelectedSheetName(allFiles[0].sheetNames[sheetIndexToUse]);
        } else {
          setSelectedSheetName(null);
        }

        // Mark that files have been loaded
        hasLoadedFilesRef.current = true;

        // If we detected a different sheet, the useEffect will trigger reprocessing
        // The files are already in the cache, so when selectedSheetIndex changes,
        // the useEffect will call reprocessAllFiles automatically
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process files';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [uploadedFiles, selectedSheetIndex, headerOrientation, reprocessAllFiles]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      fileCacheRef.current.delete(fileId);
      fileMetadataRef.current.delete(fileId);
      const remainingFiles = uploadedFiles.filter((f) => f.id !== fileId);
      setUploadedFiles(remainingFiles);

      if (remainingFiles.length === 0) {
        setMergedFields([]);
        setTableRows([]);
        setSheetNameWarning(null);
        setSelectedSheetName(null);
      } else {
        // Recalculate merged fields
        const merged = mergeHeaders(remainingFiles);
        setMergedFields(merged);

        // Convert to table rows
        const rows = convertToTableRows(merged, remainingFiles);
        setTableRows(rows);

        // Check for sheet name discrepancies
        const warning = detectSheetNameDiscrepancy(remainingFiles, selectedSheetIndex);
        setSheetNameWarning(warning);

        // Update selected sheet name
        if (remainingFiles.length > 0 && remainingFiles[0].sheetNames[selectedSheetIndex]) {
          setSelectedSheetName(remainingFiles[0].sheetNames[selectedSheetIndex]);
        } else {
          setSelectedSheetName(null);
        }
      }
    },
    [uploadedFiles, selectedSheetIndex]
  );

  const changeHeaderOrientation = useCallback(
    (orientation: HeaderOrientation) => {
      setHeaderOrientation(orientation);
      // Reprocess will be triggered by useEffect
    },
    []
  );

  const changeSheetIndex = useCallback(
    (sheetIndex: number) => {
      setSelectedSheetIndex(sheetIndex);
      // Reprocess will be triggered by useEffect
    },
    []
  );

  const handleExportExcel = useCallback(
    (renameSettings: FileRenameSettings, filterSettings: FilterSettings) => {
      if (tableRows.length === 0) {
        setError('No data to export');
        return;
      }

      try {
        // Filter files based on selected file IDs
        let filesToExport = uploadedFiles;
        if (filterSettings.selectedFileIds.size > 0) {
          filesToExport = uploadedFiles.filter((file) =>
            filterSettings.selectedFileIds.has(file.id)
          );
        }

        // Sort files based on sort setting
        const sortType = filterSettings.fileSort || 'none';
        if (sortType !== 'none') {
          filesToExport = [...filesToExport].sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (sortType === 'name-asc') {
              return nameA.localeCompare(nameB);
            } else {
              return nameB.localeCompare(nameA);
            }
          });
        }

        // Filter table rows based on filter settings (same logic as MergedFieldsTable)
        let filteredRows = tableRows;

        // Filter by field name search
        if (filterSettings.fieldNameSearch.trim() !== '') {
          const searchLower = filterSettings.fieldNameSearch.toLowerCase().trim();
          filteredRows = filteredRows.filter((row) =>
            row.fieldName.toLowerCase().includes(searchLower)
          );
        }

        // Filter by field presence
        if (filterSettings.selectedFileIds.size > 0) {
          const selectedFileIdsArray = Array.from(filterSettings.selectedFileIds);

          filteredRows = filteredRows.filter((row) => {
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
              filteredRows = filteredRows.filter((row) => {
                const presentCount = uploadedFiles.filter(
                  (file) => row[file.id] === true
                ).length;
                return presentCount === uploadedFiles.length;
              });
              break;
            case 'any-selected':
              // Show all fields (already filtered by selected files)
              break;
            case 'exactly':
              filteredRows = filteredRows.filter((row) => {
                const presentCount = uploadedFiles.filter(
                  (file) => row[file.id] === true
                ).length;
                return presentCount === (filterSettings.exactCount || 1);
              });
              break;
            case 'all':
            default:
              // Show all fields
              break;
          }
        }

        const workbook = exportToExcel(filteredRows, filesToExport, renameSettings);
        downloadExcel(workbook);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to export Excel';
        setError(errorMessage);
      }
    },
    [tableRows, uploadedFiles]
  );

  const clearAll = useCallback(() => {
    setUploadedFiles([]);
    setMergedFields([]);
    setTableRows([]);
    setError(null);
    setSheetNameWarning(null);
    setSelectedSheetName(null);
    fileCacheRef.current.clear();
    fileMetadataRef.current.clear();
    hasLoadedFilesRef.current = false;
  }, []);

  // Reprocess files when orientation or sheet index changes
  useEffect(() => {
    // Only reprocess if files have been loaded (prevents initial run)
    if (hasLoadedFilesRef.current && fileCacheRef.current.size > 0) {
      reprocessAllFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerOrientation, selectedSheetIndex]);

  return {
    uploadedFiles,
    mergedFields,
    tableRows,
    isLoading,
    error,
    headerOrientation,
    selectedSheetIndex,
    selectedSheetName,
    sheetNameWarning,
    handleFileUpload,
    removeFile,
    handleExportExcel,
    clearAll,
    setError,
    changeHeaderOrientation,
    changeSheetIndex,
  };
}
