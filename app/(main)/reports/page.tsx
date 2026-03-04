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
  submitted_at: string
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

interface Assignment {
  id: number
  org_unit: number
  org_unit_name: string
  report_type: number
  report_type_name: string
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
const QUARTER_MONTHS: Record<string, string[]> = {
  Q1: ["01", "02", "03"], Q2: ["04", "05", "06"],
  Q3: ["07", "08", "09"], Q4: ["10", "11", "12"],
}

function getCurrentYear() { return new Date().getFullYear() }

function getYearOptions(): number[] {
  const cur = getCurrentYear()
  return Array.from({ length: 7 }, (_, i) => cur - i)
}

function periodMatches(rp: string, type: string, year: string, period: string): boolean {
  if (type === "yearly") return rp.startsWith(year)
  if (type === "quarterly") {
    const months = QUARTER_MONTHS[period] || []
    return months.some((m) => rp.startsWith(`${year}-${m}`))
  }
  // monthly — period is "1".."12"
  const m = String(Number(period)).padStart(2, "0")
  return rp.startsWith(`${year}-${m}`)
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
  const [periodFilter, setPeriodFilter] = useState("all")
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
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [allReportsForRate, setAllReportsForRate] = useState<Report[]>([])
  const [rateLoading, setRateLoading] = useState(false)
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

  // ── Reports list ordering ─────────────────────────────────────────────────
  const ordering = useMemo(() => {
    const prefix = sortDir === "desc" ? "-" : ""
    if (sortField === "submitted_at" || sortField === "reporting_period") return `${prefix}${sortField}`
    return "-submitted_at"
  }, [sortField, sortDir])

  // ── Load reports list ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingReports(true)
      setReportsError(null)
      try {
        const res = await ApiClient.getReports({ page, page_size: pageSize, ordering })
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
  }, [page, pageSize, ordering])

  // ── Filtered + client-sorted reports ─────────────────────────────────────
  const filteredReports = useMemo(() => {
    let data = [...reports]
    const q = searchText.trim().toLowerCase()
    if (q) data = data.filter((r) => r.report_type_name.toLowerCase().includes(q) || r.org_unit_name.toLowerCase().includes(q))
    if (periodFilter !== "all") data = data.filter((r) => r.reporting_period.startsWith(periodFilter))
    if (sortField === "report_type_name" || sortField === "org_unit_name") {
      data.sort((a, b) => {
        const av = a[sortField].toLowerCase()
        const bv = b[sortField].toLowerCase()
        return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0
      })
    }
    return data
  }, [reports, searchText, periodFilter, sortField, sortDir])

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
    setPage(1)
  }

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

  // ── Initialise rate tab data (once) ──────────────────────────────────────
  const initRateData = useCallback(async () => {
    if (rateInitialised) return
    try {
      setRateLoading(true)
      setRateError(null)
      const [treeRes, assignRes] = await Promise.all([
        ApiClient.getOrgUnits(),
        ApiClient.getReportTypeAssignments({ page_size: 1000 }),
      ])
      setFlatUnits(flattenTree(treeRes.data || []))
      const assignData = assignRes.data
      setAssignments(Array.isArray(assignData) ? assignData : (assignData.results || []))
      setRateInitialised(true)
    } catch {
      setRateError("Failed to load organisation data. Please try again.")
    } finally {
      setRateLoading(false)
    }
  }, [rateInitialised])

  // ── Generate reporting rate summary ───────────────────────────────────────
  const handleGenerate = async () => {
    try {
      setRateLoading(true)
      setRateError(null)
      setSummaryRows(null)

      // Ensure meta data is loaded
      if (!rateInitialised) await initRateData()

      // Fetch all reports for the selected year (wide net, filter client-side)
      const res = await ApiClient.getReports({ page_size: 2000, ordering: "reporting_period" })
      const data = res.data
      const allRpts: Report[] = Array.isArray(data) ? data : (data.results || [])
      setAllReportsForRate(allRpts)

      // Filter to selected period
      const periodReports = allRpts.filter((r) =>
        periodMatches(r.reporting_period, periodType, rateYear, ratePeriod)
      )

      // Determine which org units to include
      const orgsToUse =
        rateOrgFilter === "all"
          ? flatUnits
          : getSubtree(flatUnits, Number(rateOrgFilter))

      // Compute summary rows
      const rows: SummaryRow[] = orgsToUse.map((ou) => {
        const ouAssignments = assignments.filter((a) => a.org_unit === ou.id)
        const ouReports = periodReports.filter((r) => r.org_unit === ou.id)
        const expected = ouAssignments.length
        const submitted = ouReports.length
        const completeness = expected > 0 ? Math.round((submitted / expected) * 100) : null
        return { orgUnitId: ou.id, orgUnitName: ou.name, level: ou.level, expected, submitted, completeness }
      })

      setSummaryRows(rows)
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

  // ── Access guard ──────────────────────────────────────────────────────────
  if (!isSuperuser && !isStaff) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center px-6">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-6 w-6 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
        <p className="text-sm text-gray-500">Reports are only available to staff and administrators.</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse submissions and monitor reporting completeness across org units
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
            Submitted Reports
          </TabsTrigger>
          <TabsTrigger
            value="rate"
            className="gap-2 text-xs data-[state=active]:bg-[#C9433B] data-[state=active]:text-white data-[state=active]:shadow-sm"
            onClick={initRateData}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Reporting Rate Summary
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
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-sm text-gray-400">
                            No reports found. Try adjusting your search or filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((r) => (
                          <TableRow key={r.id} className="hover:bg-gray-50/70 border-b border-gray-100">
                            <TableCell className="pl-5 py-3">
                              <span className="font-medium text-gray-900 text-sm">{r.report_type_name}</span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-700 py-3">{r.org_unit_name}</TableCell>
                            <TableCell className="text-sm text-gray-700 py-3">
                              {new Date(r.reporting_period).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700 py-3">
                              <div>{new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</div>
                              {r.submitted_by_name && (
                                <div className="text-[11px] text-gray-400 mt-0.5">by {r.submitted_by_name}</div>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
                                <CheckCircle className="h-3 w-3" />
                                Submitted
                              </Badge>
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
                Select a period and optionally an org unit to compute expected vs submitted report counts.
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
                      <SelectItem value="all">All org units</SelectItem>
                      {flatUnits.filter((u) => u.level === 0).map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                      ))}
                      {flatUnits.filter((u) => u.level === 1).map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          &nbsp;&nbsp;{u.name}
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
                        Org Unit Completeness — {formatPeriodLabel(periodType, rateYear, ratePeriod)}
                      </CardTitle>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {sortedSummaryRows.length} org unit{sortedSummaryRows.length !== 1 ? "s" : ""} ·
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
      </Tabs>

      {/* ── Report detail dialog ─────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
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
