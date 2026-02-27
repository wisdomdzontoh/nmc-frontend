"use client"
import DatasetInlineDropdown, { type ReportType } from "./DatasetInlineDropdown"
import OrgUnitInlineDropdown, { type OrgNode } from "./OrgUnitInlineDropdown"
import PeriodInlineDropdown, { type Period } from "./PeriodInlineDropdown"
import { Button } from "@/components/ui/button"

type Props = {
  dataset: ReportType | null
  onDatasetChange: (rt: ReportType | null) => void
  datasets: ReportType[]

  org: OrgNode | null
  onOrgChange: (n: OrgNode | null) => void
  orgTree: OrgNode[]

  period: Period | null
  onPeriodChange: (p: Period) => void

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
  return (
    <div className="w-full border-b bg-white">
      <div className="flex items-center">
        <OrgUnitInlineDropdown value={org} onChange={onOrgChange} tree={orgTree} />
        <DatasetInlineDropdown value={dataset} onChange={onDatasetChange} items={datasets} />
        <PeriodInlineDropdown value={period} onChange={onPeriodChange} />
        <div className="ml-2">
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear selections
          </Button>
        </div>
      </div>
    </div>
  )
}
