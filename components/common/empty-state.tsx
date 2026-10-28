import type { ReactNode } from "react";
import Link from "next/link";

import { Illustration, type IllustrationName } from "@/components/common/illustration";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  illustration?: IllustrationName;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  tone?: "default" | "good-news";
  className?: string;
}

/** Nothing yet / no results / needs a choice first — icon + bold title + one sentence + optional action. */
export function EmptyState({
  illustration = "empty-list",
  title,
  description,
  action,
  secondaryAction,
  tone = "default",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <Illustration name={illustration} tone={tone} />
      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} variant="default" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
        </div>
      )}
    </div>
  );
}

function ActionButton({ action, variant }: { action: EmptyStateAction; variant: "default" | "secondary" }): ReactNode {
  if (action.href) {
    return (
      <Button asChild variant={variant}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}
