import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Small icon shown in a tinted chip before the title. */
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Remove body padding — for tables and lists that run edge to edge. */
  flush?: boolean;
}

/** The standard white card: header (title, description, actions), body, optional footer. */
export function SectionCard({ title, description, icon, actions, children, footer, className, flush }: SectionCardProps) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      {hasHeader && (
        <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-4", flush ? "pb-4" : "pb-3")}>
          <div className="flex min-w-0 items-start gap-3">
            {icon && <span className="icon-chip h-9 w-9">{icon}</span>}
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(flush ? hasHeader && "border-t border-border" : "px-5 pb-5", !hasHeader && !flush && "pt-5")}>
        {children}
      </div>
      {footer && <div className="border-t border-border bg-surface-subtle px-5 py-3">{footer}</div>}
    </section>
  );
}
