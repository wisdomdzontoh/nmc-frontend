"use client"
import DatasetInlineDropdown, { type ReportType } from "./DatasetInlineDropdown"
import OrgUnitInlineDropdown, { type OrgNode } from "./OrgUnitInlineDropdown"
import PeriodInlineDropdown, { type Period } from "./PeriodInlineDropdown"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Loader2, CheckCircle2, Clock } from "lucide-react"

type Props = {
  dataset: ReportType | null
  onDatasetChange: (rt: ReportType | null) => void
  datasets: ReportType[]

  org: OrgNode | null
  onOrgChange: (n: OrgNode | null) => void
  orgTree: OrgNode[]

  period: Period | null
  onPeriodChange: (p: Period) => void

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
  reportStatus = null,
  loadingReport = false,
  onClear,
}: Props) {
  const selectionComplete = !!dataset && !!org && !!period

  return (
    <div className="w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center flex-wrap gap-0 px-1">
        <OrgUnitInlineDropdown value={org} onChange={onOrgChange} tree={orgTree} />
        <DatasetInlineDropdown value={dataset} onChange={onDatasetChange} items={datasets} />
        <PeriodInlineDropdown value={period} onChange={onPeriodChange} />
        {selectionComplete && (
          <div className="px-3 py-2 flex items-center">
            {loadingReport ? (
              <Badge variant="outline" className="gap-1 text-gray-600 border-gray-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </Badge>
            ) : reportStatus === "submitted" ? (
              <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Submitted
              </Badge>
            ) : reportStatus === "draft" ? (
              <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="h-3 w-3" />
                Draft
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600 border-gray-200">
                New entry
              </Badge>
            )}
          </div>
        )}
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
