import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UploadedFile, TableRow as TableRowType } from '@/types';
import { Badge } from '@/components/ui/badge';

interface MergedFieldsTableProps {
  tableRows: TableRowType[];
  uploadedFiles: UploadedFile[];
}

export default function MergedFieldsTable({
  tableRows,
  uploadedFiles,
}: MergedFieldsTableProps) {
  const fileColumns = useMemo(() => {
    return uploadedFiles.map((file) => ({
      id: file.id,
      name: file.name.replace(/\.xlsx?$/i, ''),
      shortName: file.name.replace(/\.xlsx?$/i, '').substring(0, 10),
    }));
  }, [uploadedFiles]);

  if (tableRows.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-muted-foreground">No data to display</p>
          <p className="text-sm text-muted-foreground/75">
            Upload Excel files to see merged fields
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold text-foreground min-w-[300px] sticky left-0 bg-muted/50 z-10">
                Fields
              </TableHead>
              {fileColumns.map((col) => (
                <TableHead
                  key={col.id}
                  className="font-semibold text-foreground text-center min-w-[100px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="hidden sm:inline" title={col.name}>
                      {col.shortName}
                    </span>
                    <span className="sm:hidden text-xs">{col.shortName}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((row, index) => (
              <TableRow
                key={index}
                className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
              >
                <TableCell className="font-medium text-foreground sticky left-0 z-10 bg-inherit">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{row.fieldName}</span>
                    <Badge
                      variant="secondary"
                      className="text-xs whitespace-nowrap"
                    >
                      {fileColumns.filter((col) => row[col.id]).length}/{fileColumns.length}
                    </Badge>
                  </div>
                </TableCell>
                {fileColumns.map((col) => (
                  <TableCell
                    key={col.id}
                    className="text-center"
                  >
                    {row[col.id] ? (
                      <div className="flex justify-center">
                        <Badge variant="default" className="text-xs">
                          ✓
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-3 bg-muted/30 border-t border-border text-sm text-muted-foreground">
        Total fields: <span className="font-semibold text-foreground">{tableRows.length}</span>
      </div>
    </div>
  );
}
