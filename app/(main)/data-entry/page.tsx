"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Target,
  Save,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { SectionLoader } from "@/components/ui/PageLoader"
import DataEntryTopBar from "@/components/data-entry/DataEntryTopBar"
import DataEntryForm from "@/components/data-entry/DataEntryForm"
import EnhancedLayoutEntryForm, { type LayoutSchema } from "@/components/data-entry/EnhancedLayoutEntryForm"
import type { ReportType } from "@/components/data-entry/DatasetInlineDropdown"
import type { OrgNode } from "@/components/data-entry/OrgUnitInlineDropdown"
import type { Period } from "@/components/data-entry/PeriodInlineDropdown"
import { ApiClient } from "@/lib/api"
import { exportToExcel } from "@/lib/export-utils"

type ValuesById = Record<string, number | null>
type ValuesByCode = Record<string, number | string | null>

const DATA_ENTRY_SELECTION_KEY = "nmc_data_entry_selection"

type PersistedSelection = {
  datasetId: number
  orgId: number
  period: { id: string; name: string; startDate: string; endDate: string }
}

function findOrgInTree(tree: OrgNode[], id: number): OrgNode | null {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findOrgInTree(node.children, id)
      if (found) return found
    }
  }
  return null
}

// ── Relative time helper ──────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 5) return "just now"
  if (diff < 60) return `${diff}s ago`
  return `${Math.floor(diff / 60)}m ago`
}

// ── Layout schema converter ───────────────────────────────────────────────

function convertLayoutSchema(schema: LayoutSchema): LayoutSchema {
  if (!schema?.sections) return schema
  return {
    ...schema,
    sections: schema.sections.map((section) => {
      if (section.type === "table" && "rows" in section && section.rows) {
        return {
          ...section,
          rows: section.rows.map((row) => ({
            ...row,
            cells: row.cells?.map((cell) => ({
              ...cell,
              bind: cell.bind || undefined,
              text: cell.text || undefined,
              compute: cell.compute || undefined,
            })) || [],
          })),
        }
      }
      return section
    }),
  }
}

// ── Page component ────────────────────────────────────────────────────────

export default function DataEntryPage() {
  const { djangoUser } = useAuth()

  // ── Core form state ──────────────────────────────────────────────────────
  const [loading, setLoading] = React.useState(true)
  const [loadingLayout, setLoadingLayout] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [dataSaved, setDataSaved] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  const [datasets, setDatasets] = React.useState<ReportType[]>([])
  const [editableReportTypes, setEditableReportTypes] = React.useState<ReportType[]>([])
  const [dataset, setDataset] = React.useState<ReportType | null>(null)
  const [orgTree, setOrgTree] = React.useState<OrgNode[]>([])
  const [org, setOrg] = React.useState<OrgNode | null>(null)
  const [period, setPeriod] = React.useState<Period | null>(null)
  const [valuesById, setValuesById] = React.useState<ValuesById>({})
  const [valuesByCode, setValuesByCode] = React.useState<ValuesByCode>({})
  const [layout, setLayout] = React.useState<LayoutSchema | null>(null)
  const [dataElements, setDataElements] = React.useState<Array<{ id: string; code: string; name: string }>>([])
  const [lastSubmittedBy, setLastSubmittedBy] = React.useState<string | null>(null)
  const [lastSubmittedAt, setLastSubmittedAt] = React.useState<string | null>(null)

  // ── Auto-save state ──────────────────────────────────────────────────────
  /** Codes that exist on the server (loaded or last successful auto-save) */
  const [savedCodes, setSavedCodes] = React.useState<Set<string>>(new Set())
  /** Codes changed in this session that have not been persisted yet */
  const [unsavedCodes, setUnsavedCodes] = React.useState<Set<string>>(new Set())
  const [autoSaving, setAutoSaving] = React.useState(false)
  const [lastAutoSaved, setLastAutoSaved] = React.useState<Date | null>(null)
  /** True when local-storage draft was restored after a 404 from the server */
  const [draftRestored, setDraftRestored] = React.useState(false)
  /** Tick used to force the "saved X seconds ago" label to refresh */
  const [, setTick] = React.useState(0)

  // ── Refs (stable references for debounced callbacks) ─────────────────────
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const valuesRef = React.useRef<ValuesByCode>({})
  const datasetRef = React.useRef<ReportType | null>(null)
  const orgRef = React.useRef<OrgNode | null>(null)
  const periodRef = React.useRef<Period | null>(null)
  const codeToIdRef = React.useRef<Record<string, number>>({})
  const canAutoSaveRef = React.useRef(false)

  // ── Sync refs every render ────────────────────────────────────────────────
  valuesRef.current = valuesByCode
  datasetRef.current = dataset
  orgRef.current = org
  periodRef.current = period

  // Refresh "saved X seconds ago" label every 15 seconds
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  // ── Permission checks ────────────────────────────────────────────────────
  const userOrgUnitId = djangoUser?.org_unit ?? null
  const isViewingOwnOrg = userOrgUnitId !== null && org?.id === userOrgUnitId
  const isReportTypeEditable = dataset ? editableReportTypes.some((rt) => rt.id === dataset.id) : false

  const isPeriodLocked = React.useMemo(() => {
    if (!dataset || !period) return false
    const lockDays = dataset.lock_period_days
    if (!lockDays || lockDays === 0) return false
    if (djangoUser?.is_staff || djangoUser?.is_superuser) return false
    try {
      const periodEndDateStr = period.endDate
      if (!periodEndDateStr) return false
      const [year, month, day] = periodEndDateStr.split("-").map(Number)
      const periodEndDate = new Date(year, month - 1, day, 23, 59, 59)
      const lockDate = new Date(periodEndDate)
      lockDate.setDate(lockDate.getDate() + lockDays)
      return new Date() > lockDate
    } catch {
      return false
    }
  }, [dataset, period, djangoUser])

  const isReadOnly = !isViewingOwnOrg || !isReportTypeEditable || isPeriodLocked || org === null
  const canSubmit = !!dataset && !!org && !!period && isViewingOwnOrg && isReportTypeEditable && !isPeriodLocked

  // Update auto-save eligibility ref every render
  canAutoSaveRef.current = canSubmit && !saving

  const canExport = !!dataset && !!period && !!org

  const hasValues = React.useMemo(() => {
    if (layout) return Object.values(valuesByCode).some((v) => v !== null && v !== undefined && v !== "")
    return Object.values(valuesById).some((v) => v !== null && v !== undefined)
  }, [layout, valuesByCode, valuesById])

  // ── Code → ID map ─────────────────────────────────────────────────────────
  const codeToId = React.useMemo(() => {
    const m: Record<string, number> = {}
    dataset?.data_elements?.forEach((de) => (m[de.code] = de.id))
    return m
  }, [dataset?.data_elements])

  // Keep ref in sync after memo
  codeToIdRef.current = codeToId

  // ── Draft helpers ─────────────────────────────────────────────────────────
  const getDraftKey = React.useCallback((): string | null => {
    const d = datasetRef.current
    const o = orgRef.current
    const p = periodRef.current
    if (!d?.id || !o?.id || !p?.startDate) return null
    return `nmc_draft_${d.id}_${o.id}_${p.startDate}`
  }, [])

  const saveDraft = React.useCallback(
    (vals: ValuesByCode) => {
      const key = getDraftKey()
      if (!key) return
      try {
        localStorage.setItem(key, JSON.stringify({ values: vals, ts: Date.now() }))
      } catch {
        /* storage quota */
      }
    },
    [getDraftKey]
  )

  const clearDraft = React.useCallback(() => {
    const key = getDraftKey()
    if (!key) return
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }, [getDraftKey])

  // ── Payload builder (shared between auto-save and submit) ─────────────────
  const buildPayload = React.useCallback(
    (vals: ValuesByCode, c2i: Record<string, number>) => {
      const combined: Record<string, { value: number | null; remark?: string }> = {}
      for (const [code, raw] of Object.entries(vals)) {
        if (code.startsWith("remark.")) {
          const base = code.slice("remark.".length)
          const id = c2i[base]
          if (!id) continue
          const key = String(id)
          combined[key] = combined[key] || { value: null }
          combined[key].remark = (raw as string) ?? ""
        } else {
          const id = c2i[code]
          if (!id) continue
          const key = String(id)
          combined[key] = combined[key] || { value: null }
          combined[key].value = typeof raw === "number" ? raw : null
        }
      }
      return combined
    },
    []
  )

  // ── Auto-save (uses refs — no stale closures) ─────────────────────────────
  const performAutoSave = React.useCallback(async () => {
    const d = datasetRef.current
    const o = orgRef.current
    const p = periodRef.current
    const vals = valuesRef.current
    const c2i = codeToIdRef.current

    if (!d || !o || !p || !canAutoSaveRef.current) return
    if (Object.keys(vals).length === 0) return

    try {
      setAutoSaving(true)
      const payload = buildPayload(vals, c2i)
      await api.post(
        "/reporting/data-entry/",
        { report_type: d.id, org_unit: o.id, reporting_period: p.startDate, values: payload },
        { timeout: 30000 }
      )
      setSavedCodes(new Set(Object.keys(vals)))
      setUnsavedCodes(new Set())
      setDataSaved(true)
      setLastAutoSaved(new Date())
      clearDraft()
    } catch (err) {
      // Silent failure — will retry on next change; localStorage still has the data
      console.error("[AutoSave]", err)
    } finally {
      setAutoSaving(false)
    }
  }, [buildPayload, clearDraft])

  // ── Unsaved-changes guard (browser navigation / tab close) ────────────────
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (unsavedCodes.size > 0 && !autoSaving) {
        e.preventDefault()
        e.returnValue = "You have unsaved changes — are you sure you want to leave?"
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [unsavedCodes, autoSaving])

  // ── Initial data load ─────────────────────────────────────────────────────
  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const [rtRes, editableRes, treeRes, deRes] = await Promise.all([
          ApiClient.getAvailableReportTypes(),
          ApiClient.getAvailableReportTypesForEntry(),
          api.get("/org/tree/"),
          ApiClient.getDataElements(),
        ])
        const processRT = (list: ReportType[]) =>
          list.map((rt) => ({ ...rt, lock_period_days: rt.lock_period_days ?? 60 }))
        setDatasets(processRT(rtRes.data || []))
        setEditableReportTypes(processRT(editableRes.data || []))
        setOrgTree(treeRes.data || [])
        const deData = deRes.data?.results || deRes.data || []
        setDataElements(
          deData.map((de: { id: number; code: string; name: string }) => ({
            id: String(de.id),
            code: de.code,
            name: de.name,
          }))
        )
      } catch (e) {
        console.error("[entry] init error:", e)
        toast.error("Unable to load. Please refresh the page.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ── Restore persisted selection after first load ───────────────────────────
  const hasRestoredSelection = React.useRef(false)
  React.useEffect(() => {
    if (loading || hasRestoredSelection.current) return
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(DATA_ENTRY_SELECTION_KEY) : null
      if (!raw) return
      const parsed = JSON.parse(raw) as PersistedSelection
      if (!parsed?.datasetId || !parsed?.orgId || !parsed?.period?.startDate) return
      hasRestoredSelection.current = true

      const d = datasets.find((ds) => ds.id === parsed.datasetId)
      const o = findOrgInTree(orgTree, parsed.orgId)
      if (d) setDataset(d)
      if (o) setOrg(o)
      if (parsed.period?.name && parsed.period?.endDate) {
        setPeriod({
          id: parsed.period.id,
          name: parsed.period.name,
          startDate: parsed.period.startDate,
          endDate: parsed.period.endDate,
        })
      }
    } catch {
      // ignore invalid or missing stored selection
    }
  }, [loading, datasets, orgTree])

  // ── Persist selection when user changes dataset, org, or period ────────────
  React.useEffect(() => {
    if (!dataset || !org || !period) return
    try {
      const payload: PersistedSelection = {
        datasetId: dataset.id,
        orgId: org.id,
        period: {
          id: period.id,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
        },
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DATA_ENTRY_SELECTION_KEY, JSON.stringify(payload))
      }
    } catch {
      // ignore storage errors
    }
  }, [dataset?.id, org?.id, period?.startDate, period?.id, period?.name, period?.endDate])

  // ── Reset when dataset changes ────────────────────────────────────────────
  React.useEffect(() => {
    setValuesById({})
    setValuesByCode({})
    setLayout(null)
    setDataSaved(false)
    setLastSubmittedBy(null)
    setLastSubmittedAt(null)
    setSavedCodes(new Set())
    setUnsavedCodes(new Set())
    setLastAutoSaved(null)
    setDraftRestored(false)
    valuesRef.current = {}
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
  }, [dataset?.id])

  // ── Fetch published layout ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!dataset) {
      setLayout(null)
      setValuesByCode({})
      setValuesById({})
      return
    }
    setValuesByCode({})
    setValuesById({})
    ;(async () => {
      try {
        setLoadingLayout(true)
        const resp = await api.get(
          `/reporting/report-layouts/by_report_type/?report_type=${dataset.id}&status=published`,
          { timeout: 30000 }
        )
        const schema = resp.data?.schema
        if (schema?.sections && Array.isArray(schema.sections)) {
          setLayout(convertLayoutSchema(schema))
        } else {
          setLayout(null)
        }
      } catch (e) {
        const err = e as { response?: { status?: number } }
        if (err?.response?.status !== 404) console.warn("[entry] layout fetch failed:", e)
        setLayout(null)
      } finally {
        setLoadingLayout(false)
      }
    })()
  }, [dataset?.id, dataset])

  // ── Load existing report (prefill) ────────────────────────────────────────
  React.useEffect(() => {
    if (!dataset?.id || !org?.id || !period?.startDate || !layout) return

    ;(async () => {
      try {
        setSaving(true)
        const res = await api.get("/reporting/data-entry/", {
          params: {
            report_type: dataset.id,
            org_unit: org.id,
            reporting_period: period.startDate,
          },
        })

        const report = res.data
        if (!report?.values || !Array.isArray(report.values)) {
          setLastSubmittedBy(null)
          setLastSubmittedAt(null)
          return
        }

        setLastSubmittedBy(report.submitted_by_name || null)
        setLastSubmittedAt(report.submitted_at || null)

        const byCode: Record<string, number | string | null> = {}
        for (const v of report.values) {
          byCode[v.data_element_code] = v.value
          if (v.remark) byCode[`remark.${v.data_element_code}`] = v.remark
        }
        setValuesByCode(byCode)
        valuesRef.current = byCode

        // Mark all loaded codes as already saved (they came from the server)
        setSavedCodes(new Set(Object.keys(byCode)))
        setUnsavedCodes(new Set())

        // Clear any stale draft since server data is newer
        clearDraft()
      } catch (err) {
        const error = err as { response?: { status?: number } }
        if (error?.response?.status === 404) {
          // No server data — try to restore a local draft
          const key = dataset?.id && org?.id && period?.startDate
            ? `nmc_draft_${dataset.id}_${org.id}_${period.startDate}`
            : null
          if (key) {
            try {
              const raw = localStorage.getItem(key)
              if (raw) {
                const draft = JSON.parse(raw) as { values: ValuesByCode; ts: number }
                if (draft.values && Object.keys(draft.values).length > 0) {
                  setValuesByCode(draft.values)
                  valuesRef.current = draft.values
                  setUnsavedCodes(new Set(Object.keys(draft.values)))
                  setDraftRestored(true)
                }
              }
            } catch {
              /* corrupted draft — ignore */
            }
          }
          setLastSubmittedBy(null)
          setLastSubmittedAt(null)
        } else {
          console.error("[entry] prefill error:", err)
          toast.error("Could not load your saved data.")
        }
      } finally {
        setSaving(false)
      }
    })()
  }, [dataset?.id, org?.id, period?.startDate, layout, clearDraft])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const onClear = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    setDataset(null)
    setOrg(null)
    setPeriod(null)
    setValuesById({})
    setValuesByCode({})
    setLayout(null)
    setSavedCodes(new Set())
    setUnsavedCodes(new Set())
    setLastAutoSaved(null)
    setDraftRestored(false)
    valuesRef.current = {}
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(DATA_ENTRY_SELECTION_KEY)
    } catch {
      /* ignore */
    }
  }

  const setIdValue = (id: string, v: number | null) => {
    setValuesById((p) => ({ ...p, [id]: v }))
    setDataSaved(false)
  }

  /** onChange for layout-based forms — triggers auto-save */
  const setCodeValue = (code: string, v: number | string | null) => {
    const next = { ...valuesRef.current, [code]: v }
    valuesRef.current = next
    setValuesByCode(next)

    // Track unsaved state
    setUnsavedCodes((p) => new Set([...p, code]))
    setSavedCodes((p) => { const n = new Set(p); n.delete(code); return n })
    setDataSaved(false)

    // Immediate localStorage backup (survives crash/refresh)
    saveDraft(next)

    // Debounced API auto-save (2 seconds after last keystroke)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(performAutoSave, 2000)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!canExport) return
    try {
      setExporting(true)
      await exportToExcel({
        reportType: dataset!.name,
        orgUnit: org!.name,
        period: period!.name,
        values: valuesByCode,
        computedValues: {},
        layout,
      })
      toast.success("Report exported to Excel successfully!")
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  // ── Submit (manual save) ──────────────────────────────────────────────────
  const submit = async () => {
    if (!dataset || !org || !period) return
    try {
      setSaving(true)

      // Cancel pending auto-save (we're saving right now)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

      let payloadValues: Record<string, number | null | { value: number | null; remark?: string }> = {}
      if (layout) {
        payloadValues = buildPayload(valuesByCode, codeToId)
      } else {
        payloadValues = valuesById
      }

      await api.post(
        "/reporting/data-entry/",
        { report_type: dataset.id, org_unit: org.id, reporting_period: period.startDate, values: payloadValues },
        { timeout: 30000 }
      )

      toast.success("Report submitted successfully.")
      setSavedCodes(new Set(Object.keys(valuesByCode)))
      setUnsavedCodes(new Set())
      setDataSaved(true)
      setLastAutoSaved(new Date())
      clearDraft()

      const name =
        djangoUser?.full_name ||
        (djangoUser?.first_name && djangoUser?.last_name
          ? `${djangoUser.first_name} ${djangoUser.last_name}`
          : null) ||
        "You"
      setLastSubmittedBy(name)
      setLastSubmittedAt(new Date().toISOString())
    } catch (e) {
      console.error("[entry] submit error:", e)
      toast.error("Submission failed. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <SectionLoader message="Loading data entry…" />

  const showForm = !!dataset && !!org && !!period

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <DataEntryTopBar
        dataset={dataset}
        onDatasetChange={setDataset}
        datasets={datasets}
        org={org}
        onOrgChange={setOrg}
        orgTree={orgTree}
        period={period}
        onPeriodChange={setPeriod}
        onClear={onClear}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-4 overflow-auto">
        {/* Layout loading */}
        {loadingLayout && (
          <Alert className="border-gray-200 bg-gray-50">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#C9433B" }} />
            <AlertDescription className="text-gray-700">Loading report layout…</AlertDescription>
          </Alert>
        )}

        {/* Draft restore banner */}
        {draftRestored && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 flex items-center justify-between w-full">
              <span>
                <strong>Draft restored</strong> — unsaved values from your previous session were
                recovered. Review and submit when ready.
              </span>
              <button
                type="button"
                onClick={() => setDraftRestored(false)}
                className="ml-4 flex-shrink-0 text-blue-500 hover:text-blue-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        )}

        {showForm && !loadingLayout ? (
          <div className="space-y-4">
            {/* Report context card */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full min-h-8 rounded-full flex-shrink-0" style={{ background: "#C9433B" }} />
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Report</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{dataset!.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full min-h-8 rounded-full flex-shrink-0" style={{ background: "#D96455" }} />
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Organisation Unit</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{org!.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full min-h-8 rounded-full flex-shrink-0" style={{ background: "#E8877A" }} />
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Reporting Period</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{period!.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Auto-save status badge */}
                  <div className="flex-shrink-0">
                    {autoSaving ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        <span className="text-xs font-medium text-blue-700">Saving…</span>
                      </div>
                    ) : unsavedCodes.size > 0 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-medium text-amber-700">
                          {unsavedCodes.size} unsaved
                        </span>
                      </div>
                    ) : lastAutoSaved ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-green-50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-700">
                          Saved {formatRelativeTime(lastAutoSaved)}
                        </span>
                      </div>
                    ) : dataSaved ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-green-50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-700">Saved</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Last submitted info */}
                {lastSubmittedBy && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    Last submitted by{" "}
                    <span className="font-semibold text-gray-700">{lastSubmittedBy}</span>
                    {lastSubmittedAt && (
                      <>
                        {" "}on{" "}
                        <span className="font-medium text-gray-600">
                          {new Date(lastSubmittedAt).toLocaleDateString("en-GH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Read-only / lock notice */}
            {isReadOnly && (
              <Alert className="bg-amber-50 border-amber-300">
                <AlertDescription className="text-amber-800">
                  <strong>View-only mode — </strong>
                  {isPeriodLocked ? (
                    <>
                      This reporting period <strong>({period!.name})</strong> is locked.
                      Data cannot be modified after {dataset!.lock_period_days} days from the period end date.
                    </>
                  ) : !isViewingOwnOrg ? (
                    <>
                      You are viewing data for <strong>{org!.name}</strong>.
                      You can only enter data for your assigned organisation unit.
                    </>
                  ) : !isReportTypeEditable ? (
                    <>
                      The report type <strong>{dataset!.name}</strong> is not assigned to your organisation unit.
                    </>
                  ) : (
                    "You cannot make entries for this selection."
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Layout indicator */}
            {layout && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: "#E8877A" }} />
                <span className="text-xs text-gray-400">
                  {layout.sections?.length ?? 0} section{(layout.sections?.length ?? 0) !== 1 ? "s" : ""} loaded
                </span>
              </div>
            )}

            {/* Form */}
            {layout ? (
              <div id="data-entry-form" className={isReadOnly ? "opacity-70" : ""}>
                <EnhancedLayoutEntryForm
                  schema={layout}
                  values={valuesByCode}
                  onChange={setCodeValue}
                  dataElements={dataElements}
                  dataSaved={dataSaved}
                  readOnly={isReadOnly}
                  savedCodes={savedCodes}
                  unsavedCodes={unsavedCodes}
                  autoSaving={autoSaving}
                />
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-400 px-1">Using default form (no custom layout available)</div>
                <div className={isReadOnly ? "opacity-70" : ""}>
                  <DataEntryForm
                    reportType={dataset!}
                    values={valuesById}
                    onChange={setIdValue}
                    readOnly={isReadOnly}
                  />
                </div>
              </>
            )}

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-gray-200">
              {/* Left: export + save-now */}
              <div className="flex items-center gap-2 flex-wrap">
                {canExport && (
                  <>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Export:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      disabled={exporting}
                      className="h-8 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                      Excel
                    </Button>
                  </>
                )}

                {/* Save now button when there are unsaved changes */}
                {unsavedCodes.size > 0 && !autoSaving && !isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={performAutoSave}
                    className="h-8 text-amber-700 border-amber-300 hover:bg-amber-50 gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save now
                    <span className="text-[10px] bg-amber-100 rounded-full px-1.5 py-0.5 font-bold">
                      {unsavedCodes.size}
                    </span>
                  </Button>
                )}
              </div>

              {/* Right: cancel + submit */}
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" onClick={onClear} className="h-10 border-gray-300">
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={!canSubmit || saving || !hasValues}
                  className="h-10 min-w-[140px] text-white font-semibold shadow-sm"
                  style={{
                    background:
                      canSubmit && !saving && hasValues
                        ? "linear-gradient(135deg, #C9433B, #D96455)"
                        : "#9CA3AF",
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : !loadingLayout ? (
          <Card className="border-dashed border-2 border-gray-200 shadow-none bg-white">
            <CardContent className="text-center py-20">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: "#F3F4F6" }}
              >
                <Target className="h-8 w-8" style={{ color: "#D96455" }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Data Entry</h3>
              <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
                Select a <strong>Report</strong>, <strong>Organisation Unit</strong>, and{" "}
                <strong>Reporting Period</strong> from the toolbar above to begin entering data.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
