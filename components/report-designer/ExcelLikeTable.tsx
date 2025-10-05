"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useDesignerStore } from "@/stores/reportDesignerStore"
import type { CellDef, TableSection } from "@/types/report-layout"
import {
  Database,
  Calculator,
  Type,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Plus,
  Minus,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ExcelLikeTableProps = {
  table: TableSection
  sectionIndex: number
  onChange: (table: TableSection) => void
  onCopy?: () => void
  onPaste?: () => void
  onDelete?: () => void
}

export default function ExcelLikeTable({
  table,
  sectionIndex,
  onChange,
  onCopy,
  onPaste,
  onDelete,
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
      updateCell(rowIndex, colIndex, { text: editValue, bind: undefined, compute: undefined })
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
    if (table.rows.length <= 1) return // Keep at least one row
    const rows = table.rows.filter((_, i) => i !== rowIndex)
    onChange({ ...table, rows })
  }

  const addColumnLeft = (colIndex: number) => {
    const rows = table.rows.map((r) => ({
      cells: [...r.cells.slice(0, colIndex), { text: "" }, ...r.cells.slice(colIndex)],
    }))
    const header = table.header
      ? {
          rows: table.header.rows.map((r) => [...r.slice(0, colIndex), { label: "Column" }, ...r.slice(colIndex)]),
        }
      : undefined
    const columnWidths = table.columnWidths
      ? [...table.columnWidths.slice(0, colIndex), 120, ...table.columnWidths.slice(colIndex)]
      : undefined
    onChange({ ...table, rows, header, columnWidths })
  }

  const addColumnRight = (colIndex: number) => {
    const rows = table.rows.map((r) => ({
      cells: [...r.cells.slice(0, colIndex + 1), { text: "" }, ...r.cells.slice(colIndex + 1)],
    }))
    const header = table.header
      ? {
          rows: table.header.rows.map((r) => [
            ...r.slice(0, colIndex + 1),
            { label: "Column" },
            ...r.slice(colIndex + 1),
          ]),
        }
      : undefined
    const columnWidths = table.columnWidths
      ? [...table.columnWidths.slice(0, colIndex + 1), 120, ...table.columnWidths.slice(colIndex + 1)]
      : undefined
    onChange({ ...table, rows, header, columnWidths })
  }

  const deleteColumn = (colIndex: number) => {
    if (table.rows[0]?.cells.length <= 1) return // Keep at least one column
    const rows = table.rows.map((r) => ({
      cells: r.cells.filter((_, i) => i !== colIndex),
    }))
    const header = table.header
      ? {
          rows: table.header.rows.map((r) => r.filter((_, i) => i !== colIndex)),
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
  }, [resizingCol, resizeStartX, resizeStartWidth])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || selectedCell.sectionIndex !== sectionIndex) return

    const { rowIndex, colIndex } = selectedCell
    const rowCount = table.rows.length
    const colCount = table.rows[0]?.cells.length || 0

    // Navigation
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
    }
    // Enter to edit
    else if (e.key === "Enter" && !editingCell) {
      e.preventDefault()
      handleCellDoubleClick(rowIndex, colIndex)
    }
    // Delete to clear
    else if ((e.key === "Delete" || e.key === "Backspace") && !editingCell) {
      e.preventDefault()
      updateCell(rowIndex, colIndex, { text: "", bind: undefined, compute: undefined })
    }
    // Copy
    else if (e.ctrlKey && e.key === "c" && !editingCell) {
      e.preventDefault()
      onCopy?.()
    }
    // Paste
    else if (e.ctrlKey && e.key === "v" && !editingCell) {
      e.preventDefault()
      onPaste?.()
    }
  }

  const getCellIcon = (cell: CellDef) => {
    if (cell.bind) return <Database className="h-3 w-3 text-blue-600" />
    if (cell.compute) return <Calculator className="h-3 w-3 text-purple-600" />
    if (cell.text) return <Type className="h-3 w-3 text-gray-400" />
    return null
  }

  const getCellDisplay = (cell: CellDef) => {
    if (cell.bind) return cell.bind
    if (cell.compute) return cell.compute
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

  return (
    <TooltipProvider>
      <div className="border border-gray-300 rounded overflow-hidden" onKeyDown={handleKeyDown} tabIndex={0}>
        <div className="bg-gray-50 border-b px-2 py-1 flex items-center gap-1 text-xs">
          <span className="text-gray-600 font-medium">Table Controls:</span>
          {selectedCell?.sectionIndex === sectionIndex && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => addRowAbove(selectedCell.rowIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Row Above
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add row above selected cell</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => addRowBelow(selectedCell.rowIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Row Below
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add row below selected cell</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => deleteRow(selectedCell.rowIndex)}
                    disabled={table.rows.length <= 1}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Delete Row
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selected row</TooltipContent>
              </Tooltip>
              <div className="h-4 w-px bg-gray-300 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => addColumnLeft(selectedCell.colIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Col Left
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add column to the left</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => addColumnRight(selectedCell.colIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Col Right
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add column to the right</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => deleteColumn(selectedCell.colIndex)}
                    disabled={colCount <= 1}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Delete Col
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selected column</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {table.columnWidths?.length && (
              <colgroup>
                {table.columnWidths.map((w, i) => (
                  <col key={i} style={{ width: `${w}px` }} />
                ))}
              </colgroup>
            )}

            {table.header?.rows?.length && (
              <thead className="bg-gray-100">
                {table.header.rows.map((row, ri) => (
                  <tr key={`h-${ri}`}>
                    {row.map((cell, ci) => (
                      <th
                        key={`h-${ri}-${ci}`}
                        colSpan={cell.colSpan || 1}
                        rowSpan={cell.rowSpan || 1}
                        className={cn(
                          "border border-gray-300 px-2 py-2 text-xs font-semibold relative group cursor-pointer",
                          cell.align === "center" && "text-center",
                          cell.align === "right" && "text-right",
                        )}
                        onDoubleClick={() => handleCellDoubleClick(ri, ci, true)}
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
                          <>
                            {cell.label}
                            {ci < row.length - 1 && (
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleResizeStart(e, ci)}
                              />
                            )}
                          </>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
            )}

            {/* Body */}
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={`r-${ri}`}>
                  <td className="bg-gray-50 border border-gray-300 px-2 py-1 text-xs text-gray-500 text-center font-medium w-8">
                    {ri + 1}
                  </td>
                  {row.cells.map((cell, ci) => (
                    <ContextMenu key={`c-${ri}-${ci}`}>
                      <ContextMenuTrigger asChild>
                        <td
                          onClick={() => handleCellClick(ri, ci)}
                          onDoubleClick={() => handleCellDoubleClick(ri, ci)}
                          className={cn(
                            "border border-gray-300 px-2 py-2 text-sm cursor-pointer relative group",
                            isSelected(ri, ci) && "ring-2 ring-blue-500 ring-inset",
                            cell.bind && "bg-blue-50",
                            cell.compute && "bg-purple-50",
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
                            <div className="flex items-center gap-1">
                              {getCellIcon(cell)}
                              <span className="flex-1">{getCellDisplay(cell)}</span>
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
                        <ContextMenuItem onClick={() => deleteRow(ri)} disabled={table.rows.length <= 1}>
                          <Minus className="h-4 w-4 mr-2" />
                          Delete Row
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
                        <ContextMenuItem onClick={() => deleteColumn(ci)} disabled={colCount <= 1}>
                          <Minus className="h-4 w-4 mr-2" />
                          Delete Column
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
    </TooltipProvider>
  )
}
