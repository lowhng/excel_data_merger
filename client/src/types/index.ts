/**
 * Type definitions for Excel Data Merger
 */

export interface UploadedFile {
  id: string;
  name: string;
  headers: string[];
  uploadedAt: Date;
}

export interface MergedField {
  fieldName: string;
  files: Map<string, boolean>; // fileId -> isPresent
}

export interface ProcessedData {
  uploadedFiles: UploadedFile[];
  mergedFields: MergedField[];
}

export interface TableRow {
  fieldName: string;
  [fileId: string]: boolean | string;
}
