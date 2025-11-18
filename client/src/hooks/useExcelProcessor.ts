import { useState, useCallback } from 'react';
import { UploadedFile, MergedField, TableRow } from '@/types';
import {
  parseExcelFile,
  mergeHeaders,
  convertToTableRows,
  exportToCSV,
  downloadCSV,
} from '@/lib/excelProcessor';

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

  const handleExportCSV = useCallback(() => {
    if (tableRows.length === 0) {
      setError('No data to export');
      return;
    }

    try {
      const csvContent = exportToCSV(tableRows, uploadedFiles);
      downloadCSV(csvContent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export CSV';
      setError(errorMessage);
    }
  }, [tableRows, uploadedFiles]);

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
    handleExportCSV,
    clearAll,
    setError,
  };
}
