 "use client"

import * as React from "react"
import { z } from "zod"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Trash2 } from "lucide-react"
import { ApiClient } from "@/lib/api"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(64, "Code must be at most 64 characters")
    .regex(/^[A-Z0-9_]+$/, "Use UPPER_SNAKE_CASE (letters, digits, underscore)"),
  description: z.string().optional(),
  value_type: z.enum(["NUMBER", "TEXT", "BOOLEAN"]).default("NUMBER"),
})

export type DataElementEditorMode = "create" | "edit"

export interface DataElementEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: DataElementEditorMode
  reportTypeId?: number
  initialData?: {
    id: number
    name: string
    code: string
    description?: string
    value_type?: string
  } | null
  onCompleted: (el: { id: number; code: string; name: string; description?: string }) => void
  onDeleted?: (code: string) => void
}

export function DataElementEditorModal({
  open,
  onOpenChange,
  mode,
  reportTypeId,
  initialData,
  onCompleted,
  onDeleted,
}: DataElementEditorModalProps) {
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [valueType, setValueType] = React.useState<"NUMBER" | "TEXT" | "BOOLEAN">("NUMBER")
  const [submitting, setSubmitting] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof z.infer<typeof schema>, string>>>({})

  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setName(initialData.name || "")
        setCode(initialData.code || "")
        setDescription(initialData.description || "")
        setValueType(
          (initialData.value_type as "NUMBER" | "TEXT" | "BOOLEAN") || "NUMBER",
        )
      } else if (mode === "create") {
        setName("")
        setCode("")
        setDescription("")
        setValueType("NUMBER")
      }
      setError(null)
      setFieldErrors({})
    }
  }, [open, mode, initialData])

  const handleSubmit = async () => {
    setError(null)

    const parsed = schema.safeParse({
      name,
      code,
      description: description || undefined,
      value_type: valueType,
    })

    if (!parsed.success) {
      const fe: Partial<Record<keyof z.infer<typeof schema>, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof z.infer<typeof schema>
        if (!fe[key]) fe[key] = issue.message
      }
      setFieldErrors(fe)
      return
    }

    try {
      setSubmitting(true)
      let saved

      if (mode === "edit" && initialData) {
        saved = await ApiClient.updateDataElement(initialData.id, {
          name: parsed.data.name,
          code: parsed.data.code,
          description: parsed.data.description,
          value_type: parsed.data.value_type,
        }).then((r) => r.data)
      } else {
        saved = await ApiClient.createDataElement({
          name: parsed.data.name,
          code: parsed.data.code,
          description: parsed.data.description,
          value_type: parsed.data.value_type,
          report_type: reportTypeId,
        }).then((r) => r.data)
      }

      onCompleted({
        id: saved.id,
        code: saved.code,
        name: saved.name,
        description: saved.description,
      })
      onOpenChange(false)
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.code?.[0] ||
        err?.response?.data?.name?.[0] ||
        err?.message ||
        "Unable to save data element"
      setError(String(detail))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!initialData) return
    if (!confirm("Delete this data element? This action cannot be undone.")) return

    try {
      setDeleting(true)
      await ApiClient.deleteDataElement(initialData.id)
      onDeleted?.(initialData.code)
      onOpenChange(false)
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to delete data element"
      setError(String(detail))
    } finally {
      setDeleting(false)
    }
  }

  const title = mode === "edit" ? "Edit data element" : "Create data element"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="de-name">Name</Label>
            <Input
              id="de-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }}
              placeholder="e.g. Number of nurses on duty"
            />
            {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="de-code">Code</Label>
            <Input
              id="de-code"
              value={code}
              onChange={(e) => {
                const raw = e.target.value
                const normalized = raw.replace(/\s+/g, "_").toUpperCase()
                setCode(normalized)
                setFieldErrors((prev) => ({ ...prev, code: undefined }))
              }}
              placeholder="E.g. NURSES_ON_DUTY"
            />
            {fieldErrors.code && <p className="text-xs text-red-500">{fieldErrors.code}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="de-value-type">Value type</Label>
            <Select
              value={valueType}
              onValueChange={(v) => setValueType(v as "NUMBER" | "TEXT" | "BOOLEAN")}
            >
              <SelectTrigger id="de-value-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NUMBER">Number</SelectItem>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="BOOLEAN">Yes / No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="de-description">Description</Label>
            <Textarea
              id="de-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description to help users understand this element"
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          {mode === "edit" && initialData && (
            <Button
              variant="ghost"
              type="button"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              disabled={deleting || submitting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting || deleting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || deleting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

