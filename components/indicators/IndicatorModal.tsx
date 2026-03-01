"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Calculator, Save } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { IndicatorDefinition } from "@/lib/advanced-formula-evaluator"
import { validateIndicator } from "@/lib/advanced-formula-evaluator"

// ── Zod schema ────────────────────────────────────────────────────────────────
const indicatorSchema = z.object({
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
  factor: z
    .number({ message: "Factor must be a whole number" })
    .int("Factor must be a whole number")
    .min(1, "Factor must be at least 1"),
  unit: z.string().optional(),
  aggregationType: z.enum(["sum", "average", "count", "min", "max"]),
  numeratorFormula: z.string().min(1, "Numerator formula is required"),
  numeratorDescription: z.string().optional(),
  denominatorFormula: z.string().optional(),
  denominatorDescription: z.string().optional(),
})

type IndicatorFormValues = z.infer<typeof indicatorSchema>

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
  onSave: (indicator: IndicatorDefinition) => void
  indicator?: IndicatorDefinition | null
  dataElements: DataElement[]
}

export function IndicatorModal({ open, onOpenChange, onSave, indicator, dataElements }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IndicatorFormValues>({
    resolver: zodResolver(indicatorSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      factor: 1,
      unit: "",
      aggregationType: "sum",
      numeratorFormula: "",
      numeratorDescription: "",
      denominatorFormula: "",
      denominatorDescription: "",
    },
  })

  const [formulaErrors, setFormulaErrors] = React.useState<string[]>([])
  const [selectedNumeratorElements, setSelectedNumeratorElements] = React.useState<Set<string>>(new Set())
  const [selectedDenominatorElements, setSelectedDenominatorElements] = React.useState<Set<string>>(new Set())

  const numeratorFormula = watch("numeratorFormula") ?? ""
  const denominatorFormula = watch("denominatorFormula") ?? ""

  // Populate form when opening
  React.useEffect(() => {
    if (open) {
      if (indicator) {
        reset({
          code: indicator.code,
          name: indicator.name,
          description: indicator.description ?? "",
          factor: indicator.factor ?? 1,
          unit: indicator.unit ?? "",
          aggregationType: indicator.aggregationType ?? "sum",
          numeratorFormula: indicator.numerator.formula,
          numeratorDescription: indicator.numerator.description ?? "",
          denominatorFormula: indicator.denominator?.formula ?? "",
          denominatorDescription: indicator.denominator?.description ?? "",
        })
        const numCodes = dataElements
          .filter((de) => indicator.numerator.formula.includes(de.code))
          .map((de) => de.code)
        const denCodes = indicator.denominator
          ? dataElements
              .filter((de) => indicator.denominator!.formula.includes(de.code))
              .map((de) => de.code)
          : []
        setSelectedNumeratorElements(new Set(numCodes))
        setSelectedDenominatorElements(new Set(denCodes))
      } else {
        reset({
          code: "",
          name: "",
          description: "",
          factor: 1,
          unit: "",
          aggregationType: "sum",
          numeratorFormula: "",
          numeratorDescription: "",
          denominatorFormula: "",
          denominatorDescription: "",
        })
        setSelectedNumeratorElements(new Set())
        setSelectedDenominatorElements(new Set())
      }
      setFormulaErrors([])
    }
  }, [open, indicator, dataElements, reset])

  const toggleDataElement = (code: string, type: "numerator" | "denominator") => {
    if (type === "numerator") {
      const newSet = new Set(selectedNumeratorElements)
      if (newSet.has(code)) {
        newSet.delete(code)
        const updated = numeratorFormula
          .replace(new RegExp(`\\s*\\+\\s*${code}|${code}\\s*\\+\\s*|^${code}$`, "g"), "")
          .trim()
        setValue("numeratorFormula", updated, { shouldValidate: true })
      } else {
        newSet.add(code)
        setValue(
          "numeratorFormula",
          numeratorFormula ? `${numeratorFormula} + ${code}` : code,
          { shouldValidate: true }
        )
      }
      setSelectedNumeratorElements(newSet)
    } else {
      const newSet = new Set(selectedDenominatorElements)
      if (newSet.has(code)) {
        newSet.delete(code)
        const updated = denominatorFormula
          .replace(new RegExp(`\\s*\\+\\s*${code}|${code}\\s*\\+\\s*|^${code}$`, "g"), "")
          .trim()
        setValue("denominatorFormula", updated)
      } else {
        newSet.add(code)
        setValue(
          "denominatorFormula",
          denominatorFormula ? `${denominatorFormula} + ${code}` : code
        )
      }
      setSelectedDenominatorElements(newSet)
    }
  }

  const onSubmit = (values: IndicatorFormValues) => {
    const fullIndicator: IndicatorDefinition = {
      id: indicator?.id ?? "",
      code: values.code,
      name: values.name,
      description: values.description,
      factor: values.factor,
      unit: values.unit ?? "",
      aggregationType: values.aggregationType,
      numerator: {
        formula: values.numeratorFormula,
        description: values.numeratorDescription ?? "",
        dataElements: Array.from(selectedNumeratorElements),
      },
      denominator: values.denominatorFormula
        ? {
            formula: values.denominatorFormula,
            description: values.denominatorDescription ?? "",
            dataElements: Array.from(selectedDenominatorElements),
          }
        : undefined,
    }

    const validationResult = validateIndicator(fullIndicator)
    if (!validationResult.isValid) {
      setFormulaErrors(validationResult.errors)
      return
    }
    setFormulaErrors([])
    onSave(fullIndicator)
  }

  const factorReg = register("factor", { valueAsNumber: true })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" style={{ color: "#1B5E3B" }} />
            {indicator ? "Edit Indicator" : "Create New Indicator"}
          </DialogTitle>
          <DialogDescription>
            {indicator
              ? "Update the indicator details and formula."
              : "Define a new calculation indicator with numerator and optional denominator."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ind-code" className="text-sm font-medium">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ind-code"
                  placeholder="e.g., IND001"
                  className={`font-mono ${errors.code ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-green-600"}`}
                  {...register("code")}
                />
                {errors.code ? (
                  <p className="text-xs text-red-500">{errors.code.message}</p>
                ) : (
                  <p className="text-xs text-gray-400">Unique identifier (letters, digits, _ or -)</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ind-name" className="text-sm font-medium">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ind-name"
                  placeholder="e.g., Malaria Incidence Rate"
                  className={errors.name ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-green-600"}
                  {...register("name")}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ind-desc" className="text-sm font-medium text-gray-700">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="ind-desc"
                placeholder="Describe what this indicator measures..."
                rows={2}
                className="focus-visible:ring-green-600"
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ind-factor" className="text-sm font-medium">Factor</Label>
                <Input
                  id="ind-factor"
                  type="number"
                  min={1}
                  className={`focus-visible:ring-green-600 ${errors.factor ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                  {...factorReg}
                  onChange={(e) => {
                    factorReg.onChange(e)
                    const v = Number(e.target.value)
                    if (v === 100) setValue("unit", "%")
                    else if (v === 1000) setValue("unit", "per 1000")
                  }}
                />
                {errors.factor && <p className="text-xs text-red-500">{errors.factor.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ind-unit" className="text-sm font-medium text-gray-700">
                  Unit <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="ind-unit"
                  placeholder="e.g., %, per 1000"
                  className="focus-visible:ring-green-600"
                  {...register("unit")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ind-aggregation" className="text-sm font-medium">Aggregation</Label>
                <select
                  id="ind-aggregation"
                  {...register("aggregationType")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  <option value="sum">Sum</option>
                  <option value="average">Average</option>
                  <option value="count">Count</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
              </div>
            </div>
          </div>

          {/* Numerator */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Numerator <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="num-formula" className="text-sm font-medium">
                Formula <span className="text-red-500">*</span>
              </Label>
              <Input
                id="num-formula"
                placeholder="e.g., DE001 + DE002"
                className={`font-mono ${errors.numeratorFormula ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-green-600"}`}
                {...register("numeratorFormula")}
              />
              {errors.numeratorFormula && (
                <p className="text-xs text-red-500">{errors.numeratorFormula.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="num-desc" className="text-sm font-medium text-gray-700">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="num-desc"
                placeholder="Describe what the numerator represents..."
                rows={2}
                className="focus-visible:ring-green-600"
                {...register("numeratorDescription")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Available Data Elements</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                {dataElements.length === 0 ? (
                  <p className="text-sm text-gray-500">No data elements available</p>
                ) : (
                  dataElements.map((de) => (
                    <button
                      key={de.id}
                      type="button"
                      onClick={() => toggleDataElement(de.code, "numerator")}
                      className={
                        selectedNumeratorElements.has(de.code)
                          ? "px-2 py-1 text-xs font-medium text-white rounded hover:opacity-90"
                          : "px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50"
                      }
                      style={
                        selectedNumeratorElements.has(de.code)
                          ? { background: "linear-gradient(135deg, #1B5E3B, #2E7D52)" }
                          : {}
                      }
                    >
                      {de.code}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Denominator */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Denominator{" "}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="den-formula" className="text-sm font-medium text-gray-700">
                Formula
              </Label>
              <Input
                id="den-formula"
                placeholder="e.g., DE003"
                className="font-mono focus-visible:ring-green-600"
                {...register("denominatorFormula")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="den-desc" className="text-sm font-medium text-gray-700">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="den-desc"
                placeholder="Describe what the denominator represents..."
                rows={2}
                className="focus-visible:ring-green-600"
                {...register("denominatorDescription")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Available Data Elements</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                {dataElements.length === 0 ? (
                  <p className="text-sm text-gray-500">No data elements available</p>
                ) : (
                  dataElements.map((de) => (
                    <button
                      key={de.id}
                      type="button"
                      onClick={() => toggleDataElement(de.code, "denominator")}
                      className={
                        selectedDenominatorElements.has(de.code)
                          ? "px-2 py-1 text-xs font-medium text-white rounded hover:opacity-90"
                          : "px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50"
                      }
                      style={
                        selectedDenominatorElements.has(de.code)
                          ? { background: "linear-gradient(135deg, #1B5E3B, #2E7D52)" }
                          : {}
                      }
                    >
                      {de.code}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Formula validation errors (from validateIndicator) */}
          {formulaErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {formulaErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #1B5E3B, #2E7D52)" }}
            >
              <Save className="h-4 w-4 mr-2" />
              {indicator ? "Update" : "Create"} Indicator
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
