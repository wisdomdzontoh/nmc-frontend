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
import { Loader2 } from "lucide-react"
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

  // Check if user is staff or superuser
  const isSuperuser = (djangoUser as any)?.is_superuser
  const isStaff = (djangoUser as any)?.is_staff

  // Show error if user is not staff or superuser
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

  const isNew = !params?.id || params.id === "new"

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

  const { selectedCell, setSelectedCell, copiedCell, setCopiedCell, pushHistory, undo, redo, canUndo, canRedo } =
    useDesignerStore()

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

  const addHeading = () => {
    updateSchema({
      ...schema,
      sections: [...schema.sections, { type: "heading", text: "SECTION TITLE" } as HeadingSection],
    })
  }

  const addTable = () => {
    const t: TableSection = {
      type: "table",
      id: `tbl_${Date.now()}`,
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
    updateSchema({ ...schema, sections: [...schema.sections, t] })
  }

  const updateSectionAt = (index: number, next: any) => {
    const copy = [...schema.sections]
    copy[index] = next
    updateSchema({ ...schema, sections: copy })
  }

  const deleteSection = (index: number) => {
    const copy = schema.sections.filter((_, i) => i !== index)
    updateSchema({ ...schema, sections: copy })
    setSelectedCell(null)
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
    } catch (error) {
      toast.error("Error saving layout")
    }
  }

  const handlePublish = async () => {
    if (!layoutId) return
    try {
      await publishLayout(layoutId)
      toast.success("Layout published")
    } catch (error) {
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
  }, [schema, name, code, reportTypeId, layoutId])

  const cellReference = selectedCell ? getCellReference(selectedCell.rowIndex, selectedCell.colIndex) : ""

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toaster />

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

      <div className="flex-1 flex overflow-hidden">
        {leftPanelOpen && (
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

            <div className="flex-1 overflow-auto p-4">
              <div className="text-sm font-semibold mb-3 text-gray-700">Shortcuts</div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Undo</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+Z</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Redo</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+Y</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Copy</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+C</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Paste</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+V</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Save</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Edit cell</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Clear</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Del</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Navigate</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">↑↓←→</kbd>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <strong>Tip:</strong> Right-click on row numbers or column headers to insert/delete rows and columns
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!leftPanelOpen && (
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

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
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

            <TabsContent value="design" className="flex-1 overflow-auto p-6 mt-0">
              <div className="max-w-6xl mx-auto space-y-6">
                {schema.sections.map((sec, idx) => {
                  if (sec.type === "heading") {
                    const h = sec as HeadingSection
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-4 border-2 border-gray-200 group relative shadow-sm"
                      >
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                          onClick={() => deleteSection(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )
                  }

                  const t = sec as TableSection
                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden group relative shadow-sm"
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 bg-white shadow-sm"
                        onClick={() => deleteSection(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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

                {schema.sections.length === 0 && (
                  <div className="text-center py-20 text-gray-500">
                    <TableIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No elements yet</p>
                    <p className="text-sm">Add a heading or table from the left sidebar to get started</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-auto p-6 mt-0 bg-gray-100">
              <div className="max-w-6xl mx-auto">
                <Renderer layout={schema} data={{}} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {rightPanelOpen && (
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
            <div className="flex-1 overflow-hidden">
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
        )}

        {!rightPanelOpen && (
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
