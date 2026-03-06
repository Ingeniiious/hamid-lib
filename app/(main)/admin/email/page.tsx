"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CircleNotch,
  Envelope,
  EnvelopeOpen,
  PaperPlaneTilt,
  ArrowBendUpLeft,
  Trash,
  MagnifyingGlass,
  ArrowClockwise,
  X,
  Paperclip,
  CaretLeft,
  CaretRight,
  PencilSimple,
  ArrowLeft,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface EmailListItem {
  uid: number;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: string;
  seen: boolean;
  snippet: string;
  messageId: string;
}

interface EmailDetail extends EmailListItem {
  html: string;
  text: string;
  cc: { name: string; address: string }[];
  attachments: { filename: string; size: number; contentType: string }[];
  inReplyTo: string | null;
  references: string[];
}

type FilterType = "all" | "unread";
type SendVia = "zoho" | "autosend";

function getAvatarColor(str: string): string {
  const colors = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
    "bg-pink-600",
    "bg-teal-600",
    "bg-indigo-600",
    "bg-orange-600",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").trim() === "";
}

function getInitials(name: string, address: string): string {
  const str = name || address;
  const parts = str.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
}

export default function EmailPage() {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [mobileView, setMobileView] = useState<"list" | "detail" | "compose">(
    "list"
  );

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeInReplyTo, setComposeInReplyTo] = useState("");
  const [composeReferences, setComposeReferences] = useState<string[]>([]);
  const [composeSendVia, setComposeSendVia] = useState<SendVia>("zoho");
  const [sending, setSending] = useState(false);

  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetUid, setDeleteTargetUid] = useState<number | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const LIMIT = 25;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/email/inbox?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();

      let emailList: EmailListItem[] = data.emails || [];
      if (filter === "unread") {
        emailList = emailList.filter((e) => !e.seen);
      }
      setEmails(emailList);
      setTotal(data.total || 0);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch emails"
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filter]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const fetchEmailDetail = useCallback(async (uid: number) => {
    setLoadingDetail(true);
    setSelectedUid(uid);
    try {
      const res = await fetch(`/api/admin/email/${uid}`);
      if (!res.ok) throw new Error("Failed to fetch email");
      const data: EmailDetail = await res.json();
      setSelectedEmail(data);

      if (!data.seen) {
        await fetch(`/api/admin/email/${uid}/read`, { method: "PUT" });
        setEmails((prev) =>
          prev.map((e) => (e.uid === uid ? { ...e, seen: true } : e))
        );
      }
    } catch (err) {
      console.error("Failed to fetch email detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const confirmDelete = (uid: number) => {
    setDeleteTargetUid(uid);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetUid) return;
    const uid = deleteTargetUid;
    setDeleting(uid);
    setDeleteDialogOpen(false);
    try {
      const res = await fetch(`/api/admin/email/${uid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setEmails((prev) => prev.filter((e) => e.uid !== uid));
      if (selectedUid === uid) {
        setSelectedUid(null);
        setSelectedEmail(null);
        setMobileView("list");
      }
    } catch (err) {
      console.error("Failed to delete email:", err);
    } finally {
      setDeleting(null);
      setDeleteTargetUid(null);
    }
  };

  const handleReply = (email: EmailDetail) => {
    setComposeTo(email.from.address);
    setComposeCc("");
    setComposeSubject(
      email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
    );
    setComposeBody("");
    setComposeInReplyTo(email.messageId);
    setComposeReferences([...email.references, email.messageId]);
    setComposeSendVia("zoho");
    setShowCompose(true);
    setMobileView("compose");
  };

  const handleNewEmail = () => {
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setComposeInReplyTo("");
    setComposeReferences([]);
    setComposeSendVia("zoho");
    setShowCompose(true);
    setMobileView("compose");
  };

  const handleCloseCompose = () => {
    setShowCompose(false);
    setMobileView(selectedEmail ? "detail" : "list");
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject || isHtmlEmpty(composeBody)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          ...(composeCc.trim() && { cc: composeCc.trim() }),
          subject: composeSubject,
          html: composeBody,
          ...(composeInReplyTo && { inReplyTo: composeInReplyTo }),
          ...(composeReferences.length > 0 && {
            references: composeReferences,
          }),
          via: composeSendVia,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send");
      }
      setShowCompose(false);
      setMobileView("list");
      fetchEmails();
    } catch (err) {
      console.error("Failed to send email:", err);
      alert(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleSelectEmail = (uid: number) => {
    fetchEmailDetail(uid);
    setShowCompose(false);
    setMobileView("detail");
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  const totalPages = Math.ceil(total / LIMIT);

  const renderEmailBody = (html: string) => {
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.6;color:#333;padding:16px;margin:0;word-break:break-word;}img{max-width:100%;height:auto;}a{color:#2563eb;}</style></head><body>${html}</body></html>`,
      ],
      { type: "text/html" }
    );
    return URL.createObjectURL(blob);
  };

  /* ── Compose Pane ── */
  const composePane = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6",
          "border-gray-900/10 bg-white/30 dark:border-white/10 dark:bg-white/5"
        )}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseCompose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-900/5 dark:hover:bg-white/10 lg:hidden"
          >
            <ArrowLeft weight="duotone" size={20} />
          </button>
          <h3 className="font-display text-base font-light text-gray-900 dark:text-white">
            {composeInReplyTo ? "Reply" : "New Email"}
          </h3>
        </div>
        <button
          onClick={handleCloseCompose}
          className="hidden rounded-lg p-1.5 transition-colors hover:bg-gray-900/5 dark:hover:bg-white/10 lg:flex"
        >
          <X weight="duotone" size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {/* Send via selector */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-900/50 dark:text-white/50">
              Send Via
            </label>
            <Select
              value={composeSendVia}
              onValueChange={(v) => setComposeSendVia(v as SendVia)}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border-gray-900/15 bg-gray-900/5 text-sm dark:border-white/15 dark:bg-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zoho">Zoho (hello@libraryyy.com)</SelectItem>
                <SelectItem value="autosend">AutoSend (noreply)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-900/50 dark:text-white/50">
            To
          </label>
          <input
            type="email"
            value={composeTo}
            onChange={(e) => setComposeTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full rounded-xl border border-gray-900/15 bg-gray-900/5 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-white/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-900/50 dark:text-white/50">
            Cc
          </label>
          <input
            type="text"
            value={composeCc}
            onChange={(e) => setComposeCc(e.target.value)}
            placeholder="cc@example.com"
            className="w-full rounded-xl border border-gray-900/15 bg-gray-900/5 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-white/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-900/50 dark:text-white/50">
            Subject
          </label>
          <input
            type="text"
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full rounded-xl border border-gray-900/15 bg-gray-900/5 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-white/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-900/50 dark:text-white/50">
            Body
          </label>
          <textarea
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            placeholder="Write your message..."
            rows={12}
            className="w-full rounded-xl border border-gray-900/15 bg-gray-900/5 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-white/20"
          />
          <p className="mt-1 text-[11px] text-gray-900/40 dark:text-white/40">
            HTML supported. Content will be sent as-is.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-t px-4 py-3 sm:px-6",
          "border-gray-900/10 dark:border-white/10"
        )}
      >
        <Button
          variant="outline"
          onClick={handleCloseCompose}
          className="rounded-full border-gray-900/15 dark:border-white/15"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={
            sending || !composeTo || !composeSubject || isHtmlEmpty(composeBody)
          }
          className="rounded-full"
        >
          {sending ? (
            <CircleNotch weight="duotone" size={16} className="animate-spin" />
          ) : (
            <PaperPlaneTilt weight="duotone" size={16} />
          )}
          Send
        </Button>
      </div>
    </div>
  );

  /* ── Detail Pane ── */
  const detailPane = selectedEmail ? (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "shrink-0 border-b px-4 py-4 sm:px-6",
          "border-gray-900/10 bg-white/30 dark:border-white/10 dark:bg-white/5"
        )}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={handleBackToList}
            className="mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors hover:bg-gray-900/5 dark:hover:bg-white/10 lg:hidden"
          >
            <ArrowLeft weight="duotone" size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 break-words font-display text-base font-light text-gray-900 dark:text-white sm:text-lg">
              {selectedEmail.subject}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-gray-900/50 dark:text-white/50">
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedEmail.from.name || selectedEmail.from.address}
                </span>
                {selectedEmail.from.name && (
                  <span className="ml-1 hidden sm:inline">
                    &lt;{selectedEmail.from.address}&gt;
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-900/40 dark:text-white/40">
                {new Date(selectedEmail.date).toLocaleString()}
              </span>
            </div>
            {selectedEmail.to.length > 0 && (
              <p className="mt-1 truncate text-xs text-gray-900/40 dark:text-white/40">
                To: {selectedEmail.to.map((t) => t.address).join(", ")}
              </p>
            )}
            {selectedEmail.cc.length > 0 && (
              <p className="truncate text-xs text-gray-900/40 dark:text-white/40">
                Cc: {selectedEmail.cc.map((c) => c.address).join(", ")}
              </p>
            )}
            {selectedEmail.attachments.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-900/40 dark:text-white/40">
                <Paperclip weight="duotone" size={14} />
                {selectedEmail.attachments.length} attachment
                {selectedEmail.attachments.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedEmail.html ? (
          <iframe
            ref={iframeRef}
            srcDoc={selectedEmail.html
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
              .replace(/javascript\s*:/gi, "")}
            className="h-full min-h-[300px] w-full border-0"
            sandbox=""
            title="Email content"
          />
        ) : (
          <div className="whitespace-pre-wrap p-4 text-sm text-gray-900 dark:text-white sm:p-6">
            {selectedEmail.text}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-t px-4 py-3 sm:px-6",
          "border-gray-900/10 bg-white/30 dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Button
          onClick={() => handleReply(selectedEmail)}
          className="rounded-full"
        >
          <ArrowBendUpLeft weight="duotone" size={16} />
          <span className="hidden sm:inline">Reply</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => confirmDelete(selectedEmail.uid)}
          disabled={deleting === selectedEmail.uid}
          className="rounded-full border-red-500/30 text-red-600 hover:bg-red-50 dark:border-red-400/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          {deleting === selectedEmail.uid ? (
            <CircleNotch weight="duotone" size={16} className="animate-spin" />
          ) : (
            <Trash weight="duotone" size={16} />
          )}
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>
    </div>
  ) : null;

  /* ── Empty State ── */
  const emptyPane = (
    <div className="flex h-full flex-col items-center justify-center py-24">
      <EnvelopeOpen
        weight="duotone"
        size={48}
        className="mb-4 text-gray-900/20 dark:text-white/20"
      />
      <p className="mb-4 text-sm text-gray-900/50 dark:text-white/50">
        Select An Email To Read
      </p>
      <Button
        variant="outline"
        onClick={handleNewEmail}
        className="rounded-full border-gray-900/15 dark:border-white/15"
      >
        <PencilSimple weight="duotone" size={16} />
        Compose
      </Button>
    </div>
  );

  /* ── Right Pane Logic ── */
  const rightPane = showCompose ? (
    composePane
  ) : loadingDetail ? (
    <div className="flex h-full items-center justify-center">
      <CircleNotch
        weight="duotone"
        size={32}
        className="animate-spin text-gray-900/30 dark:text-white/30"
      />
    </div>
  ) : selectedEmail ? (
    detailPane
  ) : (
    emptyPane
  );

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="font-display text-2xl font-light text-gray-900 dark:text-white"
        >
          Email
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
        >
          <Button onClick={handleNewEmail} className="rounded-full">
            <PencilSimple weight="duotone" size={16} />
            Compose
          </Button>
        </motion.div>
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.15 }}
        className="flex flex-wrap gap-2"
      >
        <div className="relative min-w-[180px] flex-1">
          <MagnifyingGlass
            weight="duotone"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900/30 dark:text-white/30"
          />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchEmails();
            }}
            className="w-full rounded-xl border border-gray-900/15 bg-gray-900/5 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-white/20"
          />
        </div>

        <Select
          value={filter}
          onValueChange={(v) => {
            setFilter(v as FilterType);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[120px] rounded-xl border-gray-900/15 bg-gray-900/5 dark:border-white/15 dark:bg-white/10">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchEmails()}
          title="Refresh"
          className="rounded-xl border-gray-900/15 dark:border-white/15"
        >
          <ArrowClockwise
            weight="duotone"
            size={16}
            className={loading ? "animate-spin" : ""}
          />
        </Button>
      </motion.div>

      {/* Split Pane */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
        className="grid h-[calc(100vh-280px)] gap-0 lg:grid-cols-[350px_1fr] lg:gap-4"
      >
        {/* Email List */}
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl border",
            "border-gray-900/10 bg-white/50 backdrop-blur-xl",
            "dark:border-white/15 dark:bg-white/10",
            mobileView !== "list" ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <CircleNotch
                  weight="duotone"
                  size={28}
                  className="animate-spin text-gray-900/30 dark:text-white/30"
                />
              </div>
            ) : fetchError ? (
              <div className="px-4 py-16 text-center">
                <Envelope
                  weight="duotone"
                  size={40}
                  className="mx-auto mb-3 text-red-500/60"
                />
                <p className="mb-1 text-sm font-medium text-red-600 dark:text-red-400">
                  Failed To Load Emails
                </p>
                <p className="mb-3 text-xs text-gray-900/40 dark:text-white/40">
                  {fetchError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchEmails()}
                  className="rounded-full border-gray-900/15 dark:border-white/15"
                >
                  <ArrowClockwise weight="duotone" size={14} />
                  Retry
                </Button>
              </div>
            ) : emails.length === 0 ? (
              <div className="py-16 text-center text-gray-900/40 dark:text-white/40">
                <Envelope
                  weight="duotone"
                  size={40}
                  className="mx-auto mb-3 opacity-40"
                />
                <p className="text-sm">No Emails Found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-900/5 dark:divide-white/5">
                {emails.map((email) => {
                  const isSelected =
                    selectedUid === email.uid && !showCompose;
                  return (
                    <button
                      key={email.uid}
                      onClick={() => handleSelectEmail(email.uid)}
                      className={cn(
                        "group w-full border-l-2 px-3 py-3 text-left transition-colors hover:bg-gray-900/5 dark:hover:bg-white/5",
                        isSelected
                          ? "border-l-gray-900 bg-gray-900/5 dark:border-l-white dark:bg-white/10"
                          : "border-l-transparent"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                            getAvatarColor(email.from.address)
                          )}
                        >
                          {getInitials(email.from.name, email.from.address)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {!email.seen && (
                                <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                              )}
                              <span
                                className={cn(
                                  "truncate text-sm",
                                  !email.seen
                                    ? "font-semibold text-gray-900 dark:text-white"
                                    : "text-gray-900/50 dark:text-white/50"
                                )}
                              >
                                {email.from.name || email.from.address}
                              </span>
                            </div>
                            <span className="shrink-0 text-[11px] text-gray-900/30 dark:text-white/30">
                              {formatDistanceToNow(new Date(email.date), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "mt-0.5 truncate text-sm",
                              !email.seen
                                ? "font-medium text-gray-900 dark:text-white"
                                : "text-gray-900/50 dark:text-white/50"
                            )}
                          >
                            {email.subject}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-900/30 dark:text-white/30">
                            {email.snippet}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div
              className={cn(
                "flex shrink-0 items-center justify-between border-t px-3 py-2",
                "border-gray-900/10 bg-white/30 dark:border-white/10 dark:bg-white/5"
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <CaretLeft weight="duotone" size={16} />
              </Button>
              <span className="text-xs text-gray-900/40 dark:text-white/40">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <CaretRight weight="duotone" size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Right Pane */}
        <div
          className={cn(
            "overflow-hidden rounded-2xl border",
            "border-gray-900/10 bg-white/50 backdrop-blur-xl",
            "dark:border-white/15 dark:bg-white/10",
            mobileView === "list"
              ? "hidden lg:flex lg:flex-col"
              : "flex flex-col"
          )}
        >
          {rightPane}
        </div>
      </motion.div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this email. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
