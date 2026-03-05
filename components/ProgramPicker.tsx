"use client";

import { useState } from "react";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProgramPickerProps {
  programs: { id: number; name: string; slug: string }[];
  value: number | null;
  onChange: (id: number | null) => void;
  variant?: "auth" | "settings";
}

export function ProgramPicker({
  programs,
  value,
  onChange,
  variant = "settings",
}: ProgramPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isAuth = variant === "auth";
  const selected = programs.find((p) => p.id === value);

  const triggerClass = isAuth
    ? "relative flex h-10 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-center text-sm text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    : "relative flex h-10 w-full items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 transition-colors hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus-visible:ring-white/30";

  const labelClass = isAuth
    ? value ? "text-white" : "text-white/50"
    : value ? "text-gray-900 dark:text-white" : "text-gray-900/40 dark:text-white/50";

  const caretClass = isAuth
    ? "absolute right-5 text-white/40"
    : "absolute right-5 text-gray-900/30 dark:text-white/40";

  const popoverClass = isAuth
    ? "!w-[--radix-popover-trigger-width] rounded-2xl border-gray-900/15 bg-white/70 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-white/10"
    : "!w-[--radix-popover-trigger-width] rounded-2xl border-gray-900/15 bg-white/90 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-gray-900/95 dark:backdrop-blur-xl";

  const itemClass =
    "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-900/80 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white";
  const mutedItemClass =
    "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900/60 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/60";
  const searchInputClass =
    "w-full rounded-lg border border-gray-900/10 bg-gray-900/5 px-3 py-1.5 text-center text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30";

  const filtered = programs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={triggerClass}
        >
          <span className={`truncate ${labelClass}`}>
            {selected?.name || (isAuth ? "Program" : "Select Program")}
          </span>
          <CaretUpDown size={16} weight="duotone" className={caretClass} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={popoverClass} sideOffset={4}>
        <div className="flex h-[260px] flex-col">
          <div className="shrink-0 px-1 pb-1.5 pt-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className={searchInputClass}
              autoFocus
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setSearch("");
                  setOpen(false);
                }}
                className={itemClass}
              >
                {value === p.id && (
                  <Check
                    size={14}
                    className="absolute left-3 text-gray-900 dark:text-white"
                  />
                )}
                {p.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-3 text-center text-sm text-gray-900/40 dark:text-white/40">
                No match found.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSearch("");
                setOpen(false);
              }}
              className={mutedItemClass}
            >
              Skip
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
