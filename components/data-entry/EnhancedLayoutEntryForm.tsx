"use client"

import * as React from "react"
import { Calculator, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalculationDisplay, CalculationSummary } from "./CalculationDisplay"
import { evaluateAdvancedFormula, type AdvancedFormulaContext, type CalculationResult } from "@/lib/advanced-formula-evaluator"

/* ── Types ─────────────────────────────────────────────────────────────────── */

type ValuesByCode = Record<string, number | string | null>

type TableArrayHeaderCell = { label?: string; colSpan?: number }

type TableArrayRowCell = {
  text?: string
  bind?: string
  compute?: string
  bold?: boolean
  backgroundColor?: string
  textColor?: string
  alignment?: "left" | "center" | "right"
}

type TableArrayRow = { cells: TableArrayRowCell[] }

type TableArraySection = {
  id: string
  type: "table"
  header?: { rows: TableArrayHeaderCell[][] }
  rows: TableArrayRow[]
  columnWidths?: number[]
}

type HeadingSection = { id: string; type: "heading"; text: string; level?: number }

type LayoutSchema = { title?: string; sections: (TableArraySection | HeadingSection)[] }

type Props = {
  schema: LayoutSchema
  values: ValuesByCode
  onChange: (code: string, val: number | string | null) => void
  readOnly?: boolean
  dataElements?: Array<{ id: string; code: string; name: string }>
  dataSaved?: boolean
  /** Codes successfully saved to the server */
  savedCodes?: Set<string>
  /** Codes with changes not yet persisted */
  unsavedCodes?: Set<string>
  /** True while an auto-save API call is in flight */
  autoSaving?: boolean
}

/* ── Cell save state ────────────────────────────────────────────────────────
 * saved   → green border + tinted bg   (value exists, server has it)
 * pending → amber border + tinted bg   (value exists, waiting to save)
 * default → blue border (empty or brand-new form)
 */
type CellSave = "saved" | "pending" | "default"

function getCellSave(
  code: string,
  hasValue: boolean,
  savedCodes?: Set<string>,
  unsavedCodes?: Set<string>
): CellSave {
  if (!hasValue) return "default"
  if (unsavedCodes?.has(code)) return "pending"
  if (savedCodes?.has(code)) return "saved"
  return "default"
}

/* ── EnhancedCellInput ──────────────────────────────────────────────────── */

function EnhancedCellInput({
  code,
  isRemark,
  numberValue,
  textValue,
  readOnly,
  onChange,
  showCalculation = false,
  calculationResult,
  savedCodes,
  unsavedCodes,
}: {
  code: string
  isRemark: boolean
  numberValue: number | null
  textValue: string
  readOnly?: boolean
  onChange: (code: string, val: number | string | null) => void
  showCalculation?: boolean
  calculationResult?: CalculationResult
  savedCodes?: Set<string>
  unsavedCodes?: Set<string>
}) {
  const [localValue, setLocalValue] = React.useState<string>("")

  React.useEffect(() => {
    if (isRemark) setLocalValue(textValue ?? "")
    else setLocalValue(numberValue !== null ? String(numberValue) : "")
  }, [numberValue, textValue, isRemark])

  const handleChange = (newValue: string) => {
    if (readOnly) return
    if (!isRemark) {
      if (newValue !== "" && !/^-?\d*\.?\d*$/.test(newValue)) return
    }
    setLocalValue(newValue)
    if (isRemark) {
      onChange(code, newValue)
    } else {
      const trimmed = newValue.trim()
      onChange(code, trimmed === "" || trimmed === "-" ? null : Number(trimmed))
    }
  }

  const hasValue = isRemark
    ? (localValue ?? "").trim() !== ""
    : localValue !== "" && localValue !== "-"

  const saveState = getCellSave(code, hasValue, savedCodes, unsavedCodes)

  const numberClass = cn(
    "text-right h-14 text-lg font-semibold px-4 border-2 focus:ring-2 w-full min-w-[100px] transition-colors duration-150",
    readOnly
      ? "border-gray-300 text-gray-600 bg-gray-50 cursor-not-allowed opacity-60"
      : saveState === "saved"
      ? "border-green-400 bg-green-50/70 focus:ring-green-100 focus:border-green-500 text-green-900"
      : saveState === "pending"
      ? "border-amber-300 bg-amber-50/60 focus:ring-amber-100 focus:border-amber-400"
      : "border-blue-200 focus:border-blue-400 hover:border-blue-300 focus:ring-blue-100 bg-white"
  )

  const remarkClass = cn(
    "min-h-[80px] text-sm resize-none w-full border-2 focus:ring-2 transition-colors duration-150",
    readOnly
      ? "bg-gray-50 cursor-not-allowed opacity-60"
      : saveState === "saved"
      ? "border-green-400 bg-green-50/70 focus:ring-green-100 focus:border-green-500"
      : saveState === "pending"
      ? "border-amber-300 bg-amber-50/60 focus:ring-amber-100 focus:border-amber-400"
      : "bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-100"
  )

  return (
    <div className="space-y-2 w-full">
      {/* Tiny save indicator dot in top-right of wrapper */}
      <div className="relative">
        {isRemark ? (
          <Textarea
            value={localValue}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => handleChange(e.target.value)}
            className={remarkClass}
            placeholder="Enter remarks…"
          />
        ) : (
          <Input
            type="text"
            inputMode="decimal"
            value={localValue}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => handleChange(e.target.value)}
            className={numberClass}
            placeholder="0"
          />
        )}

        {/* Saved tick — shown only for non-empty saved cells */}
        {!readOnly && saveState === "saved" && !isRemark && (
          <CheckCircle2 className="absolute top-1 right-1 h-3.5 w-3.5 text-green-500 pointer-events-none" />
        )}
      </div>

      {showCalculation && calculationResult && (
        <div className="text-xs text-gray-500">
          <CalculationDisplay result={calculationResult} size="sm" />
        </div>
      )}
    </div>
  )
}

/* ── EnhancedTableArray ─────────────────────────────────────────────────── */

function EnhancedTableArray({
  section,
  values,
  onChange,
  readOnly,
  dataElements = [],
  savedCodes,
  unsavedCodes,
}: {
  section: TableArraySection
  values: ValuesByCode
  onChange: (code: string, val: number | string | null) => void
  readOnly?: boolean
  dataElements?: Array<{ id: string; code: string; name: string }>
  savedCodes?: Set<string>
  unsavedCodes?: Set<string>
}) {
  const [showCalculations, setShowCalculations] = React.useState(false)

  const context: AdvancedFormulaContext = React.useMemo(() => ({
    getCellValue: (rowIndex, colIndex) => {
      const row = section.rows[rowIndex]
      if (!row || !row.cells[colIndex]) return null
      const cell = row.cells[colIndex]
      return cell.bind ? (values[cell.bind] ?? null) : null
    },
    getDataElementValue: (code) => values[code] as number | null,
    rowCount: section.rows.length,
    colCount: Math.max(...section.rows.map((r) => r.cells.length)),
    dataElements: dataElements.map((de) => ({ code: de.code, value: values[de.code] as number | null })),
  }), [section, values, dataElements])

  const computedValues = React.useMemo(() => {
    const computed: Record<string, CalculationResult> = {}
    section.rows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.compute) {
          const key = String(cell.bind || cell.compute)
          try {
            computed[key] = evaluateAdvancedFormula(cell.compute, context)
          } catch (err) {
            computed[key] = { value: null, formatted: "#ERROR", isValid: false, error: String(err), dependencies: [], calculationType: "formula" }
          }
        }
      })
    })
    return computed
  }, [section, context])

  const body = section.rows || []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCalculations(!showCalculations)}
        >
          <Calculator className="h-4 w-4 mr-2" />
          {showCalculations ? "Hide" : "Show"} Calculations
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg shadow-sm overflow-auto max-h-[calc(100vh-300px)]">
        <table className="w-full min-w-max border-separate border-spacing-0">
          {section.header && (
            <thead>
              {section.header.rows.map((headerRow, hri) => {
                const isLastHeaderRow = hri === section.header!.rows.length - 1
                const span = (c: { colSpan?: number }) => c.colSpan ?? 1
                let colIndex = 0
                return (
                  <tr key={`header-${hri}`}>
                    {headerRow.map((cell, hci) => {
                      const isFirstColumn = hci === 0
                      const cellSpan = span(cell)
                      const isSpanned = cellSpan > 1
                      const widthStyle = isSpanned
                        ? { width: "auto" as const, minWidth: `${cellSpan * 80}px` }
                        : section.columnWidths && isLastHeaderRow && colIndex < section.columnWidths.length
                        ? { minWidth: "80px", width: `${Math.max(section.columnWidths[colIndex] ?? 120, 80)}px` }
                        : { minWidth: isFirstColumn ? "200px" : "80px", width: "auto" as const }
                      colIndex += cellSpan
                      return (
                        <th
                          key={`h-${hri}-${hci}`}
                          className={cn(
                            "px-4 py-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap border border-gray-200 bg-gray-50 sticky top-0",
                            isFirstColumn && "sticky left-0 z-[30] border-r-2 border-gray-300 shadow-[2px_0_4px_rgba(0,0,0,0.08)]"
                          )}
                          colSpan={cellSpan}
                          style={{
                            ...widthStyle,
                            position: "sticky",
                            top: 0,
                            ...(isFirstColumn
                              ? { left: 0, zIndex: 30, backgroundColor: "rgb(249 250 251)" }
                              : { zIndex: 20 }),
                          }}
                        >
                          {cell.label}
                        </th>
                      )
                    })}
                  </tr>
                )
              })}
            </thead>
          )}

          <tbody>
            {body.map((row, ri) => (
              <tr key={`tr-${ri}`} className="hover:bg-blue-50/20">
                {row.cells.map((c, ci) => {
                  let content: React.ReactNode = c.text ?? ""
                  let extraClass = ""
                  const isFirstColumn = ci === 0

                  if (c.bind) {
                    const code = String(c.bind)
                    const isRemark = code.startsWith("remark.")
                    const value = values[code]
                    const computeKey = String(c.bind)
                    const calculationResult = computedValues[computeKey]
                    content = (
                      <EnhancedCellInput
                        code={code}
                        isRemark={isRemark}
                        numberValue={(value as number | null) ?? null}
                        textValue={String(value ?? "")}
                        onChange={onChange}
                        readOnly={readOnly}
                        showCalculation={showCalculations && calculationResult !== undefined}
                        calculationResult={calculationResult}
                        savedCodes={savedCodes}
                        unsavedCodes={unsavedCodes}
                      />
                    )
                    extraClass = "bg-blue-50/30"
                  } else if (c.compute) {
                    const code = String(c.bind || c.compute)
                    const computed = computedValues[code]
                    content = (
                      <div className="space-y-2">
                        <div className="flex items-center justify-end pr-2">
                          <span className="font-mono text-lg font-extrabold text-green-700">
                            {computed?.formatted || "—"}
                          </span>
                        </div>
                        {showCalculations && computed && (
                          <div className="text-xs">
                            <CalculationDisplay result={computed} size="sm" />
                          </div>
                        )}
                      </div>
                    )
                    extraClass = "bg-green-50/40"
                  } else if (typeof c.text === "string" && c.text.trim() !== "") {
                    content = (
                      <span className={cn("text-sm", c.bold ? "font-bold" : "font-semibold")}>
                        {c.text}
                      </span>
                    )
                  }

                  const getFirstColumnBg = () => {
                    if (c.backgroundColor) return c.backgroundColor
                    if (extraClass.includes("bg-blue-50")) return "rgb(239 246 255)"
                    if (extraClass.includes("bg-purple-50")) return "rgb(250 245 255)"
                    return "white"
                  }

                  return (
                    <td
                      key={`cell-${ri}-${ci}`}
                      className={cn(
                        "px-4 py-4 align-top border border-gray-200",
                        extraClass,
                        c.backgroundColor && `bg-[${c.backgroundColor}]`,
                        c.alignment === "center" && "text-center",
                        c.alignment === "right" && "text-right",
                        isFirstColumn && "sticky left-0 z-[10] border-r-2 border-gray-300 shadow-[2px_0_4px_rgba(0,0,0,0.08)]"
                      )}
                      style={{
                        minWidth: "120px",
                        width: section.columnWidths?.[ci] ? `${Math.max(section.columnWidths[ci], 120)}px` : "auto",
                        ...(isFirstColumn
                          ? { position: "sticky", left: 0, zIndex: 10, backgroundColor: getFirstColumnBg() }
                          : {}),
                      }}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCalculations && (
        <CalculationSummary
          results={Object.entries(computedValues).map(([key, result]) => ({
            label: `Formula: ${key}`,
            result,
            type: result.calculationType,
          }))}
          title="Table Calculations"
        />
      )}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function EnhancedLayoutEntryForm({
  schema,
  values,
  onChange,
  readOnly = false,
  dataElements = [],
  dataSaved = false,
  savedCodes,
  unsavedCodes,
  autoSaving,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {schema.title || "Data Entry Form"}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            Enter data and view real-time calculations
            {autoSaving && (
              <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                Saving…
              </span>
            )}
            {!autoSaving && dataSaved && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </p>
        </div>
      </div>

      {schema.sections.map((section) => {
        if (section.type === "heading") {
          return (
            <div key={section.id} className="mt-8 mb-4">
              <h3
                className={cn(
                  "font-bold text-gray-900",
                  section.level === 1 && "text-2xl",
                  section.level === 2 && "text-xl",
                  section.level === 3 && "text-lg",
                  !section.level && "text-xl"
                )}
              >
                {section.text}
              </h3>
            </div>
          )
        }

        if (section.type === "table") {
          return (
            <Card key={section.id}>
              <CardContent className="p-6">
                <EnhancedTableArray
                  section={section}
                  values={values}
                  onChange={onChange}
                  readOnly={readOnly}
                  dataElements={dataElements}
                  savedCodes={savedCodes}
                  unsavedCodes={unsavedCodes}
                />
              </CardContent>
            </Card>
          )
        }

        return null
      })}
    </div>
  )
}

export type { TableArraySection, TableArrayRowCell, LayoutSchema }
