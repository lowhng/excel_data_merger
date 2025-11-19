import { useState, useCallback } from 'react';
import { UploadedFile, MergedField, TableRow } from '@/types';
import {
  parseExcelFile,
  mergeHeaders,
  convertToTableRows,
  exportToExcel,
  downloadExcel,
} from '@/lib/excelProcessor';
import { FileRenameSettings } from '@/components/FileRenameSettings';
import { FilterSettings } from '@/components/FilterControls';

export function useExcelProcessor() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [mergedFields, setMergedFields] = useState<MergedField[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        const newFiles: UploadedFile[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Validate file type
          if (!file.name.match(/\.xlsx?$/i)) {
            throw new Error(`Invalid file type: ${file.name}. Please upload Excel files only.`);
          }

          const headers = await parseExcelFile(file);

          if (headers.length === 0) {
            throw new Error(`No headers found in ${file.name}`);
          }

          newFiles.push({
            id: `file-${Date.now()}-${i}`,
            name: file.name,
            headers,
            uploadedAt: new Date(),
          });
        }

        // Combine with existing files
        const allFiles = [...uploadedFiles, ...newFiles];
        setUploadedFiles(allFiles);

        // Recalculate merged fields
        const merged = mergeHeaders(allFiles);
        setMergedFields(merged);

        // Convert to table rows
        const rows = convertToTableRows(merged, allFiles);
        setTableRows(rows);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process files';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [uploadedFiles]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const remainingFiles = uploadedFiles.filter((f) => f.id !== fileId);
      setUploadedFiles(remainingFiles);

      if (remainingFiles.length === 0) {
        setMergedFields([]);
        setTableRows([]);
      } else {
        // Recalculate merged fields
        const merged = mergeHeaders(remainingFiles);
        setMergedFields(merged);

        // Convert to table rows
        const rows = convertToTableRows(merged, remainingFiles);
        setTableRows(rows);
      }
    },
    [uploadedFiles]
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
  }, []);

  return {
    uploadedFiles,
    mergedFields,
    tableRows,
    isLoading,
    error,
    handleFileUpload,
    removeFile,
    handleExportExcel,
    clearAll,
    setError,
  };
}
