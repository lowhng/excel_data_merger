import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, Trash2, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import FileUploadArea from '@/components/FileUploadArea';
import MergedFieldsTable from '@/components/MergedFieldsTable';
import FileRenameSettingsDialog, {
  FileRenameSettings,
} from '@/components/FileRenameSettings';
import FilterControls, { FilterSettings } from '@/components/FilterControls';
import HeaderOrientationToggle from '@/components/HeaderOrientationToggle';
import SheetSelector from '@/components/SheetSelector';
import PathFilterControls from '@/components/PathFilterControls';
import { PathFilterSettings } from '@/types';
import { useExcelProcessor } from '@/hooks/useExcelProcessor';

export default function Home() {
  const {
    uploadedFiles,
    tableRows,
    isLoading,
    error,
    headerOrientation,
    selectedSheetIndex,
    selectedSheetName,
    sheetNameWarning,
    handleFileUpload,
    removeFile,
    handleExportExcel,
    clearAll,
    setError,
    changeHeaderOrientation,
    changeSheetIndex,
  } = useExcelProcessor();

  const [showSuccess, setShowSuccess] = useState(false);
  const [renameSettings, setRenameSettings] = useState<FileRenameSettings>({
    enabled: false,
    mode: 'first',
    characterCount: 10,
  });
  const [isSettingsCardOpen, setIsSettingsCardOpen] = useState(false);
  const [isFiltersCardOpen, setIsFiltersCardOpen] = useState(false);

  // Initialize filter settings with all files selected
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(() => ({
    selectedFileIds: new Set(),
    fieldNameSearch: '',
    fieldPresenceFilter: 'all',
    exactCount: undefined,
    fileSort: 'none',
  }));

  // Initialize path filter settings
  const [pathFilterSettings, setPathFilterSettings] = useState<PathFilterSettings>(() => ({
    enabled: false,
    hiddenSegments: new Set(),
    expandedPaths: new Set(),
    maxDepth: 2,
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
              headerOrientation={headerOrientation}
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

                {/* Settings Section - Two Side-by-Side Cards */}
                <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Card 1: Header Orientation, Sheet Selection, and Path Filtering */}
                  <Collapsible open={isSettingsCardOpen} onOpenChange={setIsSettingsCardOpen}>
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
                        >
                          <span className="font-medium">Settings</span>
                          {isSettingsCardOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4">
                          <HeaderOrientationToggle
                            orientation={headerOrientation}
                            onChange={changeHeaderOrientation}
                            disabled={isLoading || uploadedFiles.length === 0}
                          />
                          <SheetSelector
                            uploadedFiles={uploadedFiles}
                            selectedSheetIndex={selectedSheetIndex}
                            selectedSheetName={selectedSheetName}
                            sheetNameWarning={sheetNameWarning}
                            onChange={changeSheetIndex}
                            disabled={isLoading}
                          />
                          <div className="pt-2 border-t border-border">
                            <PathFilterControls
                              tableRows={tableRows}
                              pathFilterSettings={pathFilterSettings}
                              onSettingsChange={setPathFilterSettings}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  {/* Card 2: Filter Controls */}
                  <Collapsible open={isFiltersCardOpen} onOpenChange={setIsFiltersCardOpen}>
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Filters</span>
                            {filterSettings.selectedFileIds.size !== uploadedFiles.length ||
                            filterSettings.fieldNameSearch !== '' ||
                            filterSettings.fieldPresenceFilter !== 'all' ||
                            filterSettings.fileSort !== 'none' ? (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            ) : null}
                          </div>
                          {isFiltersCardOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <FilterControls
                          uploadedFiles={uploadedFiles}
                          filterSettings={filterSettings}
                          onFilterChange={setFilterSettings}
                          headerOrientation={headerOrientation}
                        />
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>

                {/* Table */}
                <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden min-h-0">
                  <MergedFieldsTable
                    tableRows={tableRows}
                    uploadedFiles={uploadedFiles}
                    renameSettings={renameSettings}
                    filterSettings={filterSettings}
                    pathFilterSettings={pathFilterSettings}
                    onPathFilterSettingsChange={setPathFilterSettings}
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
