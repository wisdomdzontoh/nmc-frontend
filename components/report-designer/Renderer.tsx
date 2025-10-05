"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

/* ---------- Types (keep in sync with your layout schema) ---------- */

export type CellDef = {
  /** Static label in a header cell */
  label?: string
  /** Static text in a body cell (ignored if bind/compute exist) */
  text?: string
  /** Data binding key, e.g. "hr.transfer_in" or "remark.hr.transfer_in" */
  bind?: string
  /** Small expression, e.g. "sum(row,1,11)" or "sum(column,2,10)" */
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
  data: Record<string, any>
  /** Optional record of remark strings bound via "bind" (e.g., "remark.hr.transfer_in") */
  remarks?: Record<string, any>
  /** Optional number formatter (defaults to plain output) */
  formatNumber?: (n: number) => string
}

/* ---------- Helpers ---------- */

function isNumberLike(v: unknown) {
  return typeof v === "number" || (!!v && !isNaN(Number(v)))
}

/**
 * Evaluate a tiny compute expression.
 * Supported:
 *   - sum(row, startCol, endCol)
 *   - sum(column, startRow, endRow)
 */
function evalCompute(
  expr: string,
  ctx: {
    rowValues: (number | string | undefined)[]
    columnValues?: (number | string | undefined)[]
  },
): number | string {
  const mRow = expr.match(/^sum$$\s*row\s*,\s*(\d+)\s*,\s*(\d+)\s*$$$/i)
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

  const mCol = expr.match(/^sum$$\s*column\s*,\s*(\d+)\s*,\s*(\d+)\s*$$$/i)
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

  // unsupported → empty
  return ""
}

/* ---------- Renderer ---------- */

export default function Renderer({ layout, data, remarks = {}, formatNumber }: RendererProps) {
  return (
    <div className="bg-white border rounded overflow-hidden">
      {layout.title ? <div className="px-3 py-2 text-sm font-semibold border-b">{layout.title}</div> : null}

      <div className="p-3 space-y-4">
        {layout.sections.map((sec, idx) => {
          if (sec.type === "heading") {
            const s = sec as HeadingSection
            return (
              <div key={idx} className="uppercase text-[12px] font-semibold bg-gray-50 border px-2 py-1">
                {s.text}
              </div>
            )
          }

          const t = sec as TableSection

          return (
            <div key={t.id} className="border border-gray-300 overflow-x-auto">
              <table className="w-full border-collapse">
                {/* Column widths (if provided) */}
                {t.columnWidths?.length ? (
                  <colgroup>
                    {t.columnWidths.map((w, i) => (
                      <col key={i} style={{ width: `${w}px` }} />
                    ))}
                  </colgroup>
                ) : null}

                {/* Header */}
                {t.header?.rows?.length ? (
                  <thead className="bg-amber-50">
                    {t.header.rows.map((r, ri) => (
                      <tr key={`h-${ri}`}>
                        {r.map((c, ci) => (
                          <th
                            key={`h-${ri}-${ci}`}
                            colSpan={c.colSpan || 1}
                            rowSpan={c.rowSpan || 1}
                            className={cn(
                              "border border-gray-300 px-2 py-2 text-left text-[12px] font-semibold",
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

                {/* Body */}
                <tbody>
                  {t.rows.map((row, ri) => {
                    // Pre-compute row values (for compute expressions)
                    const rowValues = row.cells.map((c) => {
                      if (c.bind?.startsWith("remark.")) return undefined
                      if (c.bind) return data[c.bind]
                      return undefined
                    })

                    return (
                      <tr key={`r-${ri}`}>
                        {row.cells.map((c, ci) => {
                          let content: React.ReactNode = c.text ?? ""

                          if (c.bind) {
                            if (c.bind.startsWith("remark.")) {
                              content = remarks[c.bind] ?? ""
                            } else {
                              const v = data[c.bind]
                              if (isNumberLike(v) && formatNumber) {
                                content = formatNumber(Number(v))
                              } else {
                                content = v ?? ""
                              }
                            }
                          }

                          if (c.compute) {
                            const computed = evalCompute(c.compute, { rowValues })
                            content = isNumberLike(computed) && formatNumber ? formatNumber(Number(computed)) : computed
                          }

                          return (
                            <td
                              key={`c-${ri}-${ci}`}
                              colSpan={c.colSpan || 1}
                              rowSpan={c.rowSpan || 1}
                              className={cn(
                                "border border-gray-300 px-2 py-2 align-top text-[13px]",
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
