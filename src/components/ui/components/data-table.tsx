import { cn } from "../lib/utils";
import { TableColumn, TableSort } from "@/types";

export interface DataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  sort?: TableSort;
  onSort?: (sort: TableSort) => void;
  className?: string;
}

export function DataTable<T = any>({
  data,
  columns,
  sort,
  onSort,
  className,
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    const newDirection = sort?.key === key && sort.direction === "asc" ? "desc" : "asc";
    onSort({ key, direction: newDirection });
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-md border">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
                    column.sortable && "cursor-pointer hover:bg-muted/75"
                  )}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sort?.key === String(column.key) && (
                      <span className="text-xs">
                        {sort.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className="p-4 align-middle">
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
