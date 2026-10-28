import type { LucideIcon } from "lucide-react"
import { CheckCircle2, CircleDashed, Clock, FileEdit, Send, XCircle, Archive } from "lucide-react"

import type { PillTone } from "@/components/common/status-pill"

export type StatusInfo = { label: string; tone: PillTone; icon: LucideIcon }

/** Report / layout statuses → words + pill tone. Never render the raw value. */
const REPORT_STATUS: Record<string, StatusInfo> = {
  draft: { label: "Draft", tone: "neutral", icon: FileEdit },
  submitted: { label: "Submitted", tone: "success", icon: Send },
  pending: { label: "Waiting for review", tone: "pending", icon: Clock },
  in_review: { label: "Under review", tone: "info", icon: Clock },
  approved: { label: "Approved", tone: "success", icon: CheckCircle2 },
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
  rejected: { label: "Sent back", tone: "error", icon: XCircle },
  published: { label: "Published", tone: "success", icon: CheckCircle2 },
  archived: { label: "Archived", tone: "neutral", icon: Archive },
  active: { label: "Active", tone: "success", icon: CheckCircle2 },
  inactive: { label: "Inactive", tone: "neutral", icon: CircleDashed },
}

export function reportStatus(status: string | null | undefined): StatusInfo {
  const key = (status ?? "").toLowerCase().replace(/[\s-]+/g, "_")
  if (REPORT_STATUS[key]) return REPORT_STATUS[key]
  const words = key.replace(/_/g, " ").trim()
  return {
    label: words ? words.charAt(0).toUpperCase() + words.slice(1) : "Unknown",
    tone: "neutral",
    icon: CircleDashed,
  }
}
