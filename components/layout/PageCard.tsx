import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageCardProps {
  /** Plain words, sentence case — the name of the place. */
  title: ReactNode;
  /** One helpful sentence saying what you do here. */
  description?: ReactNode;
  /** Small icon shown in a tinted chip before the title. */
  icon?: ReactNode;
  /** At most one primary button. */
  actions?: ReactNode;
  /** Optional line above the title (e.g. a back link or breadcrumb). */
  eyebrow?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** The standard page-top card: title, one-line description, actions on the right. */
export function PageCard({ title, description, icon, actions, eyebrow, children, className }: PageCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      {eyebrow && <div className="mb-2">{eyebrow}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <span className="icon-chip">{icon}</span>}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
