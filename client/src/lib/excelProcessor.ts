import * as XLSX from 'xlsx';
import { UploadedFile, MergedField, TableRow } from '@/types';

/**
 * Parse an Excel file and extract headers from the first row
 */
export async function parseExcelFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        if (!firstSheet) {
          reject(new Error('No sheet found in Excel file'));
          return;
        }

        // Get the first row as headers
        const headers: string[] = [];
        let colIndex = 0;
        
        while (true) {
          const cellRef = XLSX.utils.encode_col(colIndex) + '1';
          const cell = firstSheet[cellRef];
          
          if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
            break;
          }
          
          headers.push(String(cell.v).trim());
          colIndex++;
        }

        resolve(headers);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Merge headers from multiple uploaded files, removing duplicates
 * and tracking which files contain each field
 */
export function mergeHeaders(uploadedFiles: UploadedFile[]): MergedField[] {
  const fieldMap = new Map<string, Map<string, boolean>>();

  // Build a map of unique fields and which files contain them
  uploadedFiles.forEach((file) => {
    file.headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      if (!fieldMap.has(normalizedHeader)) {
        fieldMap.set(normalizedHeader, new Map());
      }
      
      fieldMap.get(normalizedHeader)!.set(file.id, true);
    });
  });

  // Convert to MergedField array, preserving original casing from first occurrence
  const mergedFields: MergedField[] = [];
  const processedHeaders = new Set<string>();

  uploadedFiles.forEach((file) => {
    file.headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      if (!processedHeaders.has(normalizedHeader)) {
        processedHeaders.add(normalizedHeader);
        mergedFields.push({
          fieldName: header, // Use original casing from first file
          files: fieldMap.get(normalizedHeader)!,
        });
      }
    });
  });

  return mergedFields;
}

/**
 * Convert merged fields to table rows for display
 */
export function convertToTableRows(
  mergedFields: MergedField[],
  uploadedFiles: UploadedFile[]
): TableRow[] {
  return mergedFields.map((field) => {
    const row: TableRow = {
      fieldName: field.fieldName,
    };

    uploadedFiles.forEach((file) => {
      row[file.id] = field.files.has(file.id) ? true : false;
    });

    return row;
  });
}

/**
 * Export table data to CSV format
 */
export function exportToCSV(
  tableRows: TableRow[],
  uploadedFiles: UploadedFile[]
): string {
  // Create header row
  const headers = ['Fields', ...uploadedFiles.map((f) => f.name.replace(/\.xlsx?$/i, ''))];
  const csvLines = [headers.map((h) => `"${h}"`).join(',')];

  // Add data rows
  tableRows.forEach((row) => {
    const values = [
      `"${row.fieldName}"`,
      ...uploadedFiles.map((file) => {
        return row[file.id] ? 'x' : '';
      }),
    ];
    csvLines.push(values.join(','));
  });

  return csvLines.join('\n');
}

/**
 * Download CSV file to user's device
 */
export function downloadCSV(csvContent: string, filename: string = 'merged_fields.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
