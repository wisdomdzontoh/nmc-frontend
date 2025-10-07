"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Calculator } from "lucide-react"

/* ---------------- TYPES ---------------- */

type ValuesByCode = Record<string, number | string | null>

type TableArrayHeaderCell = {
  label?: string
  colSpan?: number
  rowSpan?: number
  align?: "left" | "center" | "right"
  bold?: boolean
}

type TableArrayRowCell = {
  text?: string
  bind?: string
  compute?: string
  colSpan?: number
  rowSpan?: number
  align?: "left" | "center" | "right"
  bold?: boolean
}

type TableArraySection = {
  id?: string | number
  type: "table"
  columnWidths?: number[]
  header?: { rows: TableArrayHeaderCell[][] }
  rows: { cells: TableArrayRowCell[] }[]
}

type HeadingSection = {
  id?: string | number
  type: "heading"
  level?: 1 | 2 | 3
  text: string
}

type TextSection = {
  id?: string | number
  type: "text"
  content: string
}

export type LayoutSchemaSection = HeadingSection | TextSection | TableArraySection

export type LayoutSchema = {
  sections?: LayoutSchemaSection[]
  title?: string
}

type Props = {
  layout: LayoutSchema
  values: ValuesByCode
  onChange: (code: string, val: number | string | null) => void
  readOnly?: boolean
}

/* ---------------- CELL INPUT ---------------- */

function CellInput({
  code,
  isRemark,
  numberValue,
  textValue,
  readOnly,
  onChange,
}: {
  code: string
  isRemark: boolean
  numberValue: number | null
  textValue: string
  readOnly?: boolean
  onChange: (code: string, val: number | string | null) => void
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

  return isRemark ? (
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
  )
}

/* ---------------- TABLE ARRAY RENDERER ---------------- */

function TableArray({
  section,
  values,
  onChange,
  readOnly,
}: {
  section: TableArraySection
  values: ValuesByCode
  onChange: (code: string, val: number | string | null) => void
  readOnly?: boolean
}) {
  const colWidths = section.columnWidths
  const header = section.header?.rows
  const body = section.rows || []

  return (
    <div className="overflow-x-auto max-w-full">
      <table className="w-full border-collapse min-w-[700px]">
        {Array.isArray(colWidths) && (
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>
        )}

        {Array.isArray(header) && header.length > 0 && (
          <thead className="bg-amber-50">
            {header.map((hr, ri) => (
              <tr key={`th-${ri}`}>
                {hr.map((hc, ci) => (
                  <th
                    key={`thc-${ri}-${ci}`}
                    colSpan={hc.colSpan || 1}
                    rowSpan={hc.rowSpan || 1}
                    className={cn(
                      "border border-gray-300 px-2 py-2 text-left text-[14px] font-bold bg-blue-50",
                      hc.align === "center" && "text-center",
                      hc.align === "right" && "text-right"
                    )}
                  >
                    {hc.label ?? ""}
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
                  content = (
                    <CellInput
                      code={code}
                      isRemark={isRemark}
                      numberValue={(value as number | null) ?? null}
                      textValue={String(value ?? "")}
                      onChange={onChange}
                      readOnly={readOnly}
                    />
                  )
                  extraClass = "bg-blue-50/30"
                } else if (c.compute) {
                  const code = String(c.bind || c.compute)
                  const computed = values[code] ?? null
                  content = (
                    <div className="flex items-center gap-2 text-purple-700 text-lg font-semibold justify-end pr-2">
                      <Calculator className="h-5 w-5 opacity-70" />
                      <span className="font-mono">
                        {computed !== null && computed !== undefined
                          ? computed
                          : "—"}
                      </span>
                    </div>
                  )
                  extraClass = "bg-purple-50/30"
                } else if (typeof c.text === "string" && c.text.trim() !== "") {
                  content = <span className="text-sm font-semibold">{c.text}</span>
                }

                return (
                  <td
                    key={`td-${ri}-${ci}`}
                    colSpan={c.colSpan || 1}
                    rowSpan={c.rowSpan || 1}
                    className={cn(
                      "border border-gray-300 px-3 py-3 align-top min-w-[120px]",
                      c.bold && "font-semibold",
                      c.align === "center" && "text-center",
                      c.align === "right" && "text-right",
                      extraClass
                    )}
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
  )
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function LayoutEntryForm({
  layout,
  values,
  onChange,
  readOnly,
}: Props) {
  const sections = Array.isArray(layout?.sections) ? layout.sections : []

  if (!sections.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <p className="text-gray-500">
          No layout sections found. Please check the layout configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {layout.title && (
        <div className="px-3 py-2 text-sm font-semibold border-b">
          {layout.title}
        </div>
      )}

      <div className="p-3 space-y-4">
        {sections.map((section, sIdx) => {
          if (section.type === "heading") {
            return (
              <div
                key={section.id || `heading-${sIdx}`}
                className={cn(
                  "px-4 py-3 font-semibold border-b bg-gradient-to-r from-blue-50 to-blue-100",
                  section.level === 1 && "text-lg",
                  section.level === 2 && "text-base",
                  (!section.level || section.level === 3) && "text-sm"
                )}
              >
                {section.text}
              </div>
            )
          }

          if (section.type === "text") {
            return (
              <div
                key={section.id || `text-${sIdx}`}
                className="px-4 py-3 text-sm text-gray-700 border-b bg-gray-50"
              >
                {section.content}
              </div>
            )
          }

          if (section.type === "table") {
            return (
              <div key={section.id || `table-${sIdx}`}>
                <TableArray
                  section={section as TableArraySection}
                  values={values}
                  onChange={onChange}
                  readOnly={readOnly}
                />
              </div>
            )
          }

          return <React.Fragment key={`unknown-${sIdx}`} />
        })}

        <div className="px-4 py-3 border-t bg-gray-50 flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded" />
            <span>Data Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-50 border border-purple-200 rounded" />
            <span>Calculated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded" />
            <span>Header</span>
          </div>
        </div>
      </div>
    </div>
  )
}
