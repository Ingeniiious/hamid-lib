"use client";

import { useEffect, useState } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good Night";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

export function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Hey");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return `${greeting}, ${name}`;
}
