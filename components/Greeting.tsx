"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

type GreetingKey = "goodNight" | "goodMorning" | "goodAfternoon" | "goodEvening";

function getGreetingKey(): GreetingKey {
  const hour = new Date().getHours();
  if (hour < 5) return "goodNight";
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  if (hour < 21) return "goodEvening";
  return "goodNight";
}

export function Greeting({ name }: { name: string }) {
  const { t } = useTranslation();
  const [greetingKey, setGreetingKey] = useState<GreetingKey | null>(null);

  useEffect(() => {
    setGreetingKey(getGreetingKey());
  }, []);

  const greeting = greetingKey ? t(`greeting.${greetingKey}`) : t("greeting.hey");

  return `${greeting}, ${name}`;
}
