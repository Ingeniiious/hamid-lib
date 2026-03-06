"use client";

import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchValue?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  page,
  totalPages,
  onPageChange,
  searchValue,
  onSearch,
  searchPlaceholder = "Search...",
  onRowClick,
  loading = false,
  emptyMessage = "No data found.",
}: DataTableProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="space-y-4"
    >
      {onSearch && (
        <div className="flex items-center">
          <Input
            value={searchValue ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="max-w-sm rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          />
        </div>
      )}

      <div className="rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-900/10 dark:border-white/10 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-gray-900/60 dark:text-white/60 text-sm"
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow
                  key={i}
                  className="border-gray-900/5 dark:border-white/5 hover:bg-transparent"
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-gray-900/40 dark:text-white/40"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={() => onRowClick?.(item)}
                  className={`border-gray-900/5 dark:border-white/5 transition-colors ${
                    onRowClick
                      ? "hover:bg-gray-900/5 dark:hover:bg-white/5 cursor-pointer"
                      : ""
                  }`}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className="text-gray-900 dark:text-white"
                    >
                      {col.render
                        ? col.render(item)
                        : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            Prev
          </Button>
          <span className="text-sm text-gray-900/60 dark:text-white/60">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            Next
          </Button>
        </div>
      )}
    </motion.div>
  );
}
