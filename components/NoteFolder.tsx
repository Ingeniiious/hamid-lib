"use client";

import React, { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import "./NoteFolder.css";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

interface NoteFolderProps {
  name: string;
  color?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
}

const darkenColor = (hex: string, percent: number): string => {
  let color = hex.startsWith("#") ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
};

const NoteFolder: React.FC<NoteFolderProps> = ({
  name,
  color = "#5227FF",
  icon,
  selected = false,
  onClick,
  onContextMenu,
  className = "",
}) => {
  const folderRef = useRef<HTMLDivElement>(null);
  const isTapping = useRef(false);

  const folderBackColor = darkenColor(color, 0.08);
  const paper1 = darkenColor("#ffffff", 0.1);
  const paper2 = darkenColor("#ffffff", 0.05);
  const paper3 = "#ffffff";

  const folderStyle = {
    "--folder-color": color,
    "--folder-back-color": folderBackColor,
    "--paper-1": paper1,
    "--paper-2": paper2,
    "--paper-3": paper3,
  } as React.CSSProperties;

  const handleClick = useCallback(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none)").matches;

    if (isMobile && !isTapping.current) {
      isTapping.current = true;

      // Add extend class for the animation
      const el = folderRef.current;
      if (el) {
        el.classList.add("extend");
      }

      setTimeout(() => {
        if (el) {
          el.classList.remove("extend");
        }
        isTapping.current = false;
        onClick?.();
      }, 300);
    } else if (!isMobile) {
      onClick?.();
    }
  }, [onClick]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE as unknown as [number, number, number, number] }}
      className={`inline-flex flex-col items-center gap-2 ${className}`}
    >
      <div className="relative">
        {selected && (
          <div
            className="note-folder__selected-ring"
            style={{ "--folder-color": color } as React.CSSProperties}
          />
        )}
        <div
          ref={folderRef}
          className="note-folder"
          style={folderStyle}
          onClick={handleClick}
          onContextMenu={onContextMenu}
        >
          <div className="note-folder__back">
            <div className="note-paper" />
            <div className="note-paper" />
            <div className="note-paper" />
            <div className="note-folder__front" />
            <div className="note-folder__front right" />
            {icon && <div className="note-folder__icon">{icon}</div>}
          </div>
        </div>
      </div>
      <span className="text-sm font-medium text-center max-w-[100px] truncate select-none">
        {name}
      </span>
    </motion.div>
  );
};

export default NoteFolder;
