import { UploadedFile } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SheetSelectorProps {
  uploadedFiles: UploadedFile[];
  selectedSheetIndex: number;
  selectedSheetName: string | null;
  sheetNameWarning: string | null;
  onChange: (sheetIndex: number) => void;
  disabled?: boolean;
}

export default function SheetSelector({
  uploadedFiles,
  selectedSheetIndex,
  selectedSheetName,
  sheetNameWarning,
  onChange,
  disabled = false,
}: SheetSelectorProps) {
  // Get available sheet indices from the first file (or all files if they have the same structure)
  const getAvailableSheetIndices = (): number[] => {
    if (uploadedFiles.length === 0) return [];
    
    // Use the first file's sheet count as reference
    const maxSheets = Math.max(...uploadedFiles.map(f => f.sheetNames.length));
    return Array.from({ length: maxSheets }, (_, i) => i);
  };

  const availableIndices = getAvailableSheetIndices();

  const getSheetDisplayName = (index: number): string => {
    if (uploadedFiles.length === 0) return `Sheet ${index + 1}`;
    
    // Try to get the name from the first file
    const firstFileSheetName = uploadedFiles[0]?.sheetNames[index];
    if (firstFileSheetName) {
      return `${firstFileSheetName} (${index + 1})`;
    }
    
    return `Sheet ${index + 1}`;
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Sheet Selection</Label>
      <Select
        value={selectedSheetIndex.toString()}
        onValueChange={(value) => onChange(parseInt(value, 10))}
        disabled={disabled || uploadedFiles.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedSheetName 
              ? `${selectedSheetName} (Sheet ${selectedSheetIndex + 1})`
              : `Sheet ${selectedSheetIndex + 1}`
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableIndices.map((index) => (
            <SelectItem key={index} value={index.toString()}>
              {getSheetDisplayName(index)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {sheetNameWarning && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2 text-xs">
            {sheetNameWarning}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

