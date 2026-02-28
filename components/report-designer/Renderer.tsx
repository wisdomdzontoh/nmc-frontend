"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import { evaluateFormula, type FormulaContext, type CellValue } from "@/lib/formula-evaluator"

/* ---------- Types (keep in sync with your layout schema) ---------- */

export type CellDef = {
  /** Static label in a header cell */
  label?: string
  /** Static text in a body cell (ignored if bind/compute exist) */
  text?: string
  /** Data binding key, e.g. "hr.transfer_in" or "remark.hr.transfer_in" */
  bind?: string
  /** Formula expression, e.g. "SUM(A1:A5)" or "sum(row,1,11)" (legacy) */
  compute?: string
  /** HTML colspan/rowspan */
  colSpan?: number
  rowSpan?: number
  /** Text alignment */
  align?: "left" | "center" | "right"
}

export type TableSection = {
  type: "table"
  /** Stable id (useful for anchors/QA) */
  id: string
  /** Header allows multi-row headers (tiered). */
  header?: { rows: CellDef[][] }
  /** Fixed pixel widths per column (optional) */
  columnWidths?: number[]
  /** Body rows */
  rows: { cells: CellDef[] }[]
}

export type HeadingSection = {
  type: "heading"
  text: string
}

export type LayoutSchema = {
  /** Optional title shown above sections */
  title?: string
  sections: (HeadingSection | TableSection)[]
}

type RendererProps = {
  layout: LayoutSchema
  /** Flat record of values bound via "bind" keys */
  data: Record<string, unknown>
  /** Optional record of remark strings bound via "bind" (e.g., "remark.hr.transfer_in") */
  remarks?: Record<string, unknown>
  /** Optional number formatter (defaults to plain output) */
  formatNumber?: (n: number) => string
}

/* ---------- Helpers ---------- */

function isNumberLike(v: unknown) {
  return typeof v === "number" || (!!v && !isNaN(Number(v)))
}

/**
 * Legacy compute evaluation for backward compatibility
 * Supports: sum(row, startCol, endCol) and sum(column, startRow, endRow)
 */
function evalLegacyCompute(
  expr: string,
  ctx: {
    rowValues: (number | string | undefined)[]
    columnValues?: (number | string | undefined)[]
  },
): number | string {
  const mRow = expr.match(/^sum\s*$$\s*row\s*,\s*(\d+)\s*,\s*(\d+)\s*$$$/i)
  if (mRow) {
    const a = Number(mRow[1])
    const b = Number(mRow[2])
    let s = 0
    for (let i = a; i <= b; i++) {
      const v = ctx.rowValues[i]
      if (isNumberLike(v)) s += Number(v)
    }
    return s
  }

  const mCol = expr.match(/^sum\s*$$\s*column\s*,\s*(\d+)\s*,\s*(\d+)\s*$$$/i)
  if (mCol && ctx.columnValues) {
    const a = Number(mCol[1])
    const b = Number(mCol[2])
    let s = 0
    for (let r = a; r <= b; r++) {
      const v = ctx.columnValues[r]
      if (isNumberLike(v)) s += Number(v)
    }
    return s
  }

  // Not a legacy format, return empty
  return ""
}

/* ---------- Renderer ---------- */

export default function Renderer({ layout, data, remarks = {}, formatNumber }: RendererProps) {
  return (
    <div className="bg-card border rounded overflow-hidden max-w-full">
      {layout.title ? <div className="px-3 py-2 text-sm font-semibold border-b">{layout.title}</div> : null}

      <div className="p-3 space-y-4">
        {layout.sections.map((sec, idx) => {
          if (sec.type === "heading") {
            const s = sec as HeadingSection
            return (
              <div key={idx} className="uppercase text-[12px] font-semibold bg-muted border px-2 py-1">
                {s.text}
              </div>
            )
          }

          const t = sec as TableSection

          const formulaContext: FormulaContext = {
            getCellValue: (rowIndex: number, colIndex: number): CellValue => {
              const cell = t.rows[rowIndex]?.cells[colIndex]
              if (!cell) return undefined

              if (cell.compute) return undefined

              if (cell.bind) {
                if (cell.bind.startsWith("remark.")) {
                  return remarks[cell.bind] as CellValue
                }
                return data[cell.bind] as CellValue
              }

              return cell.text
            },
            rowCount: t.rows.length,
            colCount: t.rows[0]?.cells.length || 0,
          }

          return (
            <div key={t.id} className="border border-border overflow-x-auto max-w-full">
              <table className="w-full border-collapse min-w-max">
                {(() => {
                  const colCount = t.header?.rows?.[0]?.length || t.rows?.[0]?.cells?.length || 0
                  const widths = Array.from({ length: colCount }, (_, i) =>
                    typeof t.columnWidths?.[i] === "number" && t.columnWidths[i] > 0 ? t.columnWidths[i] : 150,
                  )
                  return colCount ? (
                    <colgroup>
                      {widths.map((w, i) => (
                        <col key={i} style={{ width: `${w}px` }} />
                      ))}
                    </colgroup>
                  ) : null
                })()}

                {t.header?.rows?.length ? (
                  <thead className="bg-accent/20">
                    {t.header.rows.map((r, ri) => (
                      <tr key={`h-${ri}`}>
                        {r.map((c, ci) => (
                          <th
                            key={`h-${ri}-${ci}`}
                            colSpan={c.colSpan || 1}
                            rowSpan={c.rowSpan || 1}
                            className={cn(
                              "border border-border px-2 py-2 text-left text-[12px] font-semibold",
                              c.align === "center" && "text-center",
                              c.align === "right" && "text-right",
                            )}
                          >
                            {c.label ?? ""}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                ) : null}

                <tbody>
                  {t.rows.map((row, ri) => {
                    const rowValues: (number | string | undefined)[] = row.cells.map((c) => {
                      if (c.bind?.startsWith("remark.")) return undefined
                      if (c.bind) {
                        const v = data[c.bind]
                        return typeof v === "number" || typeof v === "string" ? v : undefined
                      }
                      return undefined
                    })

                    return (
                      <tr key={`r-${ri}`}>
                        {row.cells.map((c, ci) => {
                          let content: React.ReactNode = c.text ?? ""

                          if (c.bind) {
                            if (c.bind.startsWith("remark.")) {
                              const rv = remarks[c.bind]
                              content = typeof rv === "string" || typeof rv === "number" ? rv : String(rv ?? "")
                            } else {
                              const v = data[c.bind]
                              if (isNumberLike(v) && formatNumber) {
                                content = formatNumber(Number(v))
                              } else {
                                content = typeof v === "string" || typeof v === "number" ? v : String(v ?? "")
                              }
                            }
                          }

                          if (c.compute) {
                            const legacyResult = evalLegacyCompute(c.compute, { rowValues })

                            if (legacyResult !== "") {
                              content =
                                isNumberLike(legacyResult) && formatNumber
                                  ? formatNumber(Number(legacyResult))
                                  : legacyResult
                            } else {
                              const result = evaluateFormula(c.compute, formulaContext)

                              if (typeof result === "string" && result.startsWith("#")) {
                                content = <span className="text-red-600 text-xs">{result}</span>
                              } else if (isNumberLike(result) && formatNumber) {
                                content = formatNumber(Number(result))
                              } else {
                                content = result
                              }
                            }
                          }

                          return (
                            <td
                              key={`c-${ri}-${ci}`}
                              colSpan={c.colSpan || 1}
                              rowSpan={c.rowSpan || 1}
                              className={cn(
                                "border border-border px-2 py-2 align-top text-[13px]",
                                c.align === "center" && "text-center",
                                c.align === "right" && "text-right",
                              )}
                            >
                              {content}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
