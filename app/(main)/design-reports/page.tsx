// app/design-reports/page.tsx
"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Loader2, FileSpreadsheet, Download } from "lucide-react"
import { SectionLoader } from "@/components/ui/PageLoader"

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

  if (isLoading) {
    return <SectionLoader message="Loading report layouts…" />
  }

  // Show error if user doesn't have permission
  if (error?.response?.status === 403) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Report Designer</h1>
        <Alert>
          <AlertDescription>
            You do not have permission to view or manage report layouts. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show error if user is not staff or superuser
  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Report Designer</h1>
        <Alert>
          <AlertDescription>
            Report design is only available to staff and administrators. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Report layouts</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={templateDownloading}
          >
            {templateDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download template
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import from Excel
          </Button>
          <Link href="/design-reports/new">
            <Button>Create layout</Button>
          </Link>
        </div>
      </div>
      <ImportFromExcelModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => mutate()}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name, code, or dataset…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="w-[180px]">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger>
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
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[28%]">Name</TableHead>
              <TableHead className="w-[18%]">Code</TableHead>
              <TableHead className="w-[20%]">Dataset</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[10%] text-center">Version</TableHead>
              <TableHead className="w-[12%]">Updated</TableHead>
              <TableHead className="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No layouts found.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="truncate">{l.name}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {l.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate block">
                      {l.report_type_name || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-muted text-muted-foreground">
                      {l.status || "draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {l.version != null ? `v${l.version}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.updated_at ? new Date(l.updated_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/design-reports/${l.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing{" "}
          {filteredLayouts.length === 0
            ? 0
            : `${pageStart + 1}-${Math.min(pageStart + pageSize, filteredLayouts.length)}`}{" "}
          of {filteredLayouts.length} layout(s)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
