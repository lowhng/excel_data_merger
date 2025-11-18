import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadedFile } from '@/types';

interface FileUploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  isLoading: boolean;
}

export default function FileUploadArea({
  onFilesSelected,
  uploadedFiles,
  onRemoveFile,
  isLoading,
}: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {isDragOver ? 'Drop your files here' : 'Drag and drop Excel files here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse your computer
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: .xlsx, .xls
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file.headers.length} columns
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(file.id)}
                  disabled={isLoading}
                  className="ml-2 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
