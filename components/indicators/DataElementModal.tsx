"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Database, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ── Zod schema ────────────────────────────────────────────────────────────────
const dataElementSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(255, "Code must be at most 255 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, digits, underscores and hyphens"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  description: z.string().optional(),
})

type DataElementFormValues = z.infer<typeof dataElementSchema>

// ── Types ─────────────────────────────────────────────────────────────────────
interface DataElement {
  id: number
  code: string
  name: string
  description?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (dataElement: Omit<DataElement, "id">) => void
  dataElement?: DataElement | null
}

export function DataElementModal({ open, onOpenChange, onSave, dataElement }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DataElementFormValues>({
    resolver: zodResolver(dataElementSchema),
    defaultValues: { code: "", name: "", description: "" },
  })

  // Populate form when editing
  React.useEffect(() => {
    if (open) {
      reset(
        dataElement
          ? { code: dataElement.code, name: dataElement.name, description: dataElement.description ?? "" }
          : { code: "", name: "", description: "" }
      )
    }
  }, [open, dataElement, reset])

  const onSubmit = (values: DataElementFormValues) => {
    onSave({ code: values.code, name: values.name, description: values.description })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" style={{ color: "#C9433B" }} />
            {dataElement ? "Edit Data Element" : "Create Data Element"}
          </DialogTitle>
          <DialogDescription>
            {dataElement
              ? "Update the data element details below."
              : "Define a new data element for use in reports and indicators."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-2">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="de-code" className="text-sm font-medium">
              Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="de-code"
              placeholder="e.g., DE001"
              className={`font-mono ${errors.code ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-red-600"}`}
              {...register("code")}
            />
            {errors.code ? (
              <p className="text-xs text-red-500">{errors.code.message}</p>
            ) : (
              <p className="text-xs text-gray-400">Unique identifier (letters, digits, _ or -)</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="de-name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="de-name"
              placeholder="e.g., Number of OPD visits"
              className={errors.name ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-red-600"}
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="de-desc" className="text-sm font-medium text-gray-700">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="de-desc"
              placeholder="Describe what this data element represents..."
              rows={3}
              className="focus-visible:ring-red-600"
              {...register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #C9433B, #D96455)" }}
            >
              <Save className="h-4 w-4 mr-2" />
              {dataElement ? "Update" : "Create"} Data Element
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
