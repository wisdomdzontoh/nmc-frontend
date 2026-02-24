"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ApiClient } from "@/lib/api"
import * as XLSX from "xlsx"

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

type SortField = "report_type_name" | "org_unit_name" | "reporting_period" | "submitted_at"
type SortDirection = "asc" | "desc"

const ReportsPage: React.FC = () => {
  const { djangoUser } = useAuth()

  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)

  const [reports, setReports] = useState<Report[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [searchText, setSearchText] = useState("")
  const [periodFilter, setPeriodFilter] = useState("all")

  const [sortField, setSortField] = useState<SortField>("submitted_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedValues, setSelectedValues] = useState<ReportValue[]>([])

  const [exporting, setExporting] = useState(false)

  const ordering = useMemo(() => {
    const prefix = sortDirection === "desc" ? "-" : ""
    if (sortField === "submitted_at" || sortField === "reporting_period") {
      return `${prefix}${sortField}`
    }
    return "-submitted_at"
  }, [sortField, sortDirection])

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true)
      setError(null)
      try {
        const params: Record<string, string | number> = {
          page,
          page_size: pageSize,
          ordering,
        }
        const res = await ApiClient.getReports(params)
        const data = res.data
        if (Array.isArray(data)) {
          setReports(data)
          setTotalCount(data.length)
        } else {
          setReports(data.results || [])
          setTotalCount(typeof data.count === "number" ? data.count : (data.results || []).length)
        }
      } catch (err) {
        console.error("Failed to load reports:", err)
        setError("Failed to load reports. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [page, pageSize, ordering])

  const filteredReports = useMemo(() => {
    let data = [...reports]
    const q = searchText.trim().toLowerCase()
    if (q) {
      data = data.filter(
        (r) =>
          r.report_type_name.toLowerCase().includes(q) ||
          r.org_unit_name.toLowerCase().includes(q)
      )
    }
    if (periodFilter !== "all") {
      data = data.filter((r) => r.reporting_period.startsWith(periodFilter))
    }
    if (sortField === "report_type_name" || sortField === "org_unit_name") {
      data.sort((a, b) => {
        const av = (a[sortField] || "").toString().toLowerCase()
        const bv = (b[sortField] || "").toString().toLowerCase()
        if (av < bv) return sortDirection === "asc" ? -1 : 1
        if (av > bv) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }
    return data
  }, [reports, searchText, periodFilter, sortField, sortDirection])

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setPage(1)
  }

  const periodOptions = useMemo(() => {
    const periods: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long" })
      periods.push({ value, label })
    }
    return periods
  }, [])

  const handleView = async (report: Report) => {
    setSelectedReport(report)
    setSelectedValues([])
    setViewOpen(true)
    try {
      setViewLoading(true)
      const res = await ApiClient.getReport(report.id)
      const full = res.data as Report & { values?: ReportValue[] }
      setSelectedValues(full.values || [])
    } catch (err) {
      console.error("Failed to load report details:", err)
    } finally {
      setViewLoading(false)
    }
  }

  const downloadReportAsXlsx = (
    report: Report,
    values: ReportValue[],
    submittedAt?: string | null
  ) => {
    const rows: (string | number)[][] = [
      ["Report Type", report.report_type_name],
      ["Organisation Unit", report.org_unit_name],
      ["Reporting Period", report.reporting_period],
      ["Submitted At", submittedAt ? new Date(submittedAt).toLocaleString() : ""],
      [],
      ["Data element", "Value", "Remark"],
    ]
    values.forEach((v) => {
      rows.push([
        v.data_element_name,
        v.value ?? "",
        (v.remark || "").trim(),
      ])
    })
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    const period = new Date(report.reporting_period).toISOString().slice(0, 10)
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)
    const filename = `${safe(report.report_type_name)}_${safe(report.org_unit_name)}_${period}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const handleExport = async (report: Report) => {
    setExporting(true)
    try {
      const res = await ApiClient.exportReport(report.id, "xlsx")
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const period = new Date(report.reporting_period).toISOString().slice(0, 10)
      a.download = `${report.report_type_name.replace(/[^a-zA-Z0-9]/g, "_")}_${report.org_unit_name.replace(/[^a-zA-Z0-9]/g, "_")}_${period}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      try {
        const fullRes = await ApiClient.getReport(report.id)
        const full = fullRes.data as Report & { values?: ReportValue[]; submitted_at?: string }
        const values = full.values || []
        downloadReportAsXlsx(report, values, full.submitted_at)
      } catch (fallbackErr) {
        console.error("Export and fallback failed:", err, fallbackErr)
      }
    } finally {
      setExporting(false)
    }
  }

  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Submitted Reports</h1>
        <Alert>
          <AlertDescription>
            Reports are only available to staff and administrators. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reports…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Submitted Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Efficiently browse, inspect and export submitted reports.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{djangoUser?.org_unit_name || "No organization assigned"}</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Search and filter</CardTitle>
          <CardDescription>
            Use search, period and sorting options to quickly find the report you need.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by report type or organisation…"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setPage(1)
              }}
              className="pl-9 bg-white"
            />
          </div>
          <Select
            value={periodFilter}
            onValueChange={(v) => {
              setPeriodFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[220px] bg-white">
              <SelectValue placeholder="Filter by period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All periods</SelectItem>
              {periodOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("report_type_name")}
                    >
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span>Report type</span>
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("org_unit_name")}
                    >
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <span>Organisation</span>
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("reporting_period")}
                    >
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span>Period</span>
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[140px]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("submitted_at")}
                    >
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>Submitted</span>
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-sm text-slate-500"
                    >
                      No reports found. Try adjusting your search or filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-900">
                            {r.report_type_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{r.org_unit_name}</TableCell>
                      <TableCell>
                        {new Date(r.reporting_period).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(r.submitted_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Submitted
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(r)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(r)}
                          disabled={exporting}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/60">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, totalCount)} of {totalCount} report(s)
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPage(1)
                    setPageSize(Number(v))
                  }}
                >
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  {"<<"}
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {"<"}
                </Button>
                <span>
                  Page {page} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                >
                  {">"}
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(pageCount)}
                  disabled={page >= pageCount}
                >
                  {">>"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Report details</DialogTitle>
            <DialogDescription>
              {selectedReport
                ? `${selectedReport.report_type_name} • ${selectedReport.org_unit_name}`
                : "No report selected."}
            </DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-slate-600">Loading values…</span>
            </div>
          ) : !selectedReport ? (
            <p className="text-sm text-slate-600">No report selected.</p>
          ) : (
            <div className="flex flex-col gap-4 mt-2 min-h-0 overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Report type</p>
                  <p className="text-sm font-medium text-slate-900">{selectedReport.report_type_name}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Organisation unit</p>
                  <p className="text-sm font-medium text-slate-900">{selectedReport.org_unit_name}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Period</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(selectedReport.reporting_period).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Submitted</p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedReport.submitted_at
                      ? new Date(selectedReport.submitted_at).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
              {selectedValues.length === 0 ? (
                <p className="text-sm text-slate-600 py-4">
                  This report does not have any recorded values.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-auto max-h-[min(420px,50vh)] shrink-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                        <TableHead className="border-r border-slate-200 font-semibold w-[40%]">Data element</TableHead>
                        <TableHead className="border-r border-slate-200 font-semibold w-[15%] text-right">Value</TableHead>
                        <TableHead className="font-semibold">Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedValues.map((v) => (
                        <TableRow key={v.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="border-r border-slate-200 align-top">{v.data_element_name}</TableCell>
                          <TableCell className="border-r border-slate-200 text-right align-top">
                            {v.value ?? ""}
                          </TableCell>
                          <TableCell className="align-top text-slate-700">{v.remark || ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportsPage

