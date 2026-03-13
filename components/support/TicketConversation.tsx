"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./MessageBubble";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Message {
  id: number;
  senderType: string;
  senderId: string | null;
  message: string;
  isAiGenerated: boolean;
  createdAt: string;
}

interface TicketConversationProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isPending: boolean;
  senderRole: "user" | "admin";
}

export function TicketConversation({
  messages,
  onSendMessage,
  isPending,
  senderRole,
}: TicketConversationProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    onSendMessage(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="flex flex-col rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
      style={{ height: "min(500px, 60vh)" }}
    >
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg.message}
            senderType={msg.senderType}
            createdAt={msg.createdAt}
            isCurrentUser={
              senderRole === "user"
                ? msg.senderType === "user"
                : msg.senderType === "admin"
            }
          />
        ))}
      </div>

      {/* Reply input */}
      <div className="shrink-0 border-t border-gray-900/10 p-4 dark:border-white/10">
        <div className="flex items-end gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("support.typeYourMessage")}
            rows={2}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border-gray-900/10 bg-white/60 text-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || isPending}
            className="h-11 rounded-full bg-[#5227FF] px-6 text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? t("common.sending") : t("support.sendMessage")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
