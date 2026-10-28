import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type PillTone = "success" | "warning" | "pending" | "error" | "info" | "purple" | "neutral" | "brand";

interface StatusPillProps {
  tone: PillTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/** The one status pill for the whole app — soft bg + border + icon + words. Colour is never the only signal. */
export function StatusPill({ tone, icon: Icon, children, className }: StatusPillProps) {
  return (
    <span className={cn("status-pill", `status-pill-${tone}`, className)}>
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}
