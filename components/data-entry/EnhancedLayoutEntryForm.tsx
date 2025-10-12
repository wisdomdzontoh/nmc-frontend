"use client"

import * as React from "react"
import { Calculator, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalculationDisplay, CalculationSummary } from "./CalculationDisplay"
import { IndicatorBuilder } from "./IndicatorBuilder"
import { evaluateAdvancedFormula, type AdvancedFormulaContext, type CalculationResult, type IndicatorDefinition } from "@/lib/advanced-formula-evaluator"

/* ---------------- TYPES ---------------- */

type ValuesByCode = Record<string, number | string | null>

type TableArrayHeaderCell = {
  label?: string
  colSpan?: number
}

type TableArrayRowCell = {
  text?: string
  bind?: string
  compute?: string
  bold?: boolean
  backgroundColor?: string
  textColor?: string
  alignment?: "left" | "center" | "right"
}

type TableArrayRow = {
  cells: TableArrayRowCell[]
}

type TableArraySection = {
  id: string
  type: "table"
  header?: {
    rows: TableArrayHeaderCell[][]
  }
  rows: TableArrayRow[]
  columnWidths?: number[]
}

type HeadingSection = {
  id: string
  type: "heading"
  text: string
  level?: number
}

type LayoutSchema = {
  title?: string
  sections: (TableArraySection | HeadingSection)[]
}

type Props = {
  schema: LayoutSchema
  values: ValuesByCode
  onChange: (code: string, val: number | string | null) => void
  readOnly?: boolean
  dataElements?: Array<{ id: string; code: string; name: string }>
  indicators?: IndicatorDefinition[]
}

/* ---------------- ENHANCED CELL INPUT ---------------- */

function EnhancedCellInput({
  code,
  isRemark,
  numberValue,
  textValue,
  readOnly,
  onChange,
  showCalculation = false,
  calculationResult,
}: {
  code: string
  isRemark: boolean
  numberValue: number | null
  textValue: string
  readOnly?: boolean
  onChange: (code: string, val: number | string | null) => void
  showCalculation?: boolean
  calculationResult?: CalculationResult
}) {
  const [localValue, setLocalValue] = React.useState<string>("")

  React.useEffect(() => {
    if (isRemark) setLocalValue(textValue ?? "")
    else setLocalValue(numberValue !== null ? String(numberValue) : "")
  }, [numberValue, textValue, isRemark])

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    if (isRemark) onChange(code, newValue)
    else {
      const trimmed = newValue.trim()
      onChange(code, trimmed === "" ? null : Number(trimmed))
    }
  }

  return (
    <div className="space-y-2">
      {isRemark ? (
        <Textarea
          value={localValue}
          readOnly={readOnly}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[60px] text-sm resize-none bg-white"
          placeholder="Enter remarks…"
        />
      ) : (
        <Input
          type="number"
          step="0.01"
          value={localValue}
          readOnly={readOnly}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "text-right h-12 text-lg font-semibold px-4 border-2 focus:ring-2 focus:ring-blue-100 bg-white",
            readOnly
              ? "border-purple-200 text-purple-700 bg-purple-50/30 cursor-not-allowed"
              : "border-blue-200 focus:border-blue-400"
          )}
          placeholder="0"
        />
      )}
      
      {showCalculation && calculationResult && (
        <div className="text-xs text-gray-500">
          <CalculationDisplay result={calculationResult} size="sm" />
        </div>
      )}
    </div>
  )
}

/* ---------------- ENHANCED TABLE ARRAY RENDERER ---------------- */

function EnhancedTableArray({
  section,
  values,
  onChange,
  readOnly,
  dataElements = [],
  indicators = [],
}: {
  section: TableArraySection
  values: ValuesByCode
  onChange: (code: string, val: number | string | null) => void
  readOnly?: boolean
  dataElements?: Array<{ id: string; code: string; name: string }>
  indicators?: IndicatorDefinition[]
}) {
  const [showCalculations, setShowCalculations] = React.useState(false)
  const [showIndicators, setShowIndicators] = React.useState(false)

  // Create context for formula evaluation
  const context: AdvancedFormulaContext = React.useMemo(() => ({
    getCellValue: (rowIndex: number, colIndex: number) => {
      const row = section.rows[rowIndex]
      if (!row || !row.cells[colIndex]) return null
      const cell = row.cells[colIndex]
      if (cell.bind) {
        return values[cell.bind] ?? null
      }
      return null
    },
    getDataElementValue: (code: string) => {
      return values[code] as number | null
    },
    rowCount: section.rows.length,
    colCount: Math.max(...section.rows.map(r => r.cells.length)),
    dataElements: dataElements.map(de => ({
      code: de.code,
      value: values[de.code] as number | null
    }))
  }), [section, values, dataElements])

  // Calculate all computed values
  const computedValues = React.useMemo(() => {
    const computed: Record<string, CalculationResult> = {}
    
    section.rows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.compute) {
          const computeKey = String(cell.bind || cell.compute)
          try {
            const result = evaluateAdvancedFormula(cell.compute, context)
            computed[computeKey] = result
          } catch (err) {
            computed[computeKey] = {
              value: null,
              formatted: "#ERROR",
              isValid: false,
              error: String(err),
              dependencies: [],
              calculationType: 'formula'
            }
          }
        }
      })
    })
    
    return computed
  }, [section, context])

  // Calculate indicators
  const indicatorResults = React.useMemo(() => {
    const results: Record<string, CalculationResult> = {}
    
    indicators.forEach(indicator => {
      try {
        const result = evaluateAdvancedFormula(
          indicator.denominator 
            ? `${indicator.numerator.formula} / ${indicator.denominator.formula} * ${indicator.factor}`
            : `${indicator.numerator.formula} * ${indicator.factor}`,
          context
        )
        results[indicator.code] = {
          ...result,
          formatted: `${result.formatted} ${indicator.unit}`,
          calculationType: 'indicator' as const
        }
      } catch (err) {
        results[indicator.code] = {
          value: null,
          formatted: "#ERROR",
          isValid: false,
          error: String(err),
          dependencies: [],
          calculationType: 'indicator' as const
        }
      }
    })
    
    return results
  }, [indicators, context])

  const body = section.rows || []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCalculations(!showCalculations)}
        >
          <Calculator className="h-4 w-4 mr-2" />
          {showCalculations ? "Hide" : "Show"} Calculations
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIndicators(!showIndicators)}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          {showIndicators ? "Hide" : "Show"} Indicators
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          {section.header && (
            <thead className="bg-gray-50">
              {section.header.rows.map((headerRow, hri) => (
                <tr key={`header-${hri}`}>
                  {headerRow.map((cell, hci) => (
                    <th
                      key={`h-${hri}-${hci}`}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b"
                      colSpan={cell.colSpan || 1}
                    >
                      {cell.label}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          )}

          <tbody>
            {body.map((row, ri) => (
              <tr key={`tr-${ri}`} className="hover:bg-blue-50/20">
                {row.cells.map((c, ci) => {
                  let content: React.ReactNode = c.text ?? ""
                  let extraClass = ""

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
                      />
                    )
                    extraClass = "bg-blue-50/30"
                  } else if (c.compute) {
                    const code = String(c.bind || c.compute)
                    const computed = computedValues[code]
                    
                    content = (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-purple-700 text-lg font-semibold justify-end pr-2">
                          <Calculator className="h-5 w-5 opacity-70" />
                          <span className="font-mono">
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
                    extraClass = "bg-purple-50/30"
                  } else if (typeof c.text === "string" && c.text.trim() !== "") {
                    content = (
                      <span className={cn(
                        "text-sm",
                        c.bold ? "font-bold" : "font-semibold",
                        c.textColor && `text-[${c.textColor}]`
                      )}>
                        {c.text}
                      </span>
                    )
                  }

                  return (
                    <td
                      key={`cell-${ri}-${ci}`}
                      className={cn(
                        "px-4 py-3 border-b align-top",
                        extraClass,
                        c.backgroundColor && `bg-[${c.backgroundColor}]`,
                        c.alignment === "center" && "text-center",
                        c.alignment === "right" && "text-right"
                      )}
                      style={{
                        width: section.columnWidths?.[ci] ? `${section.columnWidths[ci]}px` : undefined
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

      {/* Calculations Summary */}
      {showCalculations && (
        <CalculationSummary
          results={Object.entries(computedValues).map(([key, result]) => ({
            label: `Formula: ${key}`,
            result,
            type: result.calculationType
          }))}
          title="Table Calculations"
        />
      )}

      {/* Indicators Summary */}
      {showIndicators && (
        <CalculationSummary
          results={Object.entries(indicatorResults).map(([key, result]) => ({
            label: indicators.find(i => i.code === key)?.name || key,
            result,
            type: 'indicator' as const
          }))}
          title="Indicators"
        />
      )}
    </div>
  )
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function EnhancedLayoutEntryForm({
  schema,
  values,
  onChange,
  readOnly = false,
  dataElements = [],
  indicators = []
}: Props) {

  const handleSaveIndicator = (indicator: IndicatorDefinition) => {
    // This would typically save to backend
    console.log("Saving indicator:", indicator)
    // You would implement the actual save logic here
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {schema.title || "Data Entry Form"}
          </h2>
          <p className="text-gray-600 mt-1">
            Enter data and view real-time calculations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <IndicatorBuilder
            dataElements={dataElements}
            onSave={handleSaveIndicator}
            existingIndicators={indicators}
          />
        </div>
      </div>

      {/* Sections */}
      {schema.sections.map((section) => {
        if (section.type === "heading") {
          return (
            <div key={section.id} className="mt-8 mb-4">
              <h3 className={cn(
                "font-bold text-gray-900",
                section.level === 1 && "text-2xl",
                section.level === 2 && "text-xl",
                section.level === 3 && "text-lg",
                !section.level && "text-xl"
              )}>
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
                  indicators={indicators}
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

// Export types for use in other components
export type { TableArraySection, TableArrayRowCell, LayoutSchema }
