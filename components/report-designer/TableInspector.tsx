"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CellDef, TableSection } from "@/types/report-layout"
import { useDesignerStore } from "@/stores/reportDesignerStore"
import { useHotkeys } from "react-hotkeys-hook"
import { cn } from "@/lib/utils"

export default function TableInspector({
  table,
  onChange,
  sectionIndex,
}: {
  table: TableSection
  onChange: (t: TableSection) => void
  sectionIndex: number
}) {
  const { selectedCell, setSelectedCell } = useDesignerStore()

  /* ---------- helpers ---------- */
  const colCount = table.rows[0]?.cells.length || table.columnWidths?.length || 1
  const rowCount = table.rows.length

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
  }

  function moveSelection(dx: number, dy: number) {
    if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) {
      // if nothing selected, focus first body cell
      setSelectedCell({ sectionIndex, rowIndex: 0, colIndex: 0 })
      return
    }
    const r = clamp(selectedCell.rowIndex + dy, 0, rowCount - 1)
    const c = clamp(selectedCell.colIndex + dx, 0, colCount - 1)
    setSelectedCell({ sectionIndex, rowIndex: r, colIndex: c })
  }

  function getSelected(): CellDef | null {
    if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) return null
    const { rowIndex, colIndex } = selectedCell
    return table.rows[rowIndex]?.cells[colIndex] ?? null
  }

  function patchSelected(patch: Partial<CellDef>) {
    if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) return
    const { rowIndex, colIndex } = selectedCell
    const rows = table.rows.map((r, ri) =>
      ri === rowIndex
        ? {
            cells: r.cells.map((c, ci) => (ci === colIndex ? { ...c, ...patch } : c)),
          }
        : r,
    )
    onChange({ ...table, rows })
  }

  /* ---------- columns ---------- */
  function setColWidth(i: number, w: number) {
    const cw = [...(table.columnWidths || [])]
    cw[i] = w || 120
    onChange({ ...table, columnWidths: cw })
  }
  function addColumn() {
    const widths = [...(table.columnWidths || []), 120]
    const rows = table.rows.map((r) => ({ cells: [...r.cells, { text: "" }] }))
    const header = table.header ? { rows: table.header.rows.map((hr) => [...hr, { label: "" }]) } : undefined
    onChange({ ...table, columnWidths: widths, rows, header })
  }
  function removeLastColumn() {
    if (!table.columnWidths?.length && !table.rows[0]?.cells?.length) return
    const widths = (table.columnWidths || []).slice(0, -1)
    const rows = table.rows.map((r) => ({ cells: r.cells.slice(0, -1) }))
    const header = table.header ? { rows: table.header.rows.map((hr) => hr.slice(0, -1)) } : undefined
    onChange({ ...table, columnWidths: widths, rows, header })
  }

  /* ---------- rows ---------- */
  function addRow() {
    const cols = table.rows[0]?.cells.length || table.columnWidths?.length || 1
    const cells: CellDef[] = Array.from({ length: cols }, (_, i) =>
      i === 0 ? { text: String((table.rows.length || 0) + 1) } : { text: "" },
    )
    onChange({ ...table, rows: [...table.rows, { cells }] })
  }
  function removeLastRow() {
    if (!table.rows.length) return
    onChange({ ...table, rows: table.rows.slice(0, -1) })
  }

  /* ---------- selection ---------- */
  function selectCell(rowIndex: number, colIndex: number) {
    setSelectedCell({ sectionIndex, rowIndex, colIndex })
  }

  /* ---------- header (multi-row) ---------- */
  function addHeaderRow() {
    const header = table.header ?? { rows: [] as CellDef[][] }
    const cols = table.columnWidths?.length || table.rows[0]?.cells.length || 1
    header.rows.push(Array.from({ length: cols }, () => ({ label: "" })))
    onChange({ ...table, header })
  }

  /* ---------- keyboard shortcuts ---------- */
  useHotkeys(
    "enter",
    (e) => {
      e.preventDefault()
      addRow()
      // jump to first cell of the newly added row
      setSelectedCell({ sectionIndex, rowIndex: rowCount, colIndex: 0 })
    },
    [rowCount, colCount, table],
  )

  // On many keyboards ctrl+= is "ctrl+plus"
  useHotkeys(
    "ctrl+=' , ctrl+plus, ctrl+shift+=",
    (e) => {
      e.preventDefault()
      addColumn()
      // move to the new column in current row if any selection
      if (selectedCell && selectedCell.sectionIndex === sectionIndex) {
        setSelectedCell({
          sectionIndex,
          rowIndex: selectedCell.rowIndex,
          colIndex: colCount, // new last index
        })
      }
    },
    [selectedCell, colCount, table],
  )

  useHotkeys(
    "backspace,del",
    (e) => {
      if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) return
      e.preventDefault()
      patchSelected({ text: "", bind: undefined, compute: undefined })
    },
    [selectedCell, table],
  )

  useHotkeys(
    "tab",
    (e) => {
      if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) return
      e.preventDefault()
      // move right, wrap to next row
      const nextCol = selectedCell.colIndex + 1
      if (nextCol < colCount) moveSelection(1, 0)
      else if (selectedCell.rowIndex + 1 < rowCount)
        setSelectedCell({
          sectionIndex,
          rowIndex: selectedCell.rowIndex + 1,
          colIndex: 0,
        })
    },
    [selectedCell, colCount, rowCount],
  )

  useHotkeys(
    "shift+tab",
    (e) => {
      if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) return
      e.preventDefault()
      // move left, wrap to previous row
      const prevCol = selectedCell.colIndex - 1
      if (prevCol >= 0) moveSelection(-1, 0)
      else if (selectedCell.rowIndex - 1 >= 0)
        setSelectedCell({
          sectionIndex,
          rowIndex: selectedCell.rowIndex - 1,
          colIndex: colCount - 1,
        })
    },
    [selectedCell, colCount],
  )

  useHotkeys("left", () => moveSelection(-1, 0), [selectedCell, colCount, rowCount])
  useHotkeys("right", () => moveSelection(1, 0), [selectedCell, colCount, rowCount])
  useHotkeys("up", () => moveSelection(0, -1), [selectedCell, colCount, rowCount])
  useHotkeys("down", () => moveSelection(0, 1), [selectedCell, colCount, rowCount])

  /* ---------- UI ---------- */
  const sel = getSelected()
  const [textVal, setTextVal] = React.useState(sel?.text ?? "")
  const [bindVal, setBindVal] = React.useState(sel?.bind ?? "")
  const [computeVal, setComputeVal] = React.useState(sel?.compute ?? "")

  // keep inputs in sync with selection changes
  React.useEffect(() => {
    const s = getSelected()
    setTextVal(s?.text ?? "")
    setBindVal((s?.bind as string) ?? "")
    setComputeVal(s?.compute ?? "")
  }, [selectedCell, table])

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold">Columns</div>
      <div className="flex items-center gap-2 mb-1">
        <Button size="sm" variant="secondary" onClick={addColumn}>
          + Column
        </Button>
        <Button size="sm" variant="outline" onClick={removeLastColumn}>
          Remove last
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(table.columnWidths || []).map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs">Col {i + 1}</span>
            <Input type="number" value={w} onChange={(e) => setColWidth(i, Number(e.target.value))} />
          </div>
        ))}
      </div>

      <div className="text-xs font-semibold mt-3">Body rows</div>
      <div className="flex items-center gap-2 mb-1">
        <Button size="sm" variant="secondary" onClick={addRow}>
          + Row
        </Button>
        <Button size="sm" variant="outline" onClick={removeLastRow}>
          Remove last
        </Button>
      </div>

      {/* Mini grid (click to select) */}
      <div className="border rounded overflow-auto max-h-64">
        <table className="w-full border-collapse text-[12px]">
          <tbody>
            {table.rows.map((r, ri) => (
              <tr key={ri}>
                {r.cells.map((c, ci) => {
                  const isSel =
                    selectedCell &&
                    selectedCell.sectionIndex === sectionIndex &&
                    selectedCell.rowIndex === ri &&
                    selectedCell.colIndex === ci
                  const display = c.bind ?? c.text ?? c.compute ?? ""
                  return (
                    <td
                      key={ci}
                      onClick={() => selectCell(ri, ci)}
                      className={cn(
                        "border px-2 py-1 cursor-pointer",
                        isSel ? "outline outline-2 outline-blue-500" : "hover:bg-gray-50",
                      )}
                    >
                      {display || <span className="text-gray-400">•</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected cell editor */}
      <div className="mt-3">
        <div className="text-xs font-semibold mb-1">
          Cell{" "}
          {selectedCell && selectedCell.sectionIndex === sectionIndex
            ? `(r${selectedCell.rowIndex + 1}, c${selectedCell.colIndex + 1})`
            : ""}
        </div>

        {selectedCell && selectedCell.sectionIndex === sectionIndex ? (
          <div className="space-y-2">
            <Input
              placeholder="text"
              value={textVal}
              onChange={(e) => {
                setTextVal(e.target.value)
                patchSelected({
                  text: e.target.value,
                  bind: undefined,
                  compute: undefined,
                })
              }}
            />
            <Input
              placeholder="bind (click + on a data element to auto-fill)"
              value={bindVal}
              onChange={(e) => {
                setBindVal(e.target.value)
                patchSelected({
                  bind: e.target.value,
                  text: undefined,
                  compute: undefined,
                })
              }}
            />
            <Input
              placeholder="compute e.g. sum(row,1,11)"
              value={computeVal}
              onChange={(e) => {
                setComputeVal(e.target.value)
                patchSelected({
                  compute: e.target.value,
                  text: undefined,
                  bind: undefined,
                })
              }}
            />
            <div className="text-[11px] text-gray-500">
              Shortcuts: <kbd>Enter</kbd> add row, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>=</kbd> add column,{" "}
              <kbd>Tab</kbd>/<kbd>Shift+Tab</kbd> move, <kbd>↑↓←→</kbd> navigate, <kbd>Del</kbd> clear cell.
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">Click a cell in the mini grid above.</div>
        )}
      </div>

      <div className="text-xs font-semibold mt-3">Header rows</div>
      <Button size="sm" variant="secondary" onClick={addHeaderRow} className="mb-2">
        + Header row
      </Button>
      {table.header?.rows?.map((hr, ri) => (
        <div key={ri} className="border rounded p-2 mb-2">
          <div className="text-[11px] text-gray-500 mb-1">Header row {ri + 1}</div>
          {hr.map((hc, ci) => (
            <div key={ci} className="grid grid-cols-4 gap-2 mb-2">
              <Input
                placeholder="label"
                value={hc.label || ""}
                onChange={(e) => {
                  const header = {
                    rows: table.header!.rows.map((r, rI) =>
                      rI === ri ? r.map((c, cI) => (cI === ci ? { ...c, label: e.target.value } : c)) : r,
                    ),
                  }
                  onChange({ ...table, header })
                }}
              />
              <Input
                placeholder="colSpan"
                type="number"
                value={hc.colSpan || 1}
                onChange={(e) => {
                  const header = {
                    rows: table.header!.rows.map((r, rI) =>
                      rI === ri
                        ? r.map((c, cI) =>
                            cI === ci
                              ? {
                                  ...c,
                                  colSpan: Number(e.target.value) || 1,
                                }
                              : c,
                          )
                        : r,
                    ),
                  }
                  onChange({ ...table, header })
                }}
              />
              <Input
                placeholder="rowSpan"
                type="number"
                value={hc.rowSpan || 1}
                onChange={(e) => {
                  const header = {
                    rows: table.header!.rows.map((r, rI) =>
                      rI === ri
                        ? r.map((c, cI) =>
                            cI === ci
                              ? {
                                  ...c,
                                  rowSpan: Number(e.target.value) || 1,
                                }
                              : c,
                          )
                        : r,
                    ),
                  }
                  onChange({ ...table, header })
                }}
              />
              <Input
                placeholder="align (left|center|right)"
                value={(hc.align as any) || ""}
                onChange={(e) => {
                  const header = {
                    rows: table.header!.rows.map((r, rI) =>
                      rI === ri ? r.map((c, cI) => (cI === ci ? { ...c, align: e.target.value as any } : c)) : r,
                    ),
                  }
                  onChange({ ...table, header })
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
