"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import {
  getNotificationPreferences,
  updateNotificationPreference,
  toggleMuteAll,
  type NotificationPrefs,
} from "@/lib/notification-preferences";
import { useTranslation } from "@/lib/i18n";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

type BooleanKeys = {
  [K in keyof NotificationPrefs]: NotificationPrefs[K] extends boolean ? K : never;
}[keyof NotificationPrefs];

interface PrefRow {
  label: string;
  pushKey: BooleanKeys;
}

export default function NotificationPreferences() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [muted, setMuted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getNotificationPreferences().then((p) => {
      if (p) {
        setPrefs(p);
        setMuted(p.mutedUntil ? new Date(p.mutedUntil) > new Date() : false);
      }
    });
  }, []);

  if (!prefs) return null;

  const rows: PrefRow[] = [
    {
      label: t("notifications.prefContribution"),
      pushKey: "contributionPush",
    },
    {
      label: t("notifications.prefCourseUpdate"),
      pushKey: "courseUpdatePush",
    },
    {
      label: t("notifications.prefFacultyUpdate"),
      pushKey: "facultyUpdatePush",
    },
    {
      label: t("notifications.prefSystem"),
      pushKey: "systemPush",
    },
  ];

  const handleToggle = (key: BooleanKeys, value: boolean) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    startTransition(async () => {
      await updateNotificationPreference(key, value);
    });
  };

  const handleMuteToggle = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    startTransition(async () => {
      await toggleMuteAll(newMuted);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full"
    >
      <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-gray-100 mb-4">
        {t("notifications.preferences")}
      </h3>

      {/* Mute All */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t("notifications.muteAll")}
        </span>
        <ToggleSwitch checked={muted} onChange={handleMuteToggle} />
      </div>

      {/* Per-category push toggles */}
      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.pushKey}
            className="flex items-center justify-center gap-4"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px] text-center">
              {row.label}
            </span>
            <ToggleSwitch
              checked={!!prefs[row.pushKey]}
              onChange={(v) => handleToggle(row.pushKey, v)}
              disabled={muted}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${checked ? "bg-[#5227FF]" : "bg-gray-200 dark:bg-gray-700"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <motion.span
        animate={{ x: checked ? 20 : 2 }}
        transition={{ ease: EASE, duration: 0.2 }}
        className="inline-block h-5 w-5 rounded-full bg-white shadow"
      />
    </button>
  );
}
