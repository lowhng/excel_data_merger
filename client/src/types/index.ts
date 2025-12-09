/**
 * Type definitions for Excel Data Merger
 */

export type HeaderOrientation = 'horizontal' | 'vertical';

export interface UploadedFile {
  id: string;
  name: string;
  headers: string[];
  uploadedAt: Date;
  sheetNames: string[];
  fieldPaths?: Map<string, string>; // Map of field name to Path column value
}

export interface MergedField {
  fieldName: string;
  files: Map<string, boolean>; // fileId -> isPresent
  pathValue?: string; // Path column value if available (from any file that has it)
}

export interface ProcessedData {
  uploadedFiles: UploadedFile[];
  mergedFields: MergedField[];
}

export interface TableRow {
  fieldName: string;
  pathSegments?: string[]; // Parsed path segments if field name is hierarchical
  [fileId: string]: boolean | string | string[] | undefined;
}

export interface PathFilterSettings {
  enabled: boolean;
  hiddenSegments: Set<string>; // Set of path segments to hide
  expandedPaths: Set<string>; // Set of expanded path prefixes (e.g., "RefOrderDetail > Notification")
  maxDepth: number; // Maximum depth to show by default (default: 2)
}

export interface ParseExcelResult {
  headers: string[];
  sheetNames: string[];
  fieldPaths?: Map<string, string>; // Map of field name to Path column value
}
