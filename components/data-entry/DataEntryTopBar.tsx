"use client"
import DatasetInlineDropdown, { type ReportType } from "./DatasetInlineDropdown"
import OrgUnitInlineDropdown, { type OrgNode } from "./OrgUnitInlineDropdown"
import PeriodInlineDropdown, { type Period } from "./PeriodInlineDropdown"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

type Props = {
  dataset: ReportType | null
  onDatasetChange: (rt: ReportType | null) => void
  datasets: ReportType[]

  org: OrgNode | null
  onOrgChange: (n: OrgNode | null) => void
  orgTree: OrgNode[]

  period: Period | null
  onPeriodChange: (p: Period) => void

  /** Kept for compatibility — the status is shown in the report context card. */
  reportStatus?: "draft" | "submitted" | null
  loadingReport?: boolean

  onClear: () => void
}

export default function DataEntryTopBar({
  dataset,
  onDatasetChange,
  datasets,
  org,
  onOrgChange,
  orgTree,
  period,
  onPeriodChange,
  onClear,
}: Props) {
  const anyChosen = !!dataset || !!org || !!period

  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
        <OrgUnitInlineDropdown value={org} onChange={onOrgChange} tree={orgTree} />
        <DatasetInlineDropdown value={dataset} onChange={onDatasetChange} items={datasets} />
        <PeriodInlineDropdown value={period} onChange={onPeriodChange} />
        <Button variant="ghost" onClick={onClear} disabled={!anyChosen} className="justify-self-start md:justify-self-end">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Start over
        </Button>
      </div>
    </div>
  )
}
