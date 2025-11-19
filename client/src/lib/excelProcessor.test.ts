import { describe, it, expect, beforeEach } from 'vitest';
import { mergeHeaders, convertToTableRows, exportToExcel } from './excelProcessor';
import { UploadedFile, MergedField } from '@/types';
import { FileRenameSettings } from '@/components/FileRenameSettings';
import * as XLSX from 'xlsx';

describe('excelProcessor', () => {
  let mockFiles: UploadedFile[];

  beforeEach(() => {
    mockFiles = [
      {
        id: 'file-1',
        name: '9022P.xlsx',
        headers: [
          'Notification',
          'Defect Order(s)',
          'Results Satisfactory',
          'Condition Ranking',
          'Charger Make',
          'Battery Make',
        ],
        uploadedAt: new Date(),
      },
      {
        id: 'file-2',
        name: '9033P.xlsx',
        headers: [
          'Notification',
          'Defect Order(s)',
          'Results Satisfactory',
          'CB1 Function',
          'CB1 Remote Trip',
          'CB2 Function',
        ],
        uploadedAt: new Date(),
      },
    ];
  });

  describe('mergeHeaders', () => {
    it('should merge headers from multiple files', () => {
      const merged = mergeHeaders(mockFiles);

      expect(merged.length).toBeGreaterThan(0);
      expect(merged.some((f) => f.fieldName === 'Notification')).toBe(true);
    });

    it('should identify fields present in both files', () => {
      const merged = mergeHeaders(mockFiles);
      const notificationField = merged.find((f) => f.fieldName === 'Notification');

      expect(notificationField).toBeDefined();
      expect(notificationField?.files.size).toBe(2);
      expect(notificationField?.files.has('file-1')).toBe(true);
      expect(notificationField?.files.has('file-2')).toBe(true);
    });

    it('should identify fields present in only one file', () => {
      const merged = mergeHeaders(mockFiles);
      const chargerMakeField = merged.find((f) => f.fieldName === 'Charger Make');

      expect(chargerMakeField).toBeDefined();
      expect(chargerMakeField?.files.size).toBe(1);
      expect(chargerMakeField?.files.has('file-1')).toBe(true);
      expect(chargerMakeField?.files.has('file-2')).toBe(false);
    });

    it('should handle case-insensitive field matching', () => {
      const filesWithDifferentCases: UploadedFile[] = [
        {
          id: 'file-1',
          name: 'file1.xlsx',
          headers: ['Field Name', 'Another Field'],
          uploadedAt: new Date(),
        },
        {
          id: 'file-2',
          name: 'file2.xlsx',
          headers: ['field name', 'Another Field'],
          uploadedAt: new Date(),
        },
      ];

      const merged = mergeHeaders(filesWithDifferentCases);

      // Should have only 2 unique fields (case-insensitive)
      expect(merged.length).toBe(2);
      expect(merged[0].files.size).toBe(2);
    });

    it('should handle empty file list', () => {
      const merged = mergeHeaders([]);
      expect(merged).toEqual([]);
    });

    it('should remove duplicate headers within the same file', () => {
      const filesWithDuplicates: UploadedFile[] = [
        {
          id: 'file-1',
          name: 'file1.xlsx',
          headers: ['Field A', 'Field B', 'Field A'],
          uploadedAt: new Date(),
        },
      ];

      const merged = mergeHeaders(filesWithDuplicates);

      // Should have only 2 unique fields
      expect(merged.length).toBe(2);
    });
  });

  describe('convertToTableRows', () => {
    it('should convert merged fields to table rows', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);

      expect(rows.length).toBe(merged.length);
      expect(rows[0]).toHaveProperty('fieldName');
      expect(rows[0]).toHaveProperty('file-1');
      expect(rows[0]).toHaveProperty('file-2');
    });

    it('should correctly mark file presence in table rows', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);

      const notificationRow = rows.find((r) => r.fieldName === 'Notification');
      expect(notificationRow?.['file-1']).toBe(true);
      expect(notificationRow?.['file-2']).toBe(true);

      const chargerMakeRow = rows.find((r) => r.fieldName === 'Charger Make');
      expect(chargerMakeRow?.['file-1']).toBe(true);
      expect(chargerMakeRow?.['file-2']).toBe(false);
    });

    it('should handle empty merged fields', () => {
      const rows = convertToTableRows([], mockFiles);
      expect(rows).toEqual([]);
    });
  });

  describe('exportToExcel', () => {
    const defaultRenameSettings: FileRenameSettings = {
      enabled: false,
      mode: 'first',
      characterCount: 10,
    };

    it('should export table rows to Excel format', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);
      const workbook = exportToExcel(rows, mockFiles, defaultRenameSettings);

      expect(workbook.SheetNames).toContain('Merged Fields');
      const worksheet = workbook.Sheets['Merged Fields'];
      expect(worksheet).toBeDefined();
    });

    it('should format Excel with correct headers', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);
      const workbook = exportToExcel(rows, mockFiles, defaultRenameSettings);

      const worksheet = workbook.Sheets['Merged Fields'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      expect(data[0]).toContain('Fields');
      expect(data[0]).toContain('9022P');
      expect(data[0]).toContain('9033P');
    });

    it('should mark fields with checkmark when present', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);
      const workbook = exportToExcel(rows, mockFiles, defaultRenameSettings);

      const worksheet = workbook.Sheets['Merged Fields'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find the Notification row (should be in both files)
      const notificationRow = data.find((row) => row[0] === 'Notification');
      expect(notificationRow).toBeDefined();
      expect(notificationRow?.[1]).toBe('✓');
      expect(notificationRow?.[2]).toBe('✓');
    });

    it('should handle empty rows gracefully', () => {
      const workbook = exportToExcel([], mockFiles, defaultRenameSettings);

      const worksheet = workbook.Sheets['Merged Fields'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      expect(data[0]).toContain('Fields');
      expect(data.length).toBe(1); // Only header
    });

    it('should apply rename settings when enabled', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);
      const renameSettings: FileRenameSettings = {
        enabled: true,
        mode: 'first',
        characterCount: 3,
      };
      const workbook = exportToExcel(rows, mockFiles, renameSettings);

      const worksheet = workbook.Sheets['Merged Fields'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Headers should be shortened to first 3 characters
      expect(data[0]).toContain('902');
      expect(data[0]).toContain('903');
    });

    it('should handle last character mode in rename settings', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);
      const renameSettings: FileRenameSettings = {
        enabled: true,
        mode: 'last',
        characterCount: 3,
      };
      const workbook = exportToExcel(rows, mockFiles, renameSettings);

      const worksheet = workbook.Sheets['Merged Fields'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Headers should be shortened to last 3 characters
      expect(data[0]).toContain('22P');
      expect(data[0]).toContain('33P');
    });
  });

  describe('Integration tests', () => {
    it('should handle complete workflow: merge -> convert -> export', () => {
      const merged = mergeHeaders(mockFiles);
      const rows = convertToTableRows(merged, mockFiles);
      const defaultRenameSettings: FileRenameSettings = {
        enabled: false,
        mode: 'first',
        characterCount: 10,
      };
      const workbook = exportToExcel(rows, mockFiles, defaultRenameSettings);

      expect(merged.length).toBeGreaterThan(0);
      expect(rows.length).toBe(merged.length);
      expect(workbook.SheetNames.length).toBeGreaterThan(0);

      const worksheet = workbook.Sheets['Merged Fields'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      expect(data.length).toBe(merged.length + 1); // +1 for header
    });

    it('should preserve field order from first file', () => {
      const merged = mergeHeaders(mockFiles);

      // The first fields should match the order from the first file
      expect(merged[0].fieldName).toBe('Notification');
      expect(merged[1].fieldName).toBe('Defect Order(s)');
      expect(merged[2].fieldName).toBe('Results Satisfactory');
    });
  });
});
