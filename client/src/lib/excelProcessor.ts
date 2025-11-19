import * as XLSX from 'xlsx';
import { UploadedFile, MergedField, TableRow } from '@/types';
import { FileRenameSettings } from '@/components/FileRenameSettings';

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
 * Apply rename settings to file names (same logic as MergedFieldsTable)
 */
function applyRenameSettings(
  uploadedFiles: UploadedFile[],
  renameSettings: FileRenameSettings
): string[] {
  // Get base names (without extension)
  const baseNames = uploadedFiles.map((file) =>
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

  return finalNames;
}

/**
 * Export table data to Excel format
 */
export function exportToExcel(
  tableRows: TableRow[],
  uploadedFiles: UploadedFile[],
  renameSettings: FileRenameSettings
): XLSX.WorkBook {
  // Get column names with rename settings applied
  const columnNames = applyRenameSettings(uploadedFiles, renameSettings);

  // Create header row
  const headers = ['Fields', ...columnNames];

  // Create data rows
  const data = tableRows.map((row) => {
    return [
      row.fieldName,
      ...uploadedFiles.map((file) => {
        return row[file.id] ? '✓' : '';
      }),
    ];
  });

  // Combine headers and data
  const worksheetData = [headers, ...data];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Fields column
    ...columnNames.map(() => ({ wch: 15 })), // File columns
  ];
  worksheet['!cols'] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Merged Fields');

  return workbook;
}

/**
 * Download Excel file to user's device
 */
export function downloadExcel(
  workbook: XLSX.WorkBook,
  filename: string = 'merged_fields.xlsx'
): void {
  // Write workbook to buffer
  const excelBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  // Create blob and download
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
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
