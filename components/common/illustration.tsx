import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  Frown,
  ListX,
  MousePointerClick,
  ServerCrash,
  ShieldOff,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type IllustrationName =
  | "no-results"
  | "all-done"
  | "empty-list"
  | "choose"
  | "report"
  | "error"
  | "no-access"
  | "upload";

const ICONS: Record<IllustrationName, LucideIcon> = {
  "no-results": Frown,
  "all-done": CheckCircle2,
  "empty-list": ListX,
  choose: MousePointerClick,
  report: FileSpreadsheet,
  error: ServerCrash,
  "no-access": ShieldOff,
  upload: CloudUpload,
};

/** Plain greyscale icon-in-a-circle illustration used by EmptyState / ErrorState. */
export function Illustration({ name, tone = "default" }: { name: IllustrationName; tone?: "default" | "good-news" }) {
  const Icon = ICONS[name];
  return (
    <div
      className={cn(
        "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
        tone === "good-news" ? "bg-success-bg" : "bg-muted"
      )}
    >
      <Icon
        className={cn("h-7 w-7", tone === "good-news" ? "text-success" : "text-muted-foreground")}
        aria-hidden="true"
      />
    </div>
  );
}
