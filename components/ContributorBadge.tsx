"use client";

import { Badge } from "@/components/ui/badge";

interface ContributorBadgeProps {
  approvedCount: number;
}

export function ContributorBadge({ approvedCount }: ContributorBadgeProps) {
  if (approvedCount >= 5) {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      >
        Top Contributor
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    >
      Contributor
    </Badge>
  );
}
