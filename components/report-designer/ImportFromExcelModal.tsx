"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileSpreadsheet, Upload, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Zod schema ────────────────────────────────────────────────────────────────
const importSchema = z.object({
  name: z.string().min(1, "Layout name is required").max(255, "Name must be at most 255 characters"),
  code: z
    .string()
    .min(1, "Layout code is required")
    .max(50, "Code must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Code may only contain letters, digits, hyphens and underscores"),
})

type FieldErrors = Partial<Record<keyof z.infer<typeof importSchema>, string>>

interface ImportFromExcelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportFromExcelModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportFromExcelModalProps) {
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [createReportType, setCreateReportType] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setName("")
    setCode("")
    setCreateReportType(true)
    setError(null)
    setFieldErrors({})
  }

  React.useEffect(() => {
    if (!open) reset()
  }, [open])

  React.useEffect(() => {
    if (file && !name) {
      const base = file.name.replace(/\.(xlsx|xls)$/i, "")
      setName(base)
      setCode(base.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase().slice(0, 50) || "report")
    }
  }, [file, name])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      setFile(f)
      setError(null)
    } else {
      setError("Please upload an Excel file (.xlsx or .xls)")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      setFile(f)
      setError(null)
    } else if (f) {
      setError("Please upload an Excel file (.xlsx or .xls)")
    }
    e.target.value = ""
  }

  const handleClearFile = () => {
    setFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select an Excel file")
      return
    }

    // Derive final values (mirrors submit logic below)
    const finalName = name || file.name.replace(/\.(xlsx|xls)$/i, "")
    const finalCode = code || "imported-report"
    const validation = importSchema.safeParse({ name: finalName, code: finalCode })
    if (!validation.success) {
      const errs: FieldErrors = {}
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as keyof FieldErrors
        if (!errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name || file.name.replace(/\.(xlsx|xls)$/i, ""))
      formData.append("code", code || "imported-report")
      formData.append("create_report_type", createReportType ? "true" : "false")

      // Remove default Content-Type so axios sends multipart/form-data with boundary (api defaults to application/json)
      const { data } = await api.post<{
        id: number
        name: string
        code: string
        data_elements_created?: number
        data_elements_total?: number
      }>("/reporting/report-layouts/import-from-excel/", formData, {
        transformRequest: [
          (data: unknown, headers: Record<string, unknown>) => {
            if (data instanceof FormData) delete headers["Content-Type"]
            return data
          },
        ],
      })

      toast.success("Report imported", {
        description: `Layout "${data.name}" created with ${data.data_elements_total ?? 0} data elements.`,
      })
      onOpenChange(false)
      onSuccess?.()
      if (data.id) router.push(`/design-reports/${data.id}`)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Import failed"
      setError(String(msg))
      toast.error("Import failed", { description: String(msg) })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import report from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel report template. The system will detect the INDICATOR column (including merged headers),
            multi-row headers, and data rows. Multiple tables in one sheet are supported when separated by two or more
            empty rows; each table becomes a section in the report layout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              file && "border-primary/50 bg-primary/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
            {file ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  Click here or drag another file to replace
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFile()
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove file
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drag and drop an Excel file here, or{" "}
                <span className="text-primary underline">browse</span>
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="import-name">Layout name</Label>
            <Input
              id="import-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })) }}
              placeholder="e.g. Monthly Nursing Report"
              className={fieldErrors.name ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-red-600"}
            />
            {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="import-code">Layout code (unique)</Label>
            <Input
              id="import-code"
              value={code}
              onChange={(e) => { setCode(e.target.value); setFieldErrors((p) => ({ ...p, code: undefined })) }}
              placeholder="e.g. monthly-nursing-report"
              className={fieldErrors.code ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-red-600"}
            />
            {fieldErrors.code && <p className="text-xs text-red-500">{fieldErrors.code}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-report-type"
              checked={createReportType}
              onCheckedChange={(checked) => setCreateReportType(checked === true)}
            />
            <Label htmlFor="create-report-type" className="text-sm font-normal cursor-pointer">
              Create report type and link data elements (for data entry)
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
