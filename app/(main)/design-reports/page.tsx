// app/design-reports/page.tsx
"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ImportFromExcelModal } from "@/components/report-designer/ImportFromExcelModal"
import { Loader2, FileSpreadsheet, Download, FilePenLine, Plus, Search, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { PageCard } from "@/components/layout/PageCard"
import { StatusPill } from "@/components/common/status-pill"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { TableSkeleton } from "@/components/common/skeletons"
import { reportStatus } from "@/lib/status-labels"

type LayoutStatus = "draft" | "published" | "archived"

type LayoutRow = {
  id: number
  name: string
  code: string
  status?: LayoutStatus | string
  version?: number
  report_type_name?: string
  updated_at?: string
}

export default function DesignReportsList() {
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [templateDownloading, setTemplateDownloading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | LayoutStatus>("all")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, error, isLoading, mutate } = useSWR("/reporting/report-layouts/", (url) =>
    api.get(url).then((r) => r.data),
  )

  // Check if user is staff or superuser
  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)

  const layouts: LayoutRow[] = useMemo(() => {
    if (!data) return []
    const raw = Array.isArray(data?.results) ? data.results : data
    return (raw || []) as LayoutRow[]
  }, [data])

  const filteredLayouts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return layouts.filter((l) => {
      const normalizedStatus = (l.status || "draft").toLowerCase() as LayoutStatus
      const matchesStatus =
        statusFilter === "all" || normalizedStatus === statusFilter
      const matchesQuery =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.report_type_name || "").toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [layouts, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLayouts.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageItems = filteredLayouts.slice(pageStart, pageStart + pageSize)

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as typeof statusFilter)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleDownloadTemplate = async () => {
    setTemplateDownloading(true)
    try {
      const { data } = await api.get<Blob>("/reporting/report-layouts/download-template/", {
        responseType: "blob",
      })
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = "report_import_template.xlsx"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Error is visible via network; could add toast
    } finally {
      setTemplateDownloading(false)
    }
  }

  const pageHeader = (
    <PageCard
      title="Design reports"
      description="Create and edit the report forms people fill in on the Data entry page."
      icon={<FilePenLine className="h-5 w-5" aria-hidden="true" />}
      actions={
        isSuperuser || isStaff ? (
          <>
            <Button variant="secondary" onClick={handleDownloadTemplate} disabled={templateDownloading}>
              {templateDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {templateDownloading ? "Downloading…" : "Download template"}
            </Button>
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Import from Excel
            </Button>
            <Button asChild>
              <Link href="/design-reports/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create layout
              </Link>
            </Button>
          </>
        ) : undefined
      }
    />
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <section className="rounded-xl border border-border bg-card">
          <TableSkeleton rows={6} columns={5} />
        </section>
      </div>
    )
  }

  // No permission (from the server, or not staff)
  if (error?.response?.status === 403 || (!isSuperuser && !isStaff)) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <section className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration="no-access"
            title="You don't have access to report design"
            description="Designing report forms is for administrators. If you need it, ask your administrator."
          />
        </section>
      </div>
    )
  }

  const hasFilters = search.trim() !== "" || statusFilter !== "all"

  return (
    <div className="space-y-6">
      {pageHeader}

      <ImportFromExcelModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => mutate()}
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search by name, code or report"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
              aria-label="Search layouts"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && error?.response?.status !== 403 ? (
          <ErrorState error={error} title="We couldn't load the layouts" onRetry={() => mutate()} />
        ) : pageItems.length === 0 ? (
          hasFilters ? (
            <EmptyState
              illustration="no-results"
              title="No layouts match these filters"
              description="Try a different search or status."
              action={{
                label: "Clear filters",
                onClick: () => {
                  handleSearchChange("")
                  handleStatusChange("all")
                },
              }}
            />
          ) : (
            <EmptyState
              illustration="report"
              title="No report layouts yet"
              description="Create a layout, or import one from an Excel template, so people can start entering data."
              action={{ label: "Create layout", href: "/design-reports/new" }}
            />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%] pl-5">Name</TableHead>
                <TableHead className="w-[16%]">Code</TableHead>
                <TableHead className="w-[20%]">Report</TableHead>
                <TableHead className="w-[12%]">Status</TableHead>
                <TableHead className="w-[8%] text-center">Version</TableHead>
                <TableHead className="w-[10%]">Updated</TableHead>
                <TableHead className="w-[6%] pr-5"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((l) => {
                const status = reportStatus(l.status || "draft")
                return (
                  <TableRow key={l.id}>
                    <TableCell className="pl-5 font-medium text-foreground">
                      <Link href={`/design-reports/${l.id}`} className="block truncate hover:text-primary hover:underline">
                        {l.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-clinical rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{l.code}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block truncate text-sm text-muted-foreground">{l.report_type_name || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={status.tone} icon={status.icon}>
                        {status.label}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="font-clinical text-center text-sm">
                      {l.version != null ? `v${l.version}` : "—"}
                    </TableCell>
                    <TableCell className="font-clinical text-sm text-muted-foreground">
                      {l.updated_at ? new Date(l.updated_at).toLocaleDateString("en-GB") : "—"}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/design-reports/${l.id}`} aria-label={`Edit ${l.name}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {filteredLayouts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle px-5 py-3 text-sm text-muted-foreground">
            <p>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {pageStart + 1}–{Math.min(pageStart + pageSize, filteredLayouts.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{filteredLayouts.length}</span> layout
              {filteredLayouts.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
              <span className="font-clinical">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
