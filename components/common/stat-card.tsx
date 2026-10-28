import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type StatTint = "red" | "blue" | "teal" | "violet" | "amber";

const TINT_CLASSES: Record<StatTint, string> = {
  red: "bg-tint-red-bg text-tint-red",
  blue: "bg-tint-blue-bg text-tint-blue",
  teal: "bg-tint-teal-bg text-tint-teal",
  violet: "bg-tint-violet-bg text-tint-violet",
  amber: "bg-tint-amber-bg text-tint-amber",
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tint?: StatTint;
  href?: string;
  className?: string;
}

/** A single headline number: label, big value, one line of context. Links to its list when `href` is given. */
export function StatCard({ label, value, hint, icon, tint = "red", href, className }: StatCardProps) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-colors",
        href && "hover:border-primary-border hover:bg-primary-soft/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="stat-card-label">{label}</p>
        {icon && (
          <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TINT_CLASSES[tint])}>
            {icon}
          </span>
        )}
      </div>
      <p className="stat-card-value">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}
