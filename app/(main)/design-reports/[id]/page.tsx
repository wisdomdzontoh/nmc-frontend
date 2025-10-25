"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ExcelLikeTable from "@/components/report-designer/ExcelLikeTable"
import CellFormatToolbar from "@/components/report-designer/CellFormatToolbar"
import FormulaBar from "@/components/report-designer/FormulaBar"
import DataElementPalette, { type DataElement } from "@/components/report-designer/DataElementPalette"
import Renderer from "@/components/report-designer/Renderer"
import api from "@/lib/api"
import { createLayout, updateLayout, publishLayout } from "@/lib/reportLayouts"
import type { LayoutSchema, HeadingSection, TableSection, CellDef } from "@/types/report-layout"
import { useDesignerStore } from "@/stores/reportDesignerStore"
import {
  Undo2,
  Redo2,
  Save,
  Upload,
  TableIcon,
  Heading1,
  Eye,
  Code,
  Trash2,
  FileSpreadsheet,
  ChevronLeft,
  PanelLeftClose,
  PanelRightClose,
  Copy,
  GripVertical,
} from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

type ReportType = { id: number; name: string; code: string; data_elements?: DataElement[] }

const DEFAULT_SCHEMA: LayoutSchema = { title: "", sections: [] }

function getCellReference(rowIndex: number, colIndex: number): string {
  let col = ""
  let num = colIndex
  while (num >= 0) {
    col = String.fromCharCode(65 + (num % 26)) + col
    num = Math.floor(num / 26) - 1
  }
  return `${col}${rowIndex + 1}`
}

export default function ReportDesignerPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }

  const [layoutId, setLayoutId] = useState<number | undefined>()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [reportTypeId, setReportTypeId] = useState<number | undefined>()
  const [schema, setSchema] = useState<LayoutSchema>(DEFAULT_SCHEMA)
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [rtElements, setRtElements] = useState<DataElement[]>([])
  const [activeTab, setActiveTab] = useState("design")
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const { selectedCell, setSelectedCell, copiedCell, setCopiedCell, pushHistory, undo, redo, canUndo, canRedo } =
    useDesignerStore()

  const isNew = !params?.id || params.id === "new"

  useEffect(() => {
    ;(async () => {
      const rts = await api.get("/metadata/report-types/").then((r) => r.data)
      setReportTypes(rts)
      if (!isNew) {
        const l = await api.get(`/reporting/report-layouts/${params.id}/`).then((r) => r.data)
        setLayoutId(l.id)
        setName(l.name)
        setCode(l.code)
        setReportTypeId(l.report_type || undefined)
        setSchema(l.schema || DEFAULT_SCHEMA)
        pushHistory(l.schema || DEFAULT_SCHEMA)
      } else {
        pushHistory(DEFAULT_SCHEMA)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, params?.id])

  useEffect(() => {
    if (!reportTypeId) {
      setRtElements([])
      return
    }
    const rt = reportTypes.find((rt) => rt.id === reportTypeId)
    if (rt?.data_elements?.length) {
      setRtElements(rt.data_elements)
    } else {
      api.get(`/metadata/report-types/${reportTypeId}/`).then((r) => setRtElements(r.data?.data_elements || []))
    }
  }, [reportTypeId, reportTypes])

  const updateSchema = (newSchema: LayoutSchema) => {
    setSchema(newSchema)
    pushHistory(newSchema)
  }

  const handleUndo = () => {
    const prevSchema = undo()
    if (prevSchema) setSchema(prevSchema)
  }

  const handleRedo = () => {
    const nextSchema = redo()
    if (nextSchema) setSchema(nextSchema)
  }

  const scrollToSection = (id: string | number) => {
    // find element with id `section-${id}` and scroll it into view inside the nearest scrollable ancestor
    const el = document.getElementById(`section-${id}`)
    if (el) {
      // scrollIntoView finds the nearest scrollable container automatically in modern browsers
      el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }

  const addHeading = () => {
    // give headings an id so we can scroll to them
    const hdrId = `hdr_${Date.now()}`
    const heading: HeadingSection = { type: "heading", text: "SECTION TITLE" }
    const newSchema = { ...schema, sections: [...schema.sections, heading] }
    updateSchema(newSchema)

    // allow DOM to update before attempting scroll
    setTimeout(() => scrollToSection(hdrId), 80)
  }

  const addTable = () => {
    const tId = `tbl_${Date.now()}`
    const t: TableSection = {
      type: "table",
      id: tId,
      columnWidths: [200, 200, 200, 200],
      header: {
        rows: [[{ label: "Column A" }, { label: "Column B" }, { label: "Column C" }, { label: "Column D" }]],
      },
      rows: [
        { cells: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }] },
        { cells: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }] },
        { cells: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }] },
      ],
    }
    const newSchema = { ...schema, sections: [...schema.sections, t] }
    updateSchema(newSchema)

    // allow DOM to update before attempting scroll
    setTimeout(() => scrollToSection(tId), 80)
  }

  const updateSectionAt = (index: number, next: TableSection | HeadingSection) => {
    const copy = [...schema.sections]
    copy[index] = next
    updateSchema({ ...schema, sections: copy })
  }

  const deleteSection = (index: number) => {
    const copy = schema.sections.filter((_, i) => i !== index)
    updateSchema({ ...schema, sections: copy })
    setSelectedCell(null)
  }

  const duplicateSection = (index: number) => {
    const section = schema.sections[index]
    if (!section) return

    let duplicatedSection: TableSection | HeadingSection

    if (section.type === "heading") {
      const h = section as HeadingSection
      duplicatedSection = { ...h, text: `${h.text} (Copy)` }
    } else {
      const t = section as TableSection
      duplicatedSection = {
        ...t,
        id: `tbl_${Date.now()}`,
        header: t.header ? {
          rows: t.header.rows.map(row => 
            row.map(cell => ({ ...cell, label: cell.label ? `${cell.label} (Copy)` : cell.label }))
          )
        } : undefined,
        rows: t.rows.map(row => ({
          cells: row.cells.map(cell => ({ ...cell, text: cell.text ? `${cell.text} (Copy)` : cell.text }))
        }))
      }
    }

    const newSections = [...schema.sections]
    newSections.splice(index + 1, 0, duplicatedSection)
    updateSchema({ ...schema, sections: newSections })
    toast.success("Section duplicated")
  }

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    
    const newSections = [...schema.sections]
    const [movedSection] = newSections.splice(fromIndex, 1)
    newSections.splice(toIndex, 0, movedSection)
    updateSchema({ ...schema, sections: newSections })
  }

  const getSelectedCell = (): CellDef | null => {
    if (!selectedCell) return null
    const sec = schema.sections[selectedCell.sectionIndex] as TableSection
    if (!sec || sec.type !== "table") return null
    return sec.rows[selectedCell.rowIndex]?.cells[selectedCell.colIndex] ?? null
  }

  const updateSelectedCell = (patch: Partial<CellDef>) => {
    if (!selectedCell) return
    const sec = schema.sections[selectedCell.sectionIndex] as TableSection
    if (!sec || sec.type !== "table") return

    const rows = sec.rows.map((r, ri) =>
      ri === selectedCell.rowIndex
        ? {
            cells: r.cells.map((c, ci) => (ci === selectedCell.colIndex ? { ...c, ...patch } : c)),
          }
        : r,
    )
    updateSectionAt(selectedCell.sectionIndex, { ...sec, rows })
  }

  const clearSelectedCell = () => {
    updateSelectedCell({ text: "", bind: undefined, compute: undefined })
  }

  const handleCopy = () => {
    const cell = getSelectedCell()
    if (cell) {
      setCopiedCell(cell)
      toast.success("Cell copied", { description: "Press Ctrl+V to paste" })
    }
  }

  const handlePaste = () => {
    if (copiedCell && selectedCell) {
      updateSelectedCell(copiedCell)
      toast.success("Cell pasted")
    }
  }

  const handleBindElement = (el: DataElement) => {
    if (!selectedCell) {
      toast.error("No cell selected", { description: "Select a cell first, then click + to bind" })
      return
    }
    updateSelectedCell({ bind: el.code, text: undefined, compute: undefined })
    toast.success("Data element bound", { description: `Bound ${el.code} to cell` })
  }

  const handleSave = async () => {
    const payload = { name, code, report_type: reportTypeId || null, schema }
    try {
      if (isNew) {
        const created = await createLayout(payload)
        setLayoutId(created.id)
        router.push(`/design-reports/${created.id}`)
        toast.success("Layout created")
      } else {
        await updateLayout(layoutId!, payload)
        toast.success("Layout saved")
      }
    } catch {
      toast.error("Error saving layout")
    }
  }

  const handlePublish = async () => {
    if (!layoutId) return
    try {
      await publishLayout(layoutId)
      toast.success("Layout published")
    } catch {
      toast.error("Error publishing layout")
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault()
        handleUndo()
      } else if (e.ctrlKey && e.key === "y") {
        e.preventDefault()
        handleRedo()
      } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [schema, name, code, reportTypeId, layoutId]) // eslint-disable-line react-hooks/exhaustive-deps

  const cellReference = selectedCell ? getCellReference(selectedCell.rowIndex, selectedCell.colIndex) : ""

  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)

  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Report Designer</h1>
        <Alert>
          <AlertDescription>
            Report design is only available to staff and administrators. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toaster />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 py-3 flex items-center gap-3 border-b">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/design-reports")}
            className="mr-2"
            title="Back to Reports"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <FileSpreadsheet className="h-5 w-5 text-gray-600" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Report Layout Name"
            className="w-80 font-medium"
          />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-40" />
          <Select
            value={reportTypeId ? String(reportTypeId) : ""}
            onValueChange={(v) => {
              setReportTypeId(Number(v))
              setSelectedCell(null)
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((rt) => (
                <SelectItem key={rt.id} value={String(rt.id)}>
                  {rt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button size="sm" variant="outline" onClick={handleUndo} disabled={!canUndo()} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleRedo} disabled={!canRedo()} title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300" />

          <Button size="sm" variant="outline" onClick={handleSave} title="Save (Ctrl+S)">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={!layoutId}>
            <Upload className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>

        <FormulaBar cell={getSelectedCell()} cellReference={cellReference} onUpdate={updateSelectedCell} />
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel */}
        {leftPanelOpen ? (
          <div className="w-56 bg-white border-r flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700">Insert</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLeftPanelOpen(false)}
                  className="h-6 w-6 p-0"
                  title="Collapse panel"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start h-9 bg-transparent" onClick={addHeading}>
                  <Heading1 className="h-4 w-4 mr-2" />
                  Heading
                </Button>
                <Button variant="outline" className="w-full justify-start h-9 bg-transparent" onClick={addTable}>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 min-h-0">
              <div className="text-sm font-semibold mb-3 text-gray-700">Shortcuts</div>
              <div className="space-y-2 text-xs text-gray-600">
                <div><strong>Ctrl+Z:</strong> Undo</div>
                <div><strong>Ctrl+Y:</strong> Redo</div>
                <div><strong>Ctrl+S:</strong> Save</div>
                <div><strong>Enter:</strong> Add row</div>
                <div><strong>Ctrl+=:</strong> Add column</div>
                <div><strong>Del/Backspace:</strong> Clear cell</div>
                <div><strong>Tab:</strong> Next cell</div>
                <div><strong>Shift+Tab:</strong> Previous cell</div>
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <strong>Tip:</strong> Right-click on row numbers or column headers to insert/delete rows and columns
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <strong>Drag & Drop:</strong> Use the grip handle to reorder sections
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Duplicate:</strong> Click the copy icon to duplicate sections
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-10 bg-white border-r flex items-start justify-center pt-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLeftPanelOpen(true)}
              className="h-8 w-8 p-0"
              title="Expand panel"
            >
              <PanelLeftClose className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}

        {/* Center */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="bg-white border-b px-4">
              <TabsList className="h-10">
                <TabsTrigger value="design" className="gap-2">
                  <Code className="h-4 w-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="design" className="flex-1 overflow-y-auto min-h-0 bg-gray-50 p-6 m-0">
              <div className="max-w-6xl mx-auto space-y-6 pb-24">
                {schema.sections.map((sec, idx: number) => {
                  // ensure each section has an id for scroll target - for tables use true id, for headings synthesize
                  const sectionId = sec.type === "table" ? (sec as TableSection).id : `hdr_${idx}`
                  if (sec.type === "heading") {
                    const h = sec as HeadingSection
                    return (
                      <div
                        id={`section-${sectionId}`}
                        key={sectionId}
                        className={`bg-white rounded-lg p-4 border-2 group relative shadow-sm transition-all ${
                          draggedIndex === idx 
                            ? "border-blue-400 shadow-lg opacity-50" 
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "section", index: idx }))
                          e.dataTransfer.effectAllowed = "move"
                          setDraggedIndex(idx)
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = "move"
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          try {
                            const data = JSON.parse(e.dataTransfer.getData("text/plain"))
                            if (data.type === "section" && data.index !== idx) {
                              moveSection(data.index, idx)
                            }
                          } catch (err) {
                            console.error("Failed to parse drop data", err)
                          }
                          setDraggedIndex(null)
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                          <span className="text-xs text-gray-500 font-medium">HEADING</span>
                        </div>
                        <Input
                          value={h.text}
                          onChange={(e) => {
                            const copy = [...schema.sections]
                            copy[idx] = { ...h, text: e.target.value }
                            updateSchema({ ...schema, sections: copy })
                          }}
                          className="text-lg font-semibold border-0 focus-visible:ring-0 px-0"
                          placeholder="Enter heading text..."
                        />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => duplicateSection(idx)}
                            title="Duplicate section"
                          >
                            <Copy className="h-4 w-4 text-blue-600" />
                          </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                            className="h-8 w-8 p-0"
                          onClick={() => deleteSection(idx)}
                            title="Delete section"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        </div>
                      </div>
                    )
                  }

                  const t = sec as TableSection
                  return (
                    <div
                      id={`section-${sectionId}`}
                      key={sectionId}
                      className={`bg-white rounded-lg border-2 overflow-hidden group relative shadow-sm transition-all ${
                        draggedIndex === idx 
                          ? "border-blue-400 shadow-lg opacity-50" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", JSON.stringify({ type: "section", index: idx }))
                        e.dataTransfer.effectAllowed = "move"
                        setDraggedIndex(idx)
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "move"
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        try {
                          const data = JSON.parse(e.dataTransfer.getData("text/plain"))
                          if (data.type === "section" && data.index !== idx) {
                            moveSection(data.index, idx)
                          }
                        } catch (err) {
                          console.error("Failed to parse drop data", err)
                        }
                        setDraggedIndex(null)
                      }}
                    >
                      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                          <span className="text-xs text-gray-500 font-medium">TABLE</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => duplicateSection(idx)}
                            title="Duplicate section"
                          >
                            <Copy className="h-4 w-4 text-blue-600" />
                          </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                            className="h-8 w-8 p-0"
                        onClick={() => deleteSection(idx)}
                            title="Delete section"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                        </div>
                      </div>

                      <CellFormatToolbar
                        cell={selectedCell?.sectionIndex === idx ? getSelectedCell() : null}
                        onUpdate={updateSelectedCell}
                        onClear={clearSelectedCell}
                      />

                      <div className="p-4">
                        <ExcelLikeTable
                          table={t}
                          sectionIndex={idx}
                          onChange={(next) => updateSectionAt(idx, next)}
                          onCopy={handleCopy}
                          onPaste={handlePaste}
                          onDelete={clearSelectedCell}
                        />
                      </div>
                    </div>
                  )
                })}

                {/* Empty state */}
                {schema.sections.length === 0 && (
                  <div className="text-center py-20 text-gray-500">
                    <TableIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No elements yet</p>
                    <p className="text-sm">Add a heading or table from the left sidebar to get started</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-y-auto min-h-0 bg-gray-100 p-6 m-0">
              <div className="max-w-6xl mx-auto pb-24">
                <Renderer layout={schema} data={{}} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel */}
        {rightPanelOpen ? (
          <div className="w-80 bg-white border-l flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-700">Data Elements</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRightPanelOpen(false)}
                  className="h-6 w-6 p-0"
                  title="Collapse panel"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">Drag to cells or select cell and click +</p>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {reportTypeId ? (
                <DataElementPalette elements={rtElements} onBind={handleBindElement} />
              ) : (
                <div className="p-6 text-sm text-gray-500 text-center">
                  <div className="mb-3 text-gray-400">📊</div>
                  Select a report type above to view available data elements
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-10 bg-white border-l flex items-start justify-center pt-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRightPanelOpen(true)}
              className="h-8 w-8 p-0"
              title="Expand panel"
            >
              <PanelRightClose className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
