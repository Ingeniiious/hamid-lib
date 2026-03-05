"use client";

import { useState } from "react";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OptionPickerProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  size?: "sm" | "md";
}

export function OptionPicker<T extends string | number>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  size = "md",
}: OptionPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  const isSm = size === "sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={`relative flex w-full items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center transition-colors hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15 dark:focus-visible:ring-white/30 ${isSm ? "h-8 text-xs" : "h-10 text-sm"}`}
        >
          <span
            className={
              selected
                ? "text-gray-900 dark:text-white"
                : "text-gray-900/40 dark:text-white/50"
            }
          >
            {selected?.label || placeholder}
          </span>
          <CaretUpDown
            size={isSm ? 14 : 16}
            weight="duotone"
            className="absolute right-4 text-gray-900/30 dark:text-white/40"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="!w-[--radix-popover-trigger-width] rounded-xl border-gray-900/15 bg-white/90 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-[var(--background)]/95 dark:backdrop-blur-xl"
        sideOffset={4}
      >
        <div className="max-h-[200px] overflow-y-auto">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`relative flex w-full items-center justify-center rounded-lg px-3 text-center transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white ${isSm ? "py-1.5 text-xs" : "py-2 text-sm"} ${
                value === opt.value
                  ? "font-medium text-gray-900 dark:text-white"
                  : "text-gray-900/70 dark:text-white/70"
              }`}
            >
              {value === opt.value && (
                <Check
                  size={12}
                  weight="bold"
                  className="absolute left-3 text-gray-900 dark:text-white"
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
