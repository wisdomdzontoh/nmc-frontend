"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useDesignerStore } from "@/stores/reportDesignerStore"
import type { CellDef, TableSection } from "@/types/report-layout"
import {
  Database,
  Calculator,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Plus,
  Minus,
  GripVertical,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { useRef, useEffect } from "react"

type ExcelLikeTableProps = {
  table: TableSection
  sectionIndex: number
  onChange: (table: TableSection) => void
  onCopy?: () => void
  onPaste?: () => void
  onDelete?: () => void
  onRequestDataElementEdit?: (args: {
    sectionIndex: number
    rowIndex: number
    colIndex: number
    bindCode?: string
  }) => void
}

function getColumnLabel(index: number): string {
  let label = ""
  let num = index
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label
    num = Math.floor(num / 26) - 1
  }
  return label
}

function columnLetterToIndex(letter: string): number {
  let index = 0
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 65 + 1)
  }
  return index - 1
}

function indexToColumnLetter(index: number): string {
  let s = ""
  let n = index + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Adjust A1-style cell references in a formula by row/col delta (Excel-style fill). */
function adjustFormulaReferences(formula: string, rowDelta: number, colDelta: number): string {
  return formula.replace(/\b([A-Z]+)(\d+)\b/gi, (_, letters: string, numStr: string) => {
    const col = columnLetterToIndex(letters.toUpperCase())
    const row = parseInt(numStr, 10) - 1
    const newCol = col + colDelta
    const newRow = row + rowDelta
    if (newRow < 0 || newCol < 0) return `${letters}${numStr}`
    return `${indexToColumnLetter(newCol)}${newRow + 1}`
  })
}

/**
 * Adjusts header rows when a visual column is deleted.
 * This keeps multi-row / merged headers (using colSpan) consistent with the body.
 */
function removeHeaderColumnAtIndex(headerRows: CellDef[][], colIndexToDelete: number): CellDef[][] {
  return headerRows.map((row) => {
    const newRow: CellDef[] = []
    let currentCol = 0

    for (const cell of row) {
      const span = cell.colSpan ?? 1
      const start = currentCol
      const end = currentCol + span - 1

      if (colIndexToDelete < start || colIndexToDelete > end) {
        // Column lies completely outside this cell's span
        newRow.push(cell)
      } else {
        // Column is inside this cell's span
        if (span > 1) {
          // Shrink the span by one, so the merged header still covers
          // the remaining columns without shifting neighbours.
          const newSpan = span - 1
          const updated: CellDef = { ...cell }
          if (newSpan > 1) {
            updated.colSpan = newSpan
          } else {
            // span of 1 is the default; drop the property to avoid clutter
            delete updated.colSpan
          }
          newRow.push(updated)
        }
        // If span === 1, the deleted column exactly matches this header cell;
        // we drop the cell entirely and do not push it into newRow.
      }

      currentCol += span
    }

    return newRow
  })
}

export default function ExcelLikeTable({
  table,
  sectionIndex,
  onChange,
  onCopy,
  onPaste,
  onDelete,
  onRequestDataElementEdit,
}: ExcelLikeTableProps) {
  const { selectedCell, setSelectedCell, copiedCell } = useDesignerStore()
  const [editingCell, setEditingCell] = React.useState<{
    rowIndex: number
    colIndex: number
    isHeader?: boolean
  } | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [resizingCol, setResizingCol] = React.useState<number | null>(null)
  const [resizeStartX, setResizeStartX] = React.useState(0)
  const [resizeStartWidth, setResizeStartWidth] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [highlightCol, setHighlightCol] = React.useState<number | null>(null)
  const [draggedRow, setDraggedRow] = React.useState<number | null>(null)
  const [dragOverRow, setDragOverRow] = React.useState<number | null>(null)

  const scrollToColumn = (colIndex: number) => {
    if (!scrollRef.current) return
    const th = scrollRef.current.querySelector(`th[data-col-index="${colIndex}"]`)
    if (th && th instanceof HTMLElement) {
      th.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    }
  }

  const isSelected = (rowIndex: number, colIndex: number) => {
    return (
      selectedCell?.sectionIndex === sectionIndex &&
      selectedCell?.rowIndex === rowIndex &&
      selectedCell?.colIndex === colIndex
    )
  }

  const isEditing = (rowIndex: number, colIndex: number, isHeader = false) => {
    return (
      editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex && editingCell?.isHeader === isHeader
    )
  }

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ sectionIndex, rowIndex, colIndex })
    setEditingCell(null)
  }

  const handleCellDoubleClick = (rowIndex: number, colIndex: number, isHeader = false) => {
    if (isHeader) {
      const cell = table.header?.rows[rowIndex]?.[colIndex]
      if (!cell) return
      setEditingCell({ rowIndex, colIndex, isHeader: true })
      setEditValue(cell.label || "")
    } else {
      const cell = table.rows[rowIndex]?.cells[colIndex]
      if (!cell) return
      setEditingCell({ rowIndex, colIndex, isHeader: false })
      setEditValue(cell.text || cell.bind || cell.compute || "")
    }
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleEditComplete = () => {
    if (!editingCell) return

    const { rowIndex, colIndex, isHeader } = editingCell
    if (isHeader) {
      updateHeaderCell(rowIndex, colIndex, { label: editValue })
    } else {
      if (editValue.startsWith("=")) {
        // Remove the = prefix and store as compute
        updateCell(rowIndex, colIndex, { compute: editValue.slice(1), text: undefined, bind: undefined })
      } else if (editValue.startsWith("remark.") || (editValue.includes(".") && !editValue.includes(" "))) {
        // Looks like a data binding path (including remarks fields)
        updateCell(rowIndex, colIndex, { bind: editValue, text: undefined, compute: undefined })
      } else {
        // Plain text
        updateCell(rowIndex, colIndex, { text: editValue, bind: undefined, compute: undefined })
      }
    }
    setEditingCell(null)
  }

  const updateHeaderCell = (rowIndex: number, colIndex: number, patch: Partial<CellDef>) => {
    if (!table.header) return
    const rows = table.header.rows.map((r, ri) =>
      ri === rowIndex ? r.map((c, ci) => (ci === colIndex ? { ...c, ...patch } : c)) : r,
    )
    onChange({ ...table, header: { rows } })
  }

  const updateCell = (rowIndex: number, colIndex: number, patch: Partial<CellDef>) => {
    const rows = table.rows.map((r, ri) =>
      ri === rowIndex
        ? {
            cells: r.cells.map((c, ci) => (ci === colIndex ? { ...c, ...patch } : c)),
          }
        : r,
    )
    onChange({ ...table, rows })
  }

  const addRowAbove = (rowIndex: number) => {
    const colCount = table.rows[0]?.cells.length || 4
    const newRow = {
      cells: Array(colCount)
        .fill(null)
        .map(() => ({ text: "" })),
    }
    const rows = [...table.rows.slice(0, rowIndex), newRow, ...table.rows.slice(rowIndex)]
    onChange({ ...table, rows })
  }

  const addRowBelow = (rowIndex: number) => {
    const colCount = table.rows[0]?.cells.length || 4
    const newRow = {
      cells: Array(colCount)
        .fill(null)
        .map(() => ({ text: "" })),
    }
    const rows = [...table.rows.slice(0, rowIndex + 1), newRow, ...table.rows.slice(rowIndex + 1)]
    onChange({ ...table, rows })
  }

  const deleteRow = (rowIndex: number) => {
    if (table.rows.length <= 1) return
    const rows = table.rows.filter((_, i) => i !== rowIndex)
    onChange({ ...table, rows })
  }

  const addColumnLeft = (colIndex: number) => {
    const rows = table.rows.map((r) => ({
      cells: [...r.cells.slice(0, colIndex), { text: "" }, ...r.cells.slice(colIndex)],
    }))
    const header = table.header
      ? {
          rows: table.header.rows.map((r) => [...r.slice(0, colIndex), { label: "" }, ...r.slice(colIndex)]),
        }
      : undefined

    const currentWidths = table.columnWidths || Array(table.rows[0]?.cells.length || 0).fill(150)
    const columnWidths = [...currentWidths.slice(0, colIndex), 150, ...currentWidths.slice(colIndex)]

    onChange({ ...table, rows, header, columnWidths })
    setTimeout(() => {
      scrollToColumn(colIndex)
      setHighlightCol(colIndex)
    }, 50)
  }

  const addColumnRight = (colIndex: number) => {
    const rows = table.rows.map((r) => ({
      cells: [...r.cells.slice(0, colIndex + 1), { text: "" }, ...r.cells.slice(colIndex + 1)],
    }))
    const header = table.header
      ? {
          rows: table.header.rows.map((r) => [...r.slice(0, colIndex + 1), { label: "" }, ...r.slice(colIndex + 1)]),
        }
      : undefined

    const currentWidths = table.columnWidths || Array(table.rows[0]?.cells.length || 0).fill(150)
    const columnWidths = [...currentWidths.slice(0, colIndex + 1), 150, ...currentWidths.slice(colIndex + 1)]

    onChange({ ...table, rows, header, columnWidths })
    setTimeout(() => {
      scrollToColumn(colIndex + 1)
      setHighlightCol(colIndex + 1)
    }, 50)
  }

  const deleteColumn = (colIndex: number) => {
    if (table.rows[0]?.cells.length <= 1) return
    const rows = table.rows.map((r) => ({
      cells: r.cells.filter((_, i) => i !== colIndex),
    }))
    const header = table.header
      ? {
          // Adjust header rows taking colSpan into account so that
          // deleting a single visual column only shrinks the appropriate
          // merged header cells instead of shifting everything left.
          rows: removeHeaderColumnAtIndex(table.header.rows, colIndex),
        }
      : undefined
    const columnWidths = table.columnWidths?.filter((_, i) => i !== colIndex)
    onChange({ ...table, rows, header, columnWidths })
  }

  const handleResizeStart = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault()
    setResizingCol(colIndex)
    setResizeStartX(e.clientX)
    setResizeStartWidth(table.columnWidths?.[colIndex] || 120)
  }

  React.useEffect(() => {
    if (resizingCol === null) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX
      const newWidth = Math.max(50, resizeStartWidth + diff)
      const columnWidths = [...(table.columnWidths || [])]
      columnWidths[resizingCol] = newWidth
      onChange({ ...table, columnWidths })
    }

    const handleMouseUp = () => {
      setResizingCol(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizingCol, resizeStartX, resizeStartWidth, onChange, table])

  useEffect(() => {
    if (highlightCol !== null) {
      const timeout = setTimeout(() => setHighlightCol(null), 1200)
      return () => clearTimeout(timeout)
    }
  }, [highlightCol])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) return

    const { rowIndex, colIndex } = selectedCell
    const rowCount = table.rows.length
    const colCount = table.rows[0]?.cells.length || 0

    if (e.key === "ArrowUp" && rowIndex > 0) {
      e.preventDefault()
      setSelectedCell({ sectionIndex, rowIndex: rowIndex - 1, colIndex })
    } else if (e.key === "ArrowDown" && rowIndex < rowCount - 1) {
      e.preventDefault()
      setSelectedCell({ sectionIndex, rowIndex: rowIndex + 1, colIndex })
    } else if (e.key === "ArrowLeft" && colIndex > 0) {
      e.preventDefault()
      setSelectedCell({ sectionIndex, rowIndex, colIndex: colIndex - 1 })
    } else if (e.key === "ArrowRight" && colIndex < colCount - 1) {
      e.preventDefault()
      setSelectedCell({ sectionIndex, rowIndex, colIndex: colIndex + 1 })
    } else if (e.key === "Enter" && !editingCell) {
      e.preventDefault()
      handleCellDoubleClick(rowIndex, colIndex)
    } else if ((e.key === "Delete" || e.key === "Backspace") && !editingCell) {
      e.preventDefault()
      updateCell(rowIndex, colIndex, { text: "", bind: undefined, compute: undefined })
    } else if (e.ctrlKey && e.key === "c" && !editingCell) {
      e.preventDefault()
      onCopy?.()
    } else if (e.ctrlKey && e.key === "v" && !editingCell) {
      e.preventDefault()
      onPaste?.()
    }
  }

  const getCellIcon = (cell: CellDef) => {
    if (cell.bind) return <Database className="h-3 w-3 text-blue-600" />
    if (cell.compute) return <Calculator className="h-3 w-3 text-purple-600" />
    return null
  }

  const getCellDisplay = (cell: CellDef) => {
    if (cell.bind) return cell.bind
    if (cell.compute) return `=${cell.compute}`
    return cell.text || ""
  }

  const getCellStyle = (cell: CellDef) => {
    return {
      backgroundColor: cell.backgroundColor,
      color: cell.textColor,
      fontWeight: cell.bold ? "bold" : "normal",
      textAlign: cell.align || "left",
    }
  }

  const colCount = table.rows[0]?.cells.length || 0

  const reorderRows = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const rows = [...table.rows]
    const [moved] = rows.splice(fromIndex, 1)
    rows.splice(toIndex, 0, moved)

    onChange({ ...table, rows })

    // Keep the current selection attached to the same physical row
    if (selectedCell && selectedCell.sectionIndex === sectionIndex) {
      const { rowIndex, colIndex } = selectedCell
      let newRowIndex = rowIndex

      if (rowIndex === fromIndex) {
        newRowIndex = toIndex
      } else if (fromIndex < toIndex && rowIndex > fromIndex && rowIndex <= toIndex) {
        newRowIndex = rowIndex - 1
      } else if (fromIndex > toIndex && rowIndex >= toIndex && rowIndex < fromIndex) {
        newRowIndex = rowIndex + 1
      }

      if (newRowIndex !== rowIndex) {
        setSelectedCell({ sectionIndex, rowIndex: newRowIndex, colIndex })
      }
    }
  }

  const handleRowDragStart = (e: React.DragEvent, rowIndex: number) => {
    e.dataTransfer.setData("text/plain", String(rowIndex))
    e.dataTransfer.effectAllowed = "move"
    setDraggedRow(rowIndex)
  }

  const handleRowDragOver = (e: React.DragEvent, rowIndex: number) => {
    if (draggedRow === null || draggedRow === rowIndex) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverRow(rowIndex)
  }

  const handleRowDrop = (e: React.DragEvent, rowIndex: number) => {
    e.preventDefault()
    let fromIndex = draggedRow
    if (fromIndex === null) {
      const raw = e.dataTransfer.getData("text/plain")
      const parsed = Number.parseInt(raw, 10)
      fromIndex = Number.isFinite(parsed) ? parsed : null
    }
    if (fromIndex === null || fromIndex === rowIndex) {
      setDraggedRow(null)
      setDragOverRow(null)
      return
    }
    reorderRows(fromIndex, rowIndex)
    setDraggedRow(null)
    setDragOverRow(null)
  }

  const handleRowDragEnd = () => {
    setDraggedRow(null)
    setDragOverRow(null)
  }

  const FORMULA_FILL_TYPE = "application/x-report-formula-fill"

  const fillFormulaRange = (
    sourceRow: number,
    sourceCol: number,
    targetRow: number,
    targetCol: number,
    formula: string,
  ) => {
    const minRow = Math.min(sourceRow, targetRow)
    const maxRow = Math.max(sourceRow, targetRow)
    const minCol = Math.min(sourceCol, targetCol)
    const maxCol = Math.max(sourceCol, targetCol)

    const rows = table.rows.map((r, ri) => ({
      cells: r.cells.map((c, ci) => {
        if (ri >= minRow && ri <= maxRow && ci >= minCol && ci <= maxCol) {
          const rowDelta = ri - sourceRow
          const colDelta = ci - sourceCol
          const adjusted = adjustFormulaReferences(formula, rowDelta, colDelta)
          return { ...c, compute: adjusted, text: undefined, bind: undefined }
        }
        return c
      }),
    }))
    onChange({ ...table, rows })
  }

  const handleDrop = (e: React.DragEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault()
    const formulaFillRaw = e.dataTransfer.getData(FORMULA_FILL_TYPE)
    if (formulaFillRaw) {
      try {
        const { sourceRow, sourceCol, formula } = JSON.parse(formulaFillRaw) as {
          sourceRow: number
          sourceCol: number
          formula: string
        }
        if (typeof sourceRow === "number" && typeof sourceCol === "number" && typeof formula === "string") {
          fillFormulaRange(sourceRow, sourceCol, rowIndex, colIndex, formula)
        }
      } catch (err) {
        console.error("Failed to parse formula fill data", err)
      }
      return
    }
    try {
      const data = e.dataTransfer.getData("application/json")
      if (data) {
        const element = JSON.parse(data)
        updateCell(rowIndex, colIndex, { bind: element.code, text: undefined, compute: undefined })
      }
    } catch (err) {
      console.error("Failed to parse dropped data", err)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const hasFormulaFill = e.dataTransfer.types.includes(FORMULA_FILL_TYPE)
    e.dataTransfer.dropEffect = hasFormulaFill ? "copy" : "copy"
  }

  const handleFormulaFillStart = (e: React.DragEvent, rowIndex: number, colIndex: number, formula: string) => {
    e.dataTransfer.setData(FORMULA_FILL_TYPE, JSON.stringify({ sourceRow: rowIndex, sourceCol: colIndex, formula }))
    e.dataTransfer.effectAllowed = "copy"
    e.stopPropagation()
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="overflow-x-auto" ref={scrollRef}>
        <table className="w-full border-collapse">
          <colgroup>
            <col style={{ width: "40px" }} />
            {Array.from({ length: colCount }).map((_, i) => (
              <col
                key={i}
                style={{
                  width: `${
                    typeof table.columnWidths?.[i] === "number" && table.columnWidths[i] > 0
                      ? table.columnWidths[i]
                      : 150
                  }px`,
                }}
              />
            ))}
          </colgroup>

          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 w-10 h-8 bg-gray-200" />
              {Array.from({ length: colCount }).map((_, i) => (
                <ContextMenu key={i}>
                  <ContextMenuTrigger asChild>
                    <th
                      data-col-index={i}
                      className={cn(
                        "border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 relative group cursor-pointer",
                        highlightCol === i && "bg-yellow-200 transition-colors",
                      )}
                    >
                      {getColumnLabel(i)}
                      {i < colCount - 1 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleResizeStart(e, i)}
                        />
                      )}
                    </th>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => addColumnLeft(i)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Insert Column Left
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => addColumnRight(i)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Insert Column Right
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => deleteColumn(i)} disabled={colCount <= 1}>
                      <Minus className="h-4 w-4 mr-2" />
                      Delete Column
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </tr>

            {table.header?.rows?.map((row, ri) => (
              <tr key={`h-${ri}`} className="bg-amber-50">
                <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500 text-center font-medium bg-gray-100">
                  H{ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <th
                    key={`h-${ri}-${ci}`}
                    colSpan={cell.colSpan || 1}
                    rowSpan={cell.rowSpan || 1}
                    onDoubleClick={() => handleCellDoubleClick(ri, ci, true)}
                    className={cn(
                      "border border-gray-300 px-2 py-2 text-xs font-semibold cursor-pointer hover:bg-amber-100 transition-colors",
                      cell.align === "center" && "text-center",
                      cell.align === "right" && "text-right",
                    )}
                  >
                    {isEditing(ri, ci, true) ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditComplete}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleEditComplete()
                          } else if (e.key === "Escape") {
                            setEditingCell(null)
                          }
                        }}
                        className="h-6 px-1 text-xs font-semibold"
                      />
                    ) : (
                      cell.label
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.rows.map((row, ri) => (
              <tr
                key={`r-${ri}`}
                draggable
                onDragStart={(e) => handleRowDragStart(e, ri)}
                onDragOver={(e) => handleRowDragOver(e, ri)}
                onDrop={(e) => handleRowDrop(e, ri)}
                onDragEnd={handleRowDragEnd}
                className={cn(
                  dragOverRow === ri && "outline outline-2 outline-blue-400",
                  draggedRow === ri && "opacity-60",
                )}
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <td className="bg-gray-100 border border-gray-300 px-2 py-1 text-xs text-gray-700 text-center font-medium w-10 cursor-move hover:bg-gray-200 transition-colors select-none">
                      <div className="flex items-center justify-center gap-1">
                        <GripVertical className="h-3 w-3 text-gray-500" />
                        <span>{ri + 1}</span>
                      </div>
                    </td>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => addRowAbove(ri)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Insert Row Above
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => addRowBelow(ri)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Insert Row Below
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => deleteRow(ri)} disabled={table.rows.length <= 1}>
                      <Minus className="h-4 w-4 mr-2" />
                      Delete Row
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                {row.cells.map((cell, ci) => (
                  <ContextMenu key={`c-${ri}-${ci}`}>
                    <ContextMenuTrigger asChild>
                      <td
                        onClick={() => handleCellClick(ri, ci)}
                        onDoubleClick={() => handleCellDoubleClick(ri, ci)}
                        onDrop={(e) => handleDrop(e, ri, ci)}
                        onDragOver={handleDragOver}
                        className={cn(
                          "border border-gray-300 px-2 py-2 text-sm cursor-pointer relative group transition-colors",
                          isSelected(ri, ci) && "ring-2 ring-blue-500 ring-inset bg-blue-50",
                          !isSelected(ri, ci) && "hover:bg-gray-50",
                          cell.bind && "bg-blue-50/50",
                          cell.compute && "bg-purple-50/50",
                        )}
                        style={getCellStyle(cell)}
                      >
                        {isEditing(ri, ci) ? (
                          <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditComplete}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleEditComplete()
                              } else if (e.key === "Escape") {
                                setEditingCell(null)
                              }
                            }}
                            className="h-6 px-1 text-sm"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getCellIcon(cell)}
                            <span className="flex-1 min-w-0 truncate">{getCellDisplay(cell)}</span>
                            {cell.compute && (
                              <div
                                draggable
                                onDragStart={(e) => handleFormulaFillStart(e, ri, ci, cell.compute!)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="absolute bottom-1 right-1 w-3 h-3 rounded-sm bg-purple-500 cursor-grab active:cursor-grabbing opacity-80 hover:opacity-100 shrink-0 border border-purple-600"
                                title="Drag to fill formula into other rows/cells (references adjust like Excel)"
                              />
                            )}
                            {onRequestDataElementEdit && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRequestDataElementEdit({
                                    sectionIndex,
                                    rowIndex: ri,
                                    colIndex: ci,
                                    bindCode: cell.bind,
                                  })
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 text-xs font-semibold px-1.5 py-0.5 border border-blue-200 rounded"
                                title={cell.bind ? "Edit data element" : "Create & bind data element"}
                              >
                                +
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleCellDoubleClick(ri, ci)}>Edit Cell</ContextMenuItem>
                      <ContextMenuItem onClick={onCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </ContextMenuItem>
                      <ContextMenuItem onClick={onPaste} disabled={!copiedCell}>
                        Paste
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => addRowAbove(ri)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Insert Row Above
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => addRowBelow(ri)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Insert Row Below
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => addColumnLeft(ci)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Insert Column Left
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => addColumnRight(ci)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Insert Column Right
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => updateCell(ri, ci, { align: "left" })}>
                        <AlignLeft className="h-4 w-4 mr-2" />
                        Align Left
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => updateCell(ri, ci, { align: "center" })}>
                        <AlignCenter className="h-4 w-4 mr-2" />
                        Align Center
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => updateCell(ri, ci, { align: "right" })}>
                        <AlignRight className="h-4 w-4 mr-2" />
                        Align Right
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => updateCell(ri, ci, { bold: !cell.bold })}>
                        <Bold className="h-4 w-4 mr-2" />
                        Toggle Bold
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={onDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Cell
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
