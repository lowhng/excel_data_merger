import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUploadArea from '@/components/FileUploadArea';
import MergedFieldsTable from '@/components/MergedFieldsTable';
import { useExcelProcessor } from '@/hooks/useExcelProcessor';

export default function Home() {
  const {
    uploadedFiles,
    tableRows,
    isLoading,
    error,
    handleFileUpload,
    removeFile,
    handleExportCSV,
    clearAll,
    setError,
  } = useExcelProcessor();

  const [showSuccess, setShowSuccess] = useState(false);

  const handleExport = () => {
    handleExportCSV();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Excel Data Merger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Merge and visualize data from multiple Excel files
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Error Alert */}
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

          {/* Success Alert */}
          {showSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                CSV exported successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <FileUploadArea
              onFilesSelected={handleFileUpload}
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeFile}
              isLoading={isLoading}
            />
          </div>

          {/* Results Section */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleExport}
                  disabled={tableRows.length === 0 || isLoading}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export to CSV
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
              </div>

              {/* Table */}
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <MergedFieldsTable
                  tableRows={tableRows}
                  uploadedFiles={uploadedFiles}
                />
              </div>
            </div>
          )}

          {/* Empty State */}
          {uploadedFiles.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Upload Excel files to get started
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
