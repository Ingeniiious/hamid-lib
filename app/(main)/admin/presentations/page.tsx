"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion } from "framer-motion";
import { Trash } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { listPresentations, deletePresentation } from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Presentation {
  id: number;
  userId: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  requireApproval: boolean;
  createdAt: string;
  uploaderName: string;
  uploaderEmail: string;
  codeCount: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function PresentationsPage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(
    (currentPage: number, currentSearch: string) => {
      startTransition(async () => {
        const result = await listPresentations({
          search: currentSearch || undefined,
          page: currentPage,
          limit: 20,
        });
        setPresentations(result.presentations);
        setTotalPages(result.totalPages);
      });
    },
    []
  );

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData(page, debouncedSearch);
  }, [page, debouncedSearch, loadData]);

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this presentation?")) return;
    startTransition(async () => {
      const result = await deletePresentation(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      loadData(page, search);
    });
  };

  const columns = [
    {
      key: "fileName",
      header: "File Name",
      render: (item: Presentation) => (
        <span className="text-sm font-medium">{item.fileName}</span>
      ),
    },
    {
      key: "uploaderName",
      header: "Uploader",
      render: (item: Presentation) => (
        <div>
          <p className="text-sm">{item.uploaderName}</p>
          <p className="text-xs text-gray-900/40 dark:text-white/40">
            {item.uploaderEmail}
          </p>
        </div>
      ),
    },
    {
      key: "fileType",
      header: "Type",
      render: (item: Presentation) => (
        <Badge
          variant="outline"
          className="border-gray-900/10 text-xs dark:border-white/15"
        >
          {item.fileType}
        </Badge>
      ),
    },
    {
      key: "fileSize",
      header: "Size",
      render: (item: Presentation) => (
        <span className="text-sm text-gray-900/60 dark:text-white/60">
          {formatFileSize(item.fileSize)}
        </span>
      ),
    },
    {
      key: "requireApproval",
      header: "Approval Required",
      render: (item: Presentation) => (
        <Badge
          variant="outline"
          className={
            item.requireApproval
              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border-gray-900/10 dark:border-white/15"
          }
        >
          {item.requireApproval ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "codeCount",
      header: "Codes",
      render: (item: Presentation) => (
        <span className="text-sm text-gray-900/60 dark:text-white/60">
          {item.codeCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (item: Presentation) => (
        <span className="text-sm text-gray-900/60 dark:text-white/60">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: Presentation) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(item.id);
          }}
          className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
        >
          <Trash size={16} weight="duotone" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="font-display text-2xl font-light text-gray-900 dark:text-white"
      >
        Presentations
      </motion.h2>

      <DataTable<Presentation>
        columns={columns}
        data={presentations}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search by file name..."
        loading={isPending && presentations.length === 0}
        emptyMessage="No presentations found."
      />
    </div>
  );
}
