"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FileText,
  Calendar,
  Building2,
  Download,
  Eye,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react"
import { SectionLoader } from "@/components/ui/PageLoader"
import { ApiClient } from "@/lib/api"
import { getLayoutByReportType } from "@/lib/reportLayouts"
import EnhancedLayoutEntryForm, { type LayoutSchema } from "@/components/data-entry/EnhancedLayoutEntryForm"
import { exportToExcel } from "@/lib/export-utils"
import * as XLSX from "xlsx"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Report {
  id: number
  report_type: number
  report_type_name: string
  org_unit: number
  org_unit_name: string
  reporting_period: string
  submitted_by: number | null
  submitted_by_name?: string | null
  submitted_at: string | null
  status: "draft" | "submitted"
}

interface ReportValue {
  id: number
  data_element: number
  data_element_name: string
  value: number | null
  remark?: string | null
}

interface OrgUnitNode {
  id: number
  name: string
  code?: string
  children?: OrgUnitNode[]
}

interface FlatOrgUnit {
  id: number
  name: string
  code: string
  level: number
  parentId: number | null
}

interface SummaryRow {
  orgUnitId: number
  orgUnitName: string
  level: number
  expected: number
  submitted: number
  completeness: number | null
}

type SortField = "report_type_name" | "org_unit_name" | "reporting_period" | "submitted_at"
type SortDir = "asc" | "desc"

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const QUARTERS = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"]
const HALF_YEARS = ["H1 (Jan–Jun)", "H2 (Jul–Dec)"]
function getPeriodStartEnd(
  periodType: "monthly" | "quarterly" | "half-yearly" | "annual",
  year: number,
  subPeriod: string
): { periodStart: string; periodEnd: string; label: string } {
  if (periodType === "annual") {
    return {
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-12-31`,
      label: String(year),
    }
  }
  if (periodType === "half-yearly") {
    if (subPeriod === "H1") {
      return { periodStart: `${year}-01-01`, periodEnd: `${year}-06-30`, label: `H1 ${year}` }
    }
    return { periodStart: `${year}-07-01`, periodEnd: `${year}-12-31`, label: `H2 ${year}` }
  }
  if (periodType === "quarterly") {
    const q = subPeriod.replace("Q", "")
    const startMonth = (parseInt(q, 10) - 1) * 3
    const endMonth = startMonth + 3
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, endMonth, 0)
    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      label: `${subPeriod} ${year}`,
    }
  }
  // monthly: subPeriod is "1".."12"
  const m = parseInt(subPeriod, 10)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 0)
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    label: `${MONTHS[m - 1]} ${year}`,
  }
}

function getCurrentYear() { return new Date().getFullYear() }

function getYearOptions(): number[] {
  const cur = getCurrentYear()
  return Array.from({ length: 7 }, (_, i) => cur - i)
}

function flattenTree(nodes: OrgUnitNode[], level = 0, parentId: number | null = null): FlatOrgUnit[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, code: n.code ?? "", level, parentId },
    ...flattenTree(n.children || [], level + 1, n.id),
  ])
}

function getSubtree(flat: FlatOrgUnit[], rootId: number): FlatOrgUnit[] {
  const result: FlatOrgUnit[] = []
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift()!
    const u = flat.find((x) => x.id === id)
    if (u) {
      result.push(u)
      flat.filter((x) => x.parentId === id).forEach((c) => queue.push(c.id))
    }
  }
  return result
}

function completenessColor(pct: number | null): string {
  if (pct === null) return "text-gray-400"
  if (pct >= 100) return "text-green-600"
  if (pct >= 75) return "text-blue-600"
  if (pct >= 50) return "text-amber-600"
  return "text-red-600"
}

function completenessBarColor(pct: number | null): string {
  if (pct === null) return "bg-gray-200"
  if (pct >= 100) return "[&>div]:bg-green-500"
  if (pct >= 75) return "[&>div]:bg-blue-500"
  if (pct >= 50) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-red-500"
}

interface StatusConfig {
  label: string
  icon: React.ElementType
  badgeClass: string
}

function getStatus(pct: number | null, expected: number): StatusConfig {
  if (expected === 0) return { label: "Not assigned", icon: Minus, badgeClass: "border-gray-200 text-gray-500 bg-gray-50" }
  if (pct === null || pct === 0) return { label: "Not submitted", icon: XCircle, badgeClass: "border-red-200 text-red-700 bg-red-50" }
  if (pct >= 100) return { label: "Complete", icon: CheckCircle2, badgeClass: "border-green-200 text-green-700 bg-green-50" }
  if (pct >= 75) return { label: "Good", icon: CheckCircle, badgeClass: "border-blue-200 text-blue-700 bg-blue-50" }
  if (pct >= 50) return { label: "Partial", icon: AlertTriangle, badgeClass: "border-amber-200 text-amber-700 bg-amber-50" }
  return { label: "Incomplete", icon: XCircle, badgeClass: "border-red-200 text-red-700 bg-red-50" }
}

function formatPeriodLabel(type: string, year: string, period: string): string {
  if (type === "yearly") return year
  if (type === "quarterly") return `${period} ${year}`
  return `${MONTHS[Number(period) - 1]} ${year}`
}

// ── Sortable column header ─────────────────────────────────────────────────────

function SortHeader({
  field, label, icon: Icon, current, dir, onSort,
}: {
  field: SortField; label: string; icon: React.ElementType
  current: SortField; dir: SortDir; onSort: (f: SortField) => void
}) {
  const active = current === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {active ? (
        dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
      )}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const isSuperuser = Boolean(djangoUser?.is_superuser)
  const isStaff = Boolean(djangoUser?.is_staff)

  // ── Reports list state ───────────────────────────────────────────────────
  const [reports, setReports] = useState<Report[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchText, setSearchText] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [periodFilter, setPeriodFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "submitted">("all")
  const [sortField, setSortField] = useState<SortField>("submitted_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [loadingReports, setLoadingReports] = useState(true)
  const [reportsError, setReportsError] = useState<string | null>(null)

  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedValues, setSelectedValues] = useState<ReportValue[]>([])
  const [exporting, setExporting] = useState(false)

  // ── Reporting rate state ─────────────────────────────────────────────────
  const [flatUnits, setFlatUnits] = useState<FlatOrgUnit[]>([])
  const [rateLoading, setRateLoading] = useState(false)
  const [ratePeriodLabel, setRatePeriodLabel] = useState<string | null>(null)
  const [rateSlotCount, setRateSlotCount] = useState(1)
  const [rateError, setRateError] = useState<string | null>(null)
  const [summaryRows, setSummaryRows] = useState<SummaryRow[] | null>(null)
  const [rateInitialised, setRateInitialised] = useState(false)

  // Filters
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "yearly">("monthly")
  const [rateYear, setRateYear] = useState(String(getCurrentYear()))
  const [ratePeriod, setRatePeriod] = useState(String(new Date().getMonth() + 1))
  const [rateOrgFilter, setRateOrgFilter] = useState("all")

  // Rate summary sort
  const [rateSort, setRateSort] = useState<"name" | "completeness" | "submitted">("completeness")
  const [rateSortDir, setRateSortDir] = useState<SortDir>("desc")

  // ── Report Generation tab ─────────────────────────────────────────────────
  type GenPeriodType = "monthly" | "quarterly" | "half-yearly" | "annual"
  const [genPeriodType, setGenPeriodType] = useState<GenPeriodType>("quarterly")
  const [genYear, setGenYear] = useState(String(getCurrentYear()))
  const [genSubPeriod, setGenSubPeriod] = useState("Q1")
  const [genSelectedTypeIds, setGenSelectedTypeIds] = useState<number[]>([])
  const [genOrgId, setGenOrgId] = useState<string>("")
  const [assignedReportTypes, setAssignedReportTypes] = useState<Array<{ id: number; name: string }>>([])
  const [genReportSearch, setGenReportSearch] = useState("")
  const [genTypesOpen, setGenTypesOpen] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genResults, setGenResults] = useState<Array<{
    reportTypeId: number
    reportTypeName: string
    orgUnitName: string
    periodLabel: string
    orgUnitId: number
    layout: LayoutSchema | null
    values: Record<string, number | string | null>
    error?: string
  }>>([])
  const [genExportingId, setGenExportingId] = useState<number | null>(null)

  // ── Debounce search for server-side query ─────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchText])

  // ── Reports list ordering (server-side) ───────────────────────────────────
  const ordering = useMemo(() => {
    const prefix = sortDir === "desc" ? "-" : ""
    if (sortField === "report_type_name") return `${prefix}report_type__name`
    if (sortField === "org_unit_name") return `${prefix}org_unit__name`
    if (sortField === "submitted_at" || sortField === "reporting_period") return `${prefix}${sortField}`
    return "-reporting_period"
  }, [sortField, sortDir])

  // ── Load reports list (server-side search, filter, sort, pagination) ────
  useEffect(() => {
    const load = async () => {
      setLoadingReports(true)
      setReportsError(null)
      try {
        const params: Record<string, string | number> = { page, page_size: pageSize, ordering }
        if (debouncedSearch) params.search = debouncedSearch
        if (periodFilter !== "all") params.period = periodFilter
        if (statusFilter !== "all") params.status = statusFilter
        const res = await ApiClient.getReports(params)
        const data = res.data
        if (Array.isArray(data)) {
          setReports(data); setTotalCount(data.length)
        } else {
          setReports(data.results || [])
          setTotalCount(typeof data.count === "number" ? data.count : (data.results || []).length)
        }
      } catch {
        setReportsError("Failed to load reports. Please try again.")
      } finally {
        setLoadingReports(false)
      }
    }
    load()
  }, [page, pageSize, ordering, debouncedSearch, periodFilter, statusFilter])

  const accessibleFlatUnits = useMemo(() => {
    if ((isStaff || isSuperuser) || !djangoUser?.org_unit) return flatUnits
    return getSubtree(flatUnits, djangoUser.org_unit)
  }, [flatUnits, isStaff, isSuperuser, djangoUser?.org_unit])

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
    setPage(1)
  }

  // ── Load assigned report types for Report Generation ───────────────────────
  useEffect(() => {
    // Non-staff: use their own org unit and entry-available report types
    if (!isStaff && !isSuperuser) {
      if (!djangoUser?.org_unit) {
        setAssignedReportTypes([])
        return
      }
      ApiClient.getAvailableReportTypesForEntry()
        .then((res) => {
          const list = res.data || []
          const mapped = list.map((rt: { id: number; name: string }) => ({ id: rt.id, name: rt.name }))
          setAssignedReportTypes(mapped)
          setGenSelectedTypeIds((prev) =>
            prev.filter((id) => mapped.some((rt: { id: number }) => rt.id === id)),
          )
        })
        .catch(() => setAssignedReportTypes([]))
      return
    }

    // Staff/superusers: load report types for the selected org unit
    if (!genOrgId) {
      setAssignedReportTypes([])
      setGenSelectedTypeIds([])
      return
    }
    ApiClient.getOrgUnitAssignments(Number(genOrgId))
      .then((res) => {
        const list = res.data || []
        const mapped = list.map((a: { report_type: number; report_type_name: string }) => ({
          id: a.report_type,
          name: a.report_type_name,
        }))
        setAssignedReportTypes(mapped)
        setGenSelectedTypeIds((prev) =>
          prev.filter((id) => mapped.some((rt: { id: number }) => rt.id === id)),
        )
      })
      .catch(() => {
        setAssignedReportTypes([])
        setGenSelectedTypeIds([])
      })
  }, [isStaff, isSuperuser, djangoUser?.org_unit, genOrgId])

  // ── Report Generation: build sub-period options ───────────────────────────
  const genSubPeriodOptions = useMemo(() => {
    if (genPeriodType === "monthly") return MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))
    if (genPeriodType === "quarterly") return QUARTERS.map((_, i) => ({ value: `Q${i + 1}`, label: QUARTERS[i] }))
    if (genPeriodType === "half-yearly") return HALF_YEARS.map((_, i) => ({ value: `H${i + 1}`, label: HALF_YEARS[i] }))
    return []
  }, [genPeriodType])

  const filteredGenReportTypes = useMemo(
    () =>
      assignedReportTypes.filter((rt) =>
        rt.name.toLowerCase().includes(genReportSearch.trim().toLowerCase()),
      ),
    [assignedReportTypes, genReportSearch],
  )

  const toggleGenReportType = (id: number) => {
    setGenSelectedTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectAllGenReportTypes = () => {
    setGenSelectedTypeIds(filteredGenReportTypes.map((rt) => rt.id))
  }

  const clearGenReportTypes = () => setGenSelectedTypeIds([])

  // ── Report Generation: generate aggregated reports (multi-select) ───────
  const handleGenerateReport = useCallback(async () => {
    const orgUnitId = (isStaff || isSuperuser)
      ? (genOrgId ? Number(genOrgId) : null)
      : (genOrgId ? Number(genOrgId) : djangoUser?.org_unit)
    if (!orgUnitId) {
      setGenError("Select an organisation unit.")
      return
    }
    if (genSelectedTypeIds.length === 0) {
      setGenError("Select at least one report type.")
      return
    }
    const sub = genPeriodType === "annual" ? "" : genSubPeriod
    if (!sub && genPeriodType !== "annual") return
    const { periodStart, periodEnd, label } = getPeriodStartEnd(
      genPeriodType,
      parseInt(genYear, 10),
      sub || "H1",
    )
    setGenLoading(true)
    setGenError(null)
    setGenResults([])
    try {
      const results = await Promise.all(
        genSelectedTypeIds.map(async (typeId) => {
          const typeName =
            assignedReportTypes.find((rt) => rt.id === typeId)?.name ?? `Report ${typeId}`
          try {
            const [aggRes, layoutRes] = await Promise.all([
              ApiClient.getAggregatedReport({
                report_type: typeId,
                org_unit: orgUnitId,
                period_start: periodStart,
                period_end: periodEnd,
              }),
              getLayoutByReportType(typeId, "published").catch(() => null),
            ])
            const agg = aggRes.data as {
              values: Record<string, number>
              remarks: Record<string, string>
              report_type_name: string
              org_unit_name: string
            }
            const valuesByCode: Record<string, number | string | null> = {}
            Object.entries(agg.values || {}).forEach(([code, val]) => {
              valuesByCode[code] = val
              const remark = (agg.remarks || {})[code]
              if (remark != null && remark !== "") valuesByCode[`remark.${code}`] = remark
            })
            return {
              reportTypeId: typeId,
              reportTypeName: agg.report_type_name || typeName,
              orgUnitName: agg.org_unit_name || "",
              periodLabel: label,
              orgUnitId,
              layout: layoutRes?.schema ? (layoutRes.schema as LayoutSchema) : null,
              values: valuesByCode,
            }
          } catch {
            return {
              reportTypeId: typeId,
              reportTypeName: typeName,
              orgUnitName: "",
              periodLabel: label,
              orgUnitId,
              layout: null,
              values: {},
              error: "Failed to generate. You may not have access or there is no data for this period.",
            }
          }
        }),
      )
      setGenResults(results)
      const failures = results.filter((r) => r.error).length
      if (failures === results.length) {
        setGenError("No reports could be generated for the selected types and period.")
      } else if (failures > 0) {
        setGenError(`${failures} of ${results.length} report(s) could not be generated.`)
      }
    } finally {
      setGenLoading(false)
    }
  }, [
    djangoUser?.org_unit,
    genSelectedTypeIds,
    genPeriodType,
    genYear,
    genSubPeriod,
    assignedReportTypes,
    isStaff,
    isSuperuser,
    genOrgId,
  ])

  const handleExportGeneratedReport = useCallback(
    async (result: (typeof genResults)[number]) => {
      if (!result.layout) return
      setGenExportingId(result.reportTypeId)
      try {
        await exportToExcel({
          reportType: result.reportTypeName,
          orgUnit: result.orgUnitName,
          period: result.periodLabel,
          values: result.values,
          layout: result.layout,
          computedValues: {},
        })
      } finally {
        setGenExportingId(null)
      }
    },
    [],
  )

  // ── Last 12-month period options ──────────────────────────────────────────
  const periodOptions = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-US", { year: "numeric", month: "long" }) }
    })
  }, [])

  // ── View report detail ────────────────────────────────────────────────────
  const handleView = async (report: Report) => {
    setSelectedReport(report); setSelectedValues([]); setViewOpen(true)
    try {
      setViewLoading(true)
      const res = await ApiClient.getReport(report.id)
      setSelectedValues((res.data as Report & { values?: ReportValue[] }).values || [])
    } catch { /* silent */ } finally { setViewLoading(false) }
  }

  // ── Export individual report ──────────────────────────────────────────────
  const downloadXlsx = (report: Report, values: ReportValue[], submittedAt?: string | null) => {
    const rows: (string | number)[][] = [
      ["Report Type", report.report_type_name], ["Organisation Unit", report.org_unit_name],
      ["Reporting Period", report.reporting_period], ["Submitted At", submittedAt ? new Date(submittedAt).toLocaleString() : ""],
      [], ["Data element", "Value", "Remark"],
      ...values.map((v) => [v.data_element_name, v.value ?? "", (v.remark || "").trim()]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
    a.download = `${safe(report.report_type_name)}_${safe(report.org_unit_name)}_${report.reporting_period.slice(0, 10)}.xlsx`
    a.click()
  }

  const handleExport = async (report: Report) => {
    setExporting(true)
    try {
      const res = await ApiClient.exportReport(report.id, "xlsx")
      const a = document.createElement("a")
      a.href = URL.createObjectURL(new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
      a.download = `report_${report.id}.xlsx`; a.click()
    } catch {
      try {
        const full = (await ApiClient.getReport(report.id)).data as Report & { values?: ReportValue[]; submitted_at?: string }
        downloadXlsx(report, full.values || [], full.submitted_at)
      } catch { /* silent */ }
    } finally { setExporting(false) }
  }

  // ── Initialise org/unit + assignment data (once) ──────────────────────────
  const initRateData = useCallback(async () => {
    if (rateInitialised) return
    try {
      setRateLoading(true)
      setRateError(null)
      const treeRes = await ApiClient.getOrgUnits()
      const flat = flattenTree(treeRes.data || [])
      setFlatUnits(flat)
      if (!isStaff && !isSuperuser && djangoUser?.org_unit) {
        setRateOrgFilter(String(djangoUser.org_unit))
      }
      if (!genOrgId) {
        if ((isStaff || isSuperuser) && flat.length) {
          const root = flat.find((u) => u.level === 0) ?? flat[0]
          if (root) setGenOrgId(String(root.id))
        } else if (djangoUser?.org_unit) {
          setGenOrgId(String(djangoUser.org_unit))
        }
      }
      setRateInitialised(true)
    } catch {
      setRateError("Failed to load organisation data. Please try again.")
    } finally {
      setRateLoading(false)
    }
  }, [rateInitialised, isStaff, isSuperuser, djangoUser?.org_unit, genOrgId])

  // Load org tree for rate/generation tabs
  useEffect(() => {
    if (!rateInitialised && (djangoUser?.org_unit || isStaff || isSuperuser)) {
      void initRateData()
    }
  }, [djangoUser?.org_unit, isStaff, isSuperuser, rateInitialised, initRateData])

  // ── Generate reporting rate summary (server-side aggregation) ───────────
  const handleGenerate = async () => {
    try {
      setRateLoading(true)
      setRateError(null)
      setSummaryRows(null)
      setRatePeriodLabel(null)

      if (!rateInitialised) await initRateData()

      const res = await ApiClient.getReportingRateSummary({
        period_type: periodType,
        year: rateYear,
        period: periodType === "yearly" ? undefined : ratePeriod,
        org_unit: rateOrgFilter === "all" ? "all" : rateOrgFilter,
      })
      const data = res.data as {
        period_label: string
        slot_count: number
        rows: Array<{
          org_unit_id: number
          org_unit_name: string
          level: number
          expected: number
          submitted: number
          completeness: number | null
        }>
      }
      setRatePeriodLabel(data.period_label)
      setRateSlotCount(data.slot_count ?? 1)
      setSummaryRows(
        (data.rows || []).map((r) => ({
          orgUnitId: r.org_unit_id,
          orgUnitName: r.org_unit_name,
          level: r.level,
          expected: r.expected,
          submitted: r.submitted,
          completeness: r.completeness,
        })),
      )
    } catch {
      setRateError("Failed to generate summary. Please try again.")
    } finally {
      setRateLoading(false)
    }
  }

  // ── Sorted summary rows ───────────────────────────────────────────────────
  const sortedSummaryRows = useMemo(() => {
    if (!summaryRows) return []
    return [...summaryRows].sort((a, b) => {
      let av: number | string, bv: number | string
      if (rateSort === "name") { av = a.orgUnitName.toLowerCase(); bv = b.orgUnitName.toLowerCase() }
      else if (rateSort === "submitted") { av = a.submitted; bv = b.submitted }
      else { av = a.completeness ?? -1; bv = b.completeness ?? -1 }
      if (av < bv) return rateSortDir === "asc" ? -1 : 1
      if (av > bv) return rateSortDir === "asc" ? 1 : -1
      return 0
    })
  }, [summaryRows, rateSort, rateSortDir])

  // ── Summary totals ────────────────────────────────────────────────────────
  const summaryTotals = useMemo(() => {
    if (!summaryRows) return null
    const totalExpected = summaryRows.reduce((s, r) => s + r.expected, 0)
    const totalSubmitted = summaryRows.reduce((s, r) => s + r.submitted, 0)
    const overallPct = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : null
    const complete = summaryRows.filter((r) => r.completeness !== null && r.completeness >= 100).length
    return { totalExpected, totalSubmitted, overallPct, complete, total: summaryRows.length }
  }, [summaryRows])

  // ── Export rate summary to XLSX ───────────────────────────────────────────
  const exportRateSummary = () => {
    if (!sortedSummaryRows.length) return
    const periodLabel = formatPeriodLabel(periodType, rateYear, ratePeriod)
    const header = [["Reporting Rate Summary", `Period: ${periodLabel}`], [],
      ["Org Unit", "Level", "Expected Reports", "Submitted Reports", "Completeness (%)", "Status"]]
    const rows = sortedSummaryRows.map((r) => {
      const s = getStatus(r.completeness, r.expected)
      return [r.orgUnitName, r.level + 1, r.expected, r.submitted, r.completeness ?? "N/A", s.label]
    })
    const ws = XLSX.utils.aoa_to_sheet([...header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reporting Rate")
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
    a.download = `reporting_rate_${periodType}_${periodLabel.replace(/\s/g, "_")}.xlsx`
    a.click()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse report instances for your organisation and units below you, and monitor reporting completeness
          </p>
        </div>
        {djangoUser?.org_unit_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm flex-shrink-0">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            {djangoUser.org_unit_name}
          </div>
        )}
      </div>

      <Tabs defaultValue="submissions" className="space-y-5">
        <TabsList className="bg-white border border-gray-200 shadow-sm p-1 h-10">
          <TabsTrigger
            value="submissions"
            className="gap-2 text-xs data-[state=active]:bg-[#C9433B] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            All Reports
          </TabsTrigger>
          <TabsTrigger
            value="rate"
            className="gap-2 text-xs data-[state=active]:bg-[#C9433B] data-[state=active]:text-white data-[state=active]:shadow-sm"
            onClick={initRateData}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Reporting Rate Summary
          </TabsTrigger>
          <TabsTrigger
            value="generation"
            className="gap-2 text-xs data-[state=active]:bg-[#C9433B] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Report Generation
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Submitted Reports ──────────────────────────────────── */}
        <TabsContent value="submissions" className="space-y-4 mt-0">
          {/* Filter bar */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search by report type or organisation…"
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setPage(1) }}
                  className="pl-8 h-8 text-sm bg-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1) }}>
                <SelectTrigger className="w-36 h-8 text-sm bg-white border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v); setPage(1) }}>
                <SelectTrigger className="w-48 h-8 text-sm bg-white border-gray-200">
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All periods</SelectItem>
                  {periodOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(Number(v)) }}>
                <SelectTrigger className="w-24 h-8 text-sm bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {reportsError && (
            <Alert variant="destructive"><AlertDescription>{reportsError}</AlertDescription></Alert>
          )}

          {/* Table */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loadingReports ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" style={{ color: "#C9433B" }} />
                  <span className="text-sm text-gray-500">Loading reports…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                        <TableHead className="pl-5">
                          <SortHeader field="report_type_name" label="Report type" icon={FileText} current={sortField} dir={sortDir} onSort={toggleSort} />
                        </TableHead>
                        <TableHead>
                          <SortHeader field="org_unit_name" label="Organisation" icon={Building2} current={sortField} dir={sortDir} onSort={toggleSort} />
                        </TableHead>
                        <TableHead>
                          <SortHeader field="reporting_period" label="Period" icon={Calendar} current={sortField} dir={sortDir} onSort={toggleSort} />
                        </TableHead>
                        <TableHead>
                          <SortHeader field="submitted_at" label="Submitted" icon={Clock} current={sortField} dir={sortDir} onSort={toggleSort} />
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-right pr-5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-sm text-gray-400">
                            No reports found. Try adjusting your search or filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.map((r) => (
                          <TableRow key={r.id} className="hover:bg-gray-50/70 border-b border-gray-100">
                            <TableCell className="pl-5 py-3">
                              <span className="font-medium text-gray-900 text-sm">{r.report_type_name}</span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-700 py-3">{r.org_unit_name}</TableCell>
                            <TableCell className="text-sm text-gray-700 py-3">
                              {new Date(r.reporting_period).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700 py-3">
                              {r.submitted_at ? (
                                <>
                                  <div>{new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</div>
                                  {r.submitted_by_name && (
                                    <div className="text-[11px] text-gray-400 mt-0.5">by {r.submitted_by_name}</div>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              {r.status === "draft" ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px]">
                                  <Clock className="h-3 w-3" />
                                  Draft
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
                                  <CheckCircle className="h-3 w-3" />
                                  Submitted
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-5 py-3 space-x-1.5">
                              <Button variant="outline" size="sm" onClick={() => handleView(r)} className="h-7 text-xs border-gray-200">
                                <Eye className="h-3.5 w-3.5 mr-1" />View
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleExport(r)} disabled={exporting} className="h-7 text-xs border-gray-200">
                                <Download className="h-3.5 w-3.5 mr-1" />Export
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  {totalCount === 0 ? "No reports" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
                </p>
                <div className="flex items-center gap-1">
                  {[
                    { label: "«", action: () => setPage(1), disabled: page === 1 },
                    { label: "‹", action: () => setPage((p) => Math.max(1, p - 1)), disabled: page === 1 },
                    { label: "›", action: () => setPage((p) => Math.min(pageCount, p + 1)), disabled: page >= pageCount },
                    { label: "»", action: () => setPage(pageCount), disabled: page >= pageCount },
                  ].map(({ label, action, disabled }) => (
                    <Button key={label} variant="outline" size="sm" onClick={action} disabled={disabled} className="h-7 w-7 p-0 text-xs border-gray-200">
                      {label}
                    </Button>
                  ))}
                  <span className="text-xs text-gray-500 ml-2">Page {page} of {pageCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Reporting Rate Summary ─────────────────────────────── */}
        <TabsContent value="rate" className="space-y-5 mt-0">
          {/* Controls */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-gray-900">Generate Reporting Rate Summary</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Expected = assigned report types × months in the period (e.g. quarterly = ×3).
                Submitted counts only assigned types. Completeness is capped at 100%.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex flex-wrap items-end gap-3">
                {/* Period type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Period type</label>
                  <Select value={periodType} onValueChange={(v) => { setPeriodType(v as typeof periodType); setRatePeriod(v === "quarterly" ? "Q1" : v === "monthly" ? String(new Date().getMonth() + 1) : "") }}>
                    <SelectTrigger className="w-36 h-8 text-sm border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Year</label>
                  <Select value={rateYear} onValueChange={setRateYear}>
                    <SelectTrigger className="w-28 h-8 text-sm border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getYearOptions().map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period (month/quarter — hidden for yearly) */}
                {periodType !== "yearly" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {periodType === "monthly" ? "Month" : "Quarter"}
                    </label>
                    <Select value={ratePeriod} onValueChange={setRatePeriod}>
                      <SelectTrigger className="w-44 h-8 text-sm border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {periodType === "monthly"
                          ? MONTHS.map((m, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                            ))
                          : QUARTERS.map((q, i) => (
                              <SelectItem key={i} value={`Q${i + 1}`}>{q}</SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Org unit filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Org unit (root)</label>
                  <Select value={rateOrgFilter} onValueChange={setRateOrgFilter}>
                    <SelectTrigger className="w-52 h-8 text-sm border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isStaff || isSuperuser) && (
                        <SelectItem value="all">All org units</SelectItem>
                      )}
                      {accessibleFlatUnits.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {`${"— ".repeat(u.level)}${u.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={rateLoading}
                  className="h-8 gap-2 text-white text-sm"
                  style={{ background: "linear-gradient(135deg, #C9433B, #D96455)" }}
                >
                  {rateLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {rateLoading ? "Generating…" : "Generate Report"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {rateError && (
            <Alert variant="destructive"><AlertDescription>{rateError}</AlertDescription></Alert>
          )}

          {/* Summary result */}
          {summaryRows && summaryTotals && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Org Units",
                    value: summaryTotals.total,
                    sub: "in selection",
                    color: "#C9433B",
                    bg: "#FEF0EC",
                  },
                  {
                    label: "Expected Reports",
                    value: summaryTotals.totalExpected,
                    sub: formatPeriodLabel(periodType, rateYear, ratePeriod),
                    color: "#8B3020",
                    bg: "#FEF0EC",
                  },
                  {
                    label: "Submitted Reports",
                    value: summaryTotals.totalSubmitted,
                    sub: `${summaryTotals.complete} units at 100%`,
                    color: "#16a34a",
                    bg: "#f0fdf4",
                  },
                  {
                    label: "Overall Completeness",
                    value: summaryTotals.overallPct !== null ? `${summaryTotals.overallPct}%` : "—",
                    sub:
                      summaryTotals.overallPct !== null
                        ? summaryTotals.overallPct >= 100
                          ? "Excellent"
                          : summaryTotals.overallPct >= 75
                          ? "Good"
                          : summaryTotals.overallPct >= 50
                          ? "Needs improvement"
                          : "Critical"
                        : "No data",
                    color:
                      summaryTotals.overallPct === null ? "#9ca3af" :
                      summaryTotals.overallPct >= 100 ? "#16a34a" :
                      summaryTotals.overallPct >= 75 ? "#2563eb" :
                      summaryTotals.overallPct >= 50 ? "#d97706" : "#dc2626",
                    bg:
                      summaryTotals.overallPct === null ? "#f9fafb" :
                      summaryTotals.overallPct >= 100 ? "#f0fdf4" :
                      summaryTotals.overallPct >= 75 ? "#eff6ff" :
                      summaryTotals.overallPct >= 50 ? "#fffbeb" : "#fef2f2",
                  },
                ].map((c) => (
                  <Card key={c.label} className="border-gray-200 shadow-sm bg-white">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{c.label}</p>
                          <p className="text-3xl font-bold leading-none" style={{ color: c.color }}>{c.value}</p>
                          <p className="text-[11px] text-gray-400 mt-1.5">{c.sub}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
                          <BarChart3 className="h-5 w-5" style={{ color: c.color }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary table */}
              <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="pt-4 pb-3 px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-900">
                        Org Unit Completeness — {ratePeriodLabel ?? formatPeriodLabel(periodType, rateYear, ratePeriod)}
                      </CardTitle>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {sortedSummaryRows.length} org unit{sortedSummaryRows.length !== 1 ? "s" : ""} ·
                        {rateSlotCount > 1 ? ` ${rateSlotCount} months per assignment ·` : ""}
                        Click column headers to sort
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportRateSummary}
                      className="h-8 text-xs border-gray-200 gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export XLSX
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                          <TableHead className="pl-5 w-[35%]">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                              onClick={() => {
                                if (rateSort === "name") setRateSortDir((d) => (d === "asc" ? "desc" : "asc"))
                                else { setRateSort("name"); setRateSortDir("asc") }
                              }}
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              Org Unit
                              {rateSort === "name" ? (rateSortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />}
                            </button>
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-24">
                            Expected
                          </TableHead>
                          <TableHead className="text-center w-24">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 mx-auto"
                              onClick={() => {
                                if (rateSort === "submitted") setRateSortDir((d) => (d === "asc" ? "desc" : "asc"))
                                else { setRateSort("submitted"); setRateSortDir("desc") }
                              }}
                            >
                              Submitted
                              {rateSort === "submitted" ? (rateSortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />}
                            </button>
                          </TableHead>
                          <TableHead className="w-[28%]">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                              onClick={() => {
                                if (rateSort === "completeness") setRateSortDir((d) => (d === "asc" ? "desc" : "asc"))
                                else { setRateSort("completeness"); setRateSortDir("desc") }
                              }}
                            >
                              Completeness
                              {rateSort === "completeness" ? (rateSortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />}
                            </button>
                          </TableHead>
                          <TableHead className="pr-5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSummaryRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-sm text-gray-400">
                              No data available for this selection.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedSummaryRows.map((row) => {
                            const status = getStatus(row.completeness, row.expected)
                            const StatusIcon = status.icon
                            const pct = row.completeness ?? 0
                            return (
                              <TableRow key={row.orgUnitId} className="hover:bg-gray-50/60 border-b border-gray-100">
                                <TableCell className="pl-5 py-3">
                                  <div className="flex items-center gap-2">
                                    {/* Level indent indicator */}
                                    {row.level > 0 && (
                                      <div
                                        className="flex-shrink-0 rounded-sm"
                                        style={{
                                          width: `${row.level * 12}px`,
                                          height: "2px",
                                          background: "#e5e7eb",
                                          marginLeft: "4px",
                                        }}
                                      />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{row.orgUnitName}</p>
                                      <p className="text-[10px] text-gray-400">Level {row.level + 1}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-3">
                                  <span className="text-sm font-semibold text-gray-700">{row.expected}</span>
                                </TableCell>
                                <TableCell className="text-center py-3">
                                  <span className={`text-sm font-semibold ${row.submitted > 0 ? "text-green-700" : "text-gray-400"}`}>
                                    {row.submitted}
                                  </span>
                                </TableCell>
                                <TableCell className="py-3 pr-4">
                                  {row.expected === 0 ? (
                                    <span className="text-xs text-gray-400">No assignments</span>
                                  ) : (
                                    <div className="flex items-center gap-2.5">
                                      <Progress
                                        value={Math.min(pct, 100)}
                                        className={`h-2 flex-1 ${completenessBarColor(row.completeness)}`}
                                      />
                                      <span className={`text-sm font-bold tabular-nums w-12 text-right ${completenessColor(row.completeness)}`}>
                                        {row.completeness !== null ? `${row.completeness}%` : "—"}
                                      </span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="pr-5 py-3">
                                  <Badge variant="outline" className={`gap-1 text-[11px] font-medium ${status.badgeClass}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Table footer totals */}
                  {sortedSummaryRows.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Totals
                      </span>
                      <div className="flex items-center gap-8 text-sm">
                        <span className="text-gray-500">
                          Expected: <strong className="text-gray-900">{summaryTotals.totalExpected}</strong>
                        </span>
                        <span className="text-gray-500">
                          Submitted: <strong className="text-green-700">{summaryTotals.totalSubmitted}</strong>
                        </span>
                        <span className="text-gray-500">
                          Overall:{" "}
                          <strong className={completenessColor(summaryTotals.overallPct)}>
                            {summaryTotals.overallPct !== null ? `${summaryTotals.overallPct}%` : "—"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty state before generating */}
          {!summaryRows && !rateLoading && (
            <Card className="border-dashed border-2 border-gray-200 shadow-none bg-white">
              <CardContent className="text-center py-16">
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
                  <BarChart3 className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No summary generated yet</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Select a period type, year, and optionally an org unit above, then click{" "}
                  <strong>Generate Report</strong> to see the completeness summary.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 3: Report Generation ──────────────────────────────────────── */}
        <TabsContent value="generation" className="space-y-5 mt-0">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-gray-900">Generate Aggregated Report</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Select one or more report types and generate aggregated reports in one run (e.g. quarterly = sum of 3 months).
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {!isStaff && !isSuperuser && !djangoUser?.org_unit ? (
                <Alert variant="destructive">
                  <AlertDescription>Your account has no organisation unit assigned. You cannot generate reports.</AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Period type</label>
                    <Select
                      value={genPeriodType}
                      onValueChange={(v) => {
                        setGenPeriodType(v as GenPeriodType)
                        if (v === "monthly") setGenSubPeriod(String(new Date().getMonth() + 1))
                        else if (v === "quarterly") setGenSubPeriod("Q1")
                        else if (v === "half-yearly") setGenSubPeriod("H1")
                      }}
                    >
                      <SelectTrigger className="w-36 h-8 text-sm border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="half-yearly">Half-yearly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {((isStaff || isSuperuser) || accessibleFlatUnits.length > 1) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Organisation unit</label>
                      <Select value={genOrgId} onValueChange={setGenOrgId}>
                        <SelectTrigger className="w-56 h-8 text-sm border-gray-200">
                          <SelectValue placeholder="Select org unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {((isStaff || isSuperuser) ? flatUnits : accessibleFlatUnits).map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {`${"— ".repeat(u.level)}${u.name}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Year</label>
                    <Select value={genYear} onValueChange={setGenYear}>
                      <SelectTrigger className="w-28 h-8 text-sm border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getYearOptions().map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {genPeriodType !== "annual" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        {genPeriodType === "monthly" ? "Month" : genPeriodType === "quarterly" ? "Quarter" : "Half"}
                      </label>
                      <Select
                        value={genSubPeriod}
                        onValueChange={setGenSubPeriod}
                      >
                        <SelectTrigger className="w-44 h-8 text-sm border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {genSubPeriodOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Report types</label>
                    <Popover open={genTypesOpen} onOpenChange={setGenTypesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-64 h-8 text-sm border-gray-200 justify-between font-normal"
                        >
                          <span className="truncate text-left">
                            {genSelectedTypeIds.length === 0
                              ? "Select report types…"
                              : `${genSelectedTypeIds.length} selected`}
                          </span>
                          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <div className="p-2 border-b border-gray-100 space-y-2">
                          <Input
                            placeholder="Search report types…"
                            value={genReportSearch}
                            onChange={(e) => setGenReportSearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={selectAllGenReportTypes}
                            >
                              Select all
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={clearGenReportTypes}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                          {filteredGenReportTypes.length === 0 ? (
                            <p className="text-xs text-gray-400 px-2 py-3 text-center">No report types</p>
                          ) : (
                            filteredGenReportTypes.map((rt) => (
                              <label
                                key={rt.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={genSelectedTypeIds.includes(rt.id)}
                                  onCheckedChange={() => toggleGenReportType(rt.id)}
                                />
                                <span className="truncate">{rt.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={genLoading || assignedReportTypes.length === 0 || genSelectedTypeIds.length === 0}
                    className="h-8 gap-2 text-white text-sm"
                    style={{ background: "linear-gradient(135deg, #C9433B, #D96455)" }}
                  >
                    {genLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {genLoading ? "Generating…" : "Generate"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {genError && (
            <Alert variant="destructive"><AlertDescription>{genError}</AlertDescription></Alert>
          )}

          {genResults.length > 0 && (
            <div className="space-y-4">
              {genResults.map((result) => (
                <Card key={result.reportTypeId} className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold text-gray-900 truncate">
                        {result.reportTypeName} — {result.periodLabel}
                      </CardTitle>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {result.orgUnitName || "—"}
                      </p>
                    </div>
                    {result.layout && !result.error && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportGeneratedReport(result)}
                        disabled={genExportingId === result.reportTypeId}
                        className="h-8 text-xs border-gray-200 gap-1.5 shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export Excel
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    {result.error ? (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-xs">{result.error}</AlertDescription>
                      </Alert>
                    ) : result.layout ? (
                      <EnhancedLayoutEntryForm
                        schema={result.layout}
                        values={result.values}
                        onChange={() => {}}
                        readOnly
                        dataSaved
                        savedCodes={new Set(Object.keys(result.values).filter((k) => !k.startsWith("remark.")))}
                        unsavedCodes={new Set()}
                        autoSaving={false}
                      />
                    ) : Object.keys(result.values).filter((k) => !k.startsWith("remark.")).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No data for this period.</p>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 border-b border-gray-200">
                              <TableHead className="text-xs font-semibold text-gray-600">Data element / Code</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-600 text-right">Value</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-600">Remark</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(result.values)
                              .filter(([k]) => !k.startsWith("remark."))
                              .map(([code, val]) => {
                                const remark = result.values[`remark.${code}`] ?? ""
                                return (
                                  <TableRow key={code} className="border-b border-gray-100">
                                    <TableCell className="text-sm text-gray-800 py-2">{code}</TableCell>
                                    <TableCell className="text-sm font-semibold text-gray-900 text-right py-2">
                                      {val ?? "—"}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500 py-2">
                                      {typeof remark === "string" ? remark : ""}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Report detail dialog ─────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-7xl w-[96vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">Report Details</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedReport
                ? `${selectedReport.report_type_name} · ${selectedReport.org_unit_name}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin mr-2" style={{ color: "#C9433B" }} />
              <span className="text-sm text-gray-500">Loading values…</span>
            </div>
          ) : selectedReport ? (
            <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                {[
                  { label: "Report type", value: selectedReport.report_type_name },
                  { label: "Organisation unit", value: selectedReport.org_unit_name },
                  { label: "Period", value: new Date(selectedReport.reporting_period).toLocaleDateString("en-US", { year: "numeric", month: "long" }) },
                  {
                    label: "Status",
                    value: selectedReport.status === "draft" ? "Draft" : "Submitted",
                  },
                  {
                    label: "Submitted",
                    value: selectedReport.submitted_at
                      ? new Date(selectedReport.submitted_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })
                      : "—",
                  },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-sm font-medium text-gray-900">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Values table */}
              {selectedValues.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No recorded values for this report.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-auto max-h-[min(420px,50vh)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                        <TableHead className="text-xs font-semibold text-gray-600 w-[45%]">Data element</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-600 w-[15%] text-right">Value</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-600">Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedValues.map((v) => (
                        <TableRow key={v.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="text-sm text-gray-800 py-2.5">{v.data_element_name}</TableCell>
                          <TableCell className="text-sm font-semibold text-gray-900 text-right py-2.5">{v.value ?? "—"}</TableCell>
                          <TableCell className="text-sm text-gray-500 py-2.5">{v.remark || ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Dialog footer actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(selectedReport)}
                  disabled={exporting}
                  className="gap-1.5 border-gray-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export XLSX
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportsPage
