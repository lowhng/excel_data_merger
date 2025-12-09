import * as XLSX from 'xlsx';
import { UploadedFile, MergedField, TableRow, HeaderOrientation, ParseExcelResult } from '@/types';
import { FileRenameSettings } from '@/components/FileRenameSettings';

/**
 * Get all sheet names from an Excel file
 */
export async function getSheetNames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook.SheetNames);
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
 * Parse an Excel file and extract headers from the specified sheet and orientation
 */
export async function parseExcelFile(
  file: File,
  sheetIndex: number = 0,
  orientation: HeaderOrientation = 'horizontal'
): Promise<ParseExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        
        if (sheetIndex < 0 || sheetIndex >= sheetNames.length) {
          reject(new Error(`Sheet index ${sheetIndex} is out of range. File has ${sheetNames.length} sheet(s).`));
          return;
        }

        const selectedSheet = workbook.Sheets[sheetNames[sheetIndex]];
        
        if (!selectedSheet) {
          reject(new Error('No sheet found in Excel file'));
          return;
        }

        const headers: string[] = [];
        const fieldPaths = new Map<string, string>();

        if (orientation === 'horizontal') {
          // HORIZONTAL ORIENTATION:
          // Column A = Row headers (e.g., "Field Name", "Path", "Depth", "Files Count")
          // Row 1 = Actual field names (columns B+)
          // Path row = Row with "Path" header in column A (columns B+ contain path values)
          
          // Step 1: Read column A to find row headers
          const rowHeaders: string[] = [];
          let rowIndex = 1;
          while (true) {
            const cellRef = 'A' + rowIndex;
            const cell = selectedSheet[cellRef];
            if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
              break;
            }
            rowHeaders.push(String(cell.v).trim());
            rowIndex++;
          }

          // Step 2: Check if "Path" row exists
          const pathRowIndex = rowHeaders.findIndex(h => h.toLowerCase().trim() === 'path');
          
          // Step 3: Read actual field names from row 1 (columns B+)
          const actualFieldNames: string[] = [];
          let colIndex = 1; // Start from column B
          
          while (true) {
            const fieldNameCellRef = XLSX.utils.encode_col(colIndex) + '1';
            const fieldNameCell = selectedSheet[fieldNameCellRef];
            
            if (!fieldNameCell || fieldNameCell.v === undefined || fieldNameCell.v === null || fieldNameCell.v === '') {
              break;
            }
            
            const fieldName = String(fieldNameCell.v).trim();
            if (fieldName) {
              actualFieldNames.push(fieldName);
              
              // If Path row exists, read its value for this field
              if (pathRowIndex >= 0) {
                const pathCellRef = XLSX.utils.encode_col(colIndex) + (pathRowIndex + 1);
                const pathCell = selectedSheet[pathCellRef];
                
                if (pathCell && pathCell.v !== undefined && pathCell.v !== null && pathCell.v !== '') {
                  const pathValue = String(pathCell.v).trim();
                  if (pathValue) {
                    fieldPaths.set(fieldName, pathValue);
                  }
                }
              }
            }
            
            colIndex++;
          }
          
          // Step 4: Use actual field names as headers
          headers.push(...actualFieldNames);
          
        } else {
          // VERTICAL ORIENTATION:
          // Row 1 = Column headers (e.g., "Field Name", "Path", "Depth", "Files Count")
          // Column 0 (A) = Actual field names (rows 2+)
          // Path column = Column with "Path" header (rows 2+ contain path values)
          
          // Step 1: Read row 1 to find column headers
          const columnHeaders: string[] = [];
          let colIndex = 0;
          while (true) {
            const cellRef = XLSX.utils.encode_col(colIndex) + '1';
            const cell = selectedSheet[cellRef];
            if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
              break;
            }
            columnHeaders.push(String(cell.v).trim());
            colIndex++;
          }

          // Step 2: Check if "Path" column exists
          const pathColumnIndex = columnHeaders.findIndex(h => h.toLowerCase().trim() === 'path');
          
          // Step 3: Read actual field names from column 0 (rows 2+)
          const actualFieldNames: string[] = [];
          let rowIndex = 2;
          
          while (true) {
            const fieldNameCellRef = XLSX.utils.encode_col(0) + rowIndex;
            const fieldNameCell = selectedSheet[fieldNameCellRef];
            
            if (!fieldNameCell || fieldNameCell.v === undefined || fieldNameCell.v === null || fieldNameCell.v === '') {
              break;
            }
            
            const fieldName = String(fieldNameCell.v).trim();
            if (fieldName) {
              actualFieldNames.push(fieldName);
              
              // If Path column exists, read its value for this field
              if (pathColumnIndex >= 0) {
                const pathCellRef = XLSX.utils.encode_col(pathColumnIndex) + rowIndex;
                const pathCell = selectedSheet[pathCellRef];
                
                if (pathCell && pathCell.v !== undefined && pathCell.v !== null && pathCell.v !== '') {
                  const pathValue = String(pathCell.v).trim();
                  if (pathValue) {
                    fieldPaths.set(fieldName, pathValue);
                  }
                }
              }
            }
            
            rowIndex++;
          }
          
          // Step 4: Use actual field names as headers
          headers.push(...actualFieldNames);
        }

        resolve({ 
          headers, 
          sheetNames,
          fieldPaths: fieldPaths.size > 0 ? fieldPaths : undefined
        });
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
        
        // Find path value from any file that has it (exact match - field names should match exactly)
        let pathValue: string | undefined;
        for (const f of uploadedFiles) {
          if (f.fieldPaths) {
            const path = f.fieldPaths.get(header);
            if (path) {
              pathValue = path;
              break; // Use first found path value
            }
          }
        }
        
        mergedFields.push({
          fieldName: header, // Use original casing from first file
          files: fieldMap.get(normalizedHeader)!,
          ...(pathValue && { pathValue }),
        });
      }
    });
  });

  return mergedFields;
}

/**
 * Parse path segments from a hierarchical path string
 * Example: "RefOrderDetail > Notification > Items" -> ["RefOrderDetail", "Notification", "Items"]
 */
export function parsePathSegments(pathValue: string): string[] | undefined {
  if (pathValue && pathValue.includes(' > ')) {
    return pathValue.split(' > ').map(segment => segment.trim()).filter(Boolean);
  }
  return undefined;
}

/**
 * Check if any fields have hierarchical paths
 * Checks both Path column values and field names with " > " separator
 */
export function hasHierarchicalPaths(tableRows: TableRow[]): boolean {
  return tableRows.some(row => {
    // Check if path segments exist (from Path column or parsed from field name)
    if (row.pathSegments && row.pathSegments.length > 1) {
      return true;
    }
    // Also check if field name itself contains path separator
    if (row.fieldName && row.fieldName.includes(' > ')) {
      return true;
    }
    return false;
  });
}

/**
 * Get all unique path segments from table rows
 */
export function getAllPathSegments(tableRows: TableRow[]): string[] {
  const segmentsSet = new Set<string>();
  tableRows.forEach(row => {
    if (row.pathSegments) {
      row.pathSegments.forEach(segment => segmentsSet.add(segment));
    }
  });
  return Array.from(segmentsSet).sort();
}

/**
 * Get all unique path prefixes organized by depth level
 * Returns a map of depth level -> array of path prefixes at that depth
 * Example: { 1: ["RefOrderDetail"], 2: ["RefOrderDetail > Notification"], 3: ["RefOrderDetail > Notification > Items"] }
 */
export function getPathPrefixesByDepth(tableRows: TableRow[]): Map<number, string[]> {
  const prefixesByDepth = new Map<number, Set<string>>();
  
  tableRows.forEach(row => {
    let pathSegments = row.pathSegments;
    if (!pathSegments || pathSegments.length === 0) {
      if (row.fieldName && row.fieldName.includes(' > ')) {
        pathSegments = row.fieldName.split(' > ').map(s => s.trim()).filter(Boolean);
      }
    }
    
    if (pathSegments && pathSegments.length > 0) {
      // For each depth level, create the path prefix up to that depth
      for (let depth = 1; depth <= pathSegments.length; depth++) {
        const prefix = pathSegments.slice(0, depth).join(' > ');
        if (!prefixesByDepth.has(depth)) {
          prefixesByDepth.set(depth, new Set());
        }
        prefixesByDepth.get(depth)!.add(prefix);
      }
    }
  });
  
  // Convert Sets to sorted arrays
  const result = new Map<number, string[]>();
  prefixesByDepth.forEach((prefixes, depth) => {
    result.set(depth, Array.from(prefixes).sort());
  });
  
  return result;
}

/**
 * Convert merged fields to table rows for display
 */
export function convertToTableRows(
  mergedFields: MergedField[],
  uploadedFiles: UploadedFile[]
): TableRow[] {
  return mergedFields.map((field) => {
    // Use Path column value if available, otherwise try parsing field name
    const pathValue = field.pathValue || field.fieldName;
    const pathSegments = parsePathSegments(pathValue);
    
    const row: TableRow = {
      fieldName: field.fieldName,
      ...(pathSegments && { pathSegments }),
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
