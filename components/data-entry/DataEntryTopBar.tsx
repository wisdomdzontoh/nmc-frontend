"use client"
import DatasetInlineDropdown, { type ReportType } from "./DatasetInlineDropdown"
import OrgUnitInlineDropdown, { type OrgNode } from "./OrgUnitInlineDropdown"
import PeriodInlineDropdown, { type Period } from "./PeriodInlineDropdown"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

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
    <div className="w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center flex-wrap gap-0 px-1">
        <OrgUnitInlineDropdown value={org} onChange={onOrgChange} tree={orgTree} />
        <DatasetInlineDropdown value={dataset} onChange={onDatasetChange} items={datasets} />
        <PeriodInlineDropdown value={period} onChange={onPeriodChange} />
        <div className="ml-auto px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
