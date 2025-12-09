import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadedFile, HeaderOrientation } from '@/types';

interface FileUploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  isLoading: boolean;
  headerOrientation: HeaderOrientation;
}

// Helper function to filter Excel files from a FileList
function filterExcelFiles(fileList: FileList): File[] {
  const excelFiles: File[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file.name.match(/\.xlsx?$/i)) {
      excelFiles.push(file);
    }
  }
  return excelFiles;
}

// Helper function to create a FileList-like object from an array of Files
function createFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach(file => dataTransfer.items.add(file));
  return dataTransfer.files;
}

export default function FileUploadArea({
  onFilesSelected,
  uploadedFiles,
  onRemoveFile,
  isLoading,
  headerOrientation,
}: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
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

    const { files, items } = e.dataTransfer;
    
    // Check if a folder was dropped (using DataTransferItem API)
    if (items && items.length > 0) {
      const item = items[0];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry && 'isDirectory' in entry && entry.isDirectory) {
          // Handle folder drop - traverse directory recursively
          traverseDirectory(entry as FileSystemDirectoryEntry);
          return;
        }
      }
    }
    
    // Handle file drop
    if (files && files.length > 0) {
      const excelFiles = filterExcelFiles(files);
      if (excelFiles.length > 0) {
        onFilesSelected(createFileList(excelFiles));
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const excelFiles = filterExcelFiles(e.target.files);
      if (excelFiles.length > 0) {
        onFilesSelected(createFileList(excelFiles));
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // When using webkitdirectory, all files in the directory tree are included
      const excelFiles = filterExcelFiles(e.target.files);
      if (excelFiles.length > 0) {
        onFilesSelected(createFileList(excelFiles));
      }
      // Reset input so the same folder can be selected again
      e.target.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Recursively traverse directory entries and collect Excel files
  const traverseDirectory = (entry: FileSystemDirectoryEntry) => {
    const excelFiles: File[] = [];
    let pendingOperations = 1; // Start with 1 for the root directory
    
    const processFile = (file: File) => {
      if (file.name.match(/\.xlsx?$/i)) {
        excelFiles.push(file);
      }
      pendingOperations--;
      if (pendingOperations === 0) {
        // All operations complete
        if (excelFiles.length > 0) {
          onFilesSelected(createFileList(excelFiles));
        }
      }
    };
    
    const readDirectory = (dirEntry: FileSystemDirectoryEntry): void => {
      const reader = dirEntry.createReader();
      const allEntries: FileSystemEntry[] = [];
      
      const readBatch = (): void => {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            // All entries read for this directory, process them
            allEntries.forEach((entry) => {
              if (entry.isDirectory) {
                pendingOperations++;
                readDirectory(entry as FileSystemDirectoryEntry);
              } else if (entry.isFile) {
                pendingOperations++;
                (entry as FileSystemFileEntry).file(
                  (file) => processFile(file),
                  () => {
                    pendingOperations--;
                    if (pendingOperations === 0 && excelFiles.length > 0) {
                      onFilesSelected(createFileList(excelFiles));
                    }
                  }
                );
              }
            });
            
            pendingOperations--;
            if (pendingOperations === 0 && excelFiles.length > 0) {
              onFilesSelected(createFileList(excelFiles));
            }
          } else {
            allEntries.push(...entries);
            readBatch(); // Continue reading
          }
        });
      };
      
      readBatch();
    };
    
    readDirectory(entry);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
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
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={handleFolderInputChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-2">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm text-foreground">
              {isDragOver ? 'Drop your files or folder here' : 'Drag and drop Excel files or folder here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to select files
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          LOADED FILES ({uploadedFiles.length})
        </h3>
        {uploadedFiles.length > 0 ? (
          <div className="space-y-2 overflow-y-auto flex-1">
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
                    {file.headers.length} {headerOrientation === 'horizontal' ? 'columns' : 'rows'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  disabled={isLoading}
                  className="ml-2 h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No files loaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
