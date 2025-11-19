import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, Trash2, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUploadArea from '@/components/FileUploadArea';
import MergedFieldsTable from '@/components/MergedFieldsTable';
import FileRenameSettingsDialog, {
  FileRenameSettings,
} from '@/components/FileRenameSettings';
import FilterControls, { FilterSettings } from '@/components/FilterControls';
import { useExcelProcessor } from '@/hooks/useExcelProcessor';

export default function Home() {
  const {
    uploadedFiles,
    tableRows,
    isLoading,
    error,
    handleFileUpload,
    removeFile,
    handleExportExcel,
    clearAll,
    setError,
  } = useExcelProcessor();

  const [showSuccess, setShowSuccess] = useState(false);
  const [renameSettings, setRenameSettings] = useState<FileRenameSettings>({
    enabled: false,
    mode: 'first',
    characterCount: 10,
  });

  // Initialize filter settings with all files selected
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(() => ({
    selectedFileIds: new Set(),
    fieldNameSearch: '',
    fieldPresenceFilter: 'all',
    exactCount: undefined,
    fileSort: 'none',
  }));

  // Update selected files when uploadedFiles changes
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      const allFileIds = new Set(uploadedFiles.map((f) => f.id));
      
      setFilterSettings((prev) => {
        const currentSelected = prev.selectedFileIds;
        
        // Only update if the sets are different
        const currentSet = new Set(currentSelected);
        const isEqual = 
          allFileIds.size === currentSet.size &&
          Array.from(allFileIds).every((id) => currentSet.has(id));
        
        if (isEqual) {
          return prev; // No change needed
        }
        
        // Add new files to selection, keep existing selections
        const newSelected = new Set(currentSelected);
        uploadedFiles.forEach((file) => {
          if (!currentSelected.has(file.id)) {
            newSelected.add(file.id);
          }
        });
        // Remove files that no longer exist
        Array.from(newSelected).forEach((id) => {
          if (!allFileIds.has(id)) {
            newSelected.delete(id);
          }
        });
        
        return {
          ...prev,
          selectedFileIds: newSelected,
        };
      });
    } else {
      // Clear selection when no files
      setFilterSettings((prev) => {
        if (prev.selectedFileIds.size === 0) {
          return prev; // No change needed
        }
        return {
          ...prev,
          selectedFileIds: new Set(),
        };
      });
    }
  }, [uploadedFiles]);

  const handleExport = () => {
    handleExportExcel(renameSettings, filterSettings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-blue-700 text-white">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Excel Data Merger</h1>
              <p className="text-sm text-white/90 mt-1">
                Merge and visualize data from multiple Excel files
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/90">
              <Shield className="w-4 h-4" />
              <span>All processing is done locally on your device</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 bg-card border-r border-border flex flex-col overflow-hidden">
          <div className="p-4 flex-1 overflow-y-auto">
            <FileUploadArea
              onFilesSelected={handleFileUpload}
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeFile}
              isLoading={isLoading}
            />
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
          {/* Error/Success Alerts */}
          <div className="px-6 pt-4 space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  {error}
                  <button
                    onClick={() => setError(null)}
                    className="ml-2 underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {showSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  Excel file exported successfully!
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Table Content Area */}
          <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
            {uploadedFiles.length > 0 ? (
              <div className="flex flex-col h-full">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button
                    onClick={handleExport}
                    disabled={tableRows.length === 0 || isLoading}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export to Excel
                  </Button>
                  <Button
                    onClick={clearAll}
                    variant="outline"
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </Button>
                  <FileRenameSettingsDialog
                    settings={renameSettings}
                    onSettingsChange={setRenameSettings}
                  />
                </div>

                {/* Filter Controls */}
                <div className="mb-4 bg-card border border-border rounded-lg overflow-hidden">
                  <FilterControls
                    uploadedFiles={uploadedFiles}
                    filterSettings={filterSettings}
                    onFilterChange={setFilterSettings}
                  />
                </div>

                {/* Table */}
                <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden min-h-0">
                  <MergedFieldsTable
                    tableRows={tableRows}
                    uploadedFiles={uploadedFiles}
                    renameSettings={renameSettings}
                    filterSettings={filterSettings}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 text-muted-foreground/50">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-full h-full"
                    >
                      <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    No Excel Files Loaded
                  </h2>
                  <p className="text-muted-foreground">
                    Upload one or more Excel files to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
