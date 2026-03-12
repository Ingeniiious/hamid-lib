"use client";

import { PageHeader } from "@/components/PageHeader";
import { useTranslation } from "@/lib/i18n";

interface TranslatedPageHeaderProps {
  titleKey: string;
  subtitleKey?: string;
}

export function TranslatedPageHeader({ titleKey, subtitleKey }: TranslatedPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <PageHeader
      title={t(titleKey)}
      subtitle={subtitleKey ? t(subtitleKey) : undefined}
    />
  );
}
