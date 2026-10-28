import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type InlineNoticeTone = "info" | "warning" | "pending" | "error" | "success";

const TONE_ICON = {
  info: Info,
  warning: AlertTriangle,
  pending: Clock,
  error: AlertCircle,
  success: CheckCircle2,
} as const;

const TONE_CLASSES: Record<InlineNoticeTone, string> = {
  info: "border-info-border bg-info-bg text-info",
  warning: "border-warning-border bg-warning-bg text-warning",
  pending: "border-pending-border bg-pending-bg text-pending",
  error: "border-error-border bg-error-bg text-error",
  success: "border-success-border bg-success-bg text-success",
};

interface InlineNoticeProps {
  tone: InlineNoticeTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Soft banner inside a card — warnings, tips, waiting states and in-page errors. */
export function InlineNotice({ tone, title, children, action, className }: InlineNoticeProps) {
  const Icon = TONE_ICON[tone];
  return (
    <div
      className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm", TONE_CLASSES[tone], className)}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
