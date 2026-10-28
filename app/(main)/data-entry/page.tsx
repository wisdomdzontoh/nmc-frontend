"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Save,
  Send,
  Check,
  FileSpreadsheet,
  FilePlus2,
  CheckCircle2,
  CircleDot,
  X,
  Clock,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { PageCard } from "@/components/layout/PageCard"
import { StatusPill } from "@/components/common/status-pill"
import { InlineNotice } from "@/components/common/inline-notice"
import { Illustration } from "@/components/common/illustration"
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
  const [reportStatus, setReportStatus] = React.useState<"draft" | "submitted" | null>(null)
  const [loadingReport, setLoadingReport] = React.useState(false)
  const [targetOrgAssignedTypeIds, setTargetOrgAssignedTypeIds] = React.useState<number[]>([])

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
  /** Bumps on each selection change so in-flight loads cannot apply stale data */
  const reportFetchGenRef = React.useRef(0)

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
  const isPrivileged = Boolean(djangoUser?.is_staff || djangoUser?.is_superuser)
  const isSuperuser = Boolean(djangoUser?.is_superuser)
  const userOrgUnitId = djangoUser?.org_unit ?? null
  const isViewingOwnOrg = userOrgUnitId !== null && org?.id === userOrgUnitId
  const canEnterForSelectedOrg = isPrivileged || isViewingOwnOrg
  const isReportTypeEditable = dataset
    ? editableReportTypes.some((rt) => rt.id === dataset.id)
    : false
  const meetsReportPortfolio = isSuperuser || isReportTypeEditable

  const isReportAssignedAtTargetOrg = React.useMemo(() => {
    if (!dataset || !org) return false
    if (!isPrivileged) {
      return isViewingOwnOrg && isReportTypeEditable
    }
    return targetOrgAssignedTypeIds.includes(dataset.id)
  }, [
    dataset,
    org,
    isPrivileged,
    isViewingOwnOrg,
    isReportTypeEditable,
    targetOrgAssignedTypeIds,
  ])

  const datasetsForPicker = React.useMemo(() => {
    if (!isPrivileged || !org) return datasets
    const allowedAtTarget = new Set(targetOrgAssignedTypeIds)
    const portfolio = new Set(editableReportTypes.map((rt) => rt.id))
    return datasets.filter(
      (rt) =>
        allowedAtTarget.has(rt.id) && (isSuperuser || portfolio.has(rt.id)),
    )
  }, [datasets, editableReportTypes, targetOrgAssignedTypeIds, isPrivileged, isSuperuser, org])

  React.useEffect(() => {
    if (!isPrivileged || !org?.id) {
      setTargetOrgAssignedTypeIds([])
      return
    }
    let cancelled = false
    ApiClient.getOrgUnitAssignments(org.id)
      .then((res) => {
        if (cancelled) return
        const ids = (res.data || [])
          .filter((a: { is_active?: boolean }) => a.is_active !== false)
          .map((a: { report_type: number }) => a.report_type)
        setTargetOrgAssignedTypeIds(ids)
      })
      .catch(() => {
        if (!cancelled) setTargetOrgAssignedTypeIds([])
      })
    return () => {
      cancelled = true
    }
  }, [org?.id, isPrivileged])

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

  const canSubmit =
    !!dataset &&
    !!org &&
    !!period &&
    canEnterForSelectedOrg &&
    meetsReportPortfolio &&
    isReportAssignedAtTargetOrg &&
    !isPeriodLocked

  const isReadOnly = org === null || !canSubmit

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
        { report_type: d.id, org_unit: o.id, reporting_period: p.startDate, values: payload, is_draft: true },
        { timeout: 30000 }
      )
      setSavedCodes(new Set(Object.keys(vals)))
      setUnsavedCodes(new Set())
      setDataSaved(true)
      setLastAutoSaved(new Date())
      if (reportStatus !== "submitted") setReportStatus("draft")
      clearDraft()
    } catch (err) {
      // Silent failure — will retry on next change; localStorage still has the data
      console.error("[AutoSave]", err)
    } finally {
      setAutoSaving(false)
    }
  }, [buildPayload, clearDraft, reportStatus])

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

  const selectionKey =
    dataset?.id && org?.id && period?.startDate
      ? `${dataset.id}:${org.id}:${period.startDate}`
      : null

  // ── Clear form when report type, org unit, or period changes ─────────────
  React.useEffect(() => {
    setValuesById({})
    setValuesByCode({})
    valuesRef.current = {}
    setDataSaved(false)
    setReportStatus(null)
    setLastSubmittedBy(null)
    setLastSubmittedAt(null)
    setSavedCodes(new Set())
    setUnsavedCodes(new Set())
    setLastAutoSaved(null)
    setDraftRestored(false)
    setLoadingReport(false)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
  }, [dataset?.id, org?.id, period?.startDate])

  // ── Fetch published layout (report type only) ─────────────────────────────
  React.useEffect(() => {
    if (!dataset) {
      setLayout(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoadingLayout(true)
        const resp = await api.get(
          `/reporting/report-layouts/by_report_type/?report_type=${dataset.id}&status=published`,
          { timeout: 30000 }
        )
        const schema = resp.data?.schema
        if (cancelled) return
        if (schema?.sections && Array.isArray(schema.sections)) {
          setLayout(convertLayoutSchema(schema))
        } else {
          setLayout(null)
        }
      } catch (e) {
        if (cancelled) return
        const err = e as { response?: { status?: number } }
        if (err?.response?.status !== 404) console.warn("[entry] layout fetch failed:", e)
        setLayout(null)
      } finally {
        if (!cancelled) setLoadingLayout(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dataset?.id])

  // ── Load report for current selection (abortable, no layout dependency) ───
  React.useEffect(() => {
    if (!selectionKey || !dataset?.id || !org?.id || !period?.startDate) return

    const generation = ++reportFetchGenRef.current
    const controller = new AbortController()

    ;(async () => {
      setLoadingReport(true)
      try {
        const res = await api.get("/reporting/data-entry/", {
          params: {
            report_type: dataset.id,
            org_unit: org.id,
            reporting_period: period.startDate,
          },
          signal: controller.signal,
        })

        if (generation !== reportFetchGenRef.current) return

        const report = res.data as {
          status?: string
          submitted_by_name?: string | null
          submitted_at?: string | null
          values?: Array<{
            data_element_code: string
            value: number | null
            remark?: string | null
          }>
        }

        setReportStatus(report.status === "submitted" ? "submitted" : "draft")
        setLastSubmittedBy(report.submitted_by_name || null)
        setLastSubmittedAt(report.submitted_at || null)

        const byCode: Record<string, number | string | null> = {}
        if (report.values && Array.isArray(report.values)) {
          for (const v of report.values) {
            byCode[v.data_element_code] = v.value
            if (v.remark) byCode[`remark.${v.data_element_code}`] = v.remark
          }
        }
        setValuesByCode(byCode)
        valuesRef.current = byCode
        setSavedCodes(new Set(Object.keys(byCode)))
        setUnsavedCodes(new Set())
        setDataSaved(Object.keys(byCode).length > 0)
        clearDraft()
      } catch (err) {
        if (controller.signal.aborted) return
        if (generation !== reportFetchGenRef.current) return

        const error = err as { response?: { status?: number } }
        if (error?.response?.status === 404) {
          setReportStatus(null)
          setLastSubmittedBy(null)
          setLastSubmittedAt(null)

          const key = `nmc_draft_${dataset.id}_${org.id}_${period.startDate}`
          try {
            const raw = localStorage.getItem(key)
            if (raw) {
              const draft = JSON.parse(raw) as { values: ValuesByCode; ts: number }
              if (draft.values && Object.keys(draft.values).length > 0) {
                setValuesByCode(draft.values)
                valuesRef.current = draft.values
                setUnsavedCodes(new Set(Object.keys(draft.values)))
                setDraftRestored(true)
                setReportStatus("draft")
              }
            }
          } catch {
            /* corrupted draft */
          }
        } else {
          console.error("[entry] prefill error:", err)
          toast.error("Could not load report data for this selection.")
        }
      } finally {
        if (generation === reportFetchGenRef.current) {
          setLoadingReport(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [selectionKey, dataset?.id, org?.id, period?.startDate, clearDraft])

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
    setReportStatus(null)
    setLoadingReport(false)
    reportFetchGenRef.current += 1
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
        { report_type: dataset.id, org_unit: org.id, reporting_period: period.startDate, values: payloadValues, is_draft: false },
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
      setReportStatus("submitted")
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
  const formReady = showForm && !loadingReport && !loadingLayout

  const statusPill = loadingReport ? (
    <StatusPill tone="neutral" icon={Loader2}>Loading…</StatusPill>
  ) : reportStatus === "submitted" ? (
    <StatusPill tone="success" icon={CheckCircle2}>Submitted</StatusPill>
  ) : reportStatus === "draft" ? (
    <StatusPill tone="pending" icon={Clock}>Draft</StatusPill>
  ) : (
    <StatusPill tone="neutral" icon={FilePlus2}>New entry</StatusPill>
  )

  const savePill = autoSaving ? (
    <StatusPill tone="info" icon={Loader2}>Saving…</StatusPill>
  ) : unsavedCodes.size > 0 ? (
    <StatusPill tone="pending" icon={CircleDot}>
      {`${unsavedCodes.size} change${unsavedCodes.size === 1 ? "" : "s"} not saved yet`}
    </StatusPill>
  ) : lastAutoSaved ? (
    <StatusPill tone="success" icon={CheckCircle2}>{`Saved ${formatRelativeTime(lastAutoSaved)}`}</StatusPill>
  ) : dataSaved ? (
    <StatusPill tone="success" icon={CheckCircle2}>Saved</StatusPill>
  ) : null

  return (
    <div className="space-y-6">
      <PageCard
        title="Data entry"
        description="Choose the organisation unit, report and period, then fill in the form. Your work saves automatically as you type."
        icon={<FileSpreadsheet className="h-5 w-5" aria-hidden="true" />}
      >
        <DataEntryTopBar
          dataset={dataset}
          onDatasetChange={setDataset}
          datasets={datasetsForPicker}
          org={org}
          onOrgChange={setOrg}
          orgTree={orgTree}
          period={period}
          onPeriodChange={setPeriod}
          reportStatus={showForm ? reportStatus : null}
          loadingReport={showForm && loadingReport}
          onClear={onClear}
        />
      </PageCard>

      {loadingLayout && <InlineNotice tone="info" title="Loading the report form…" />}

      {draftRestored && (
        <InlineNotice
          tone="info"
          title="We restored your unsaved work"
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setDraftRestored(false)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          }
        >
          Values you typed last time were recovered on this computer. Check them, then submit when ready.
        </InlineNotice>
      )}

      {showForm ? (
        <div className="space-y-4">
          {/* Report context */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <dl className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0">
                  <dt className="stat-card-label">Report</dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-foreground">{dataset!.name}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="stat-card-label">Organisation unit</dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-foreground">{org!.name}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="stat-card-label">Reporting period</dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-foreground">{period!.name}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="stat-card-label">Status</dt>
                  <dd className="mt-1">{statusPill}</dd>
                </div>
              </dl>
              {savePill && <div className="shrink-0" aria-live="polite">{savePill}</div>}
            </div>

            {lastSubmittedBy && (
              <p className="mt-4 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
                Last submitted by <span className="font-semibold text-foreground">{lastSubmittedBy}</span>
                {lastSubmittedAt && (
                  <>
                    {" "}on{" "}
                    <span className="font-medium text-foreground">
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
              </p>
            )}
          </section>

          {/* Read-only / lock notice */}
          {isReadOnly && (
            <InlineNotice tone="warning" title="You can view this report but not change it">
              {isPeriodLocked ? (
                <>
                  The period <strong>{period!.name}</strong> is locked. Reports can only be changed for{" "}
                  {dataset!.lock_period_days} days after the period ends.
                </>
              ) : !canEnterForSelectedOrg ? (
                <>
                  You are viewing <strong>{org!.name}</strong>. You can only enter data for your own organisation unit.
                </>
              ) : !meetsReportPortfolio ? (
                <>
                  The report <strong>{dataset!.name}</strong> isn&apos;t assigned to your organisation unit.
                </>
              ) : !isReportAssignedAtTargetOrg ? (
                <>
                  The report <strong>{dataset!.name}</strong> isn&apos;t assigned to <strong>{org!.name}</strong>.
                </>
              ) : (
                "You can't make entries for this selection."
              )}
            </InlineNotice>
          )}

          {loadingReport && <InlineNotice tone="info" title="Loading the data for this period…" />}

          {reportStatus === "submitted" && !loadingReport && !isReadOnly && (
            <InlineNotice tone="success" title="This report has been submitted">
              You can still update values until the period is locked. Changes save automatically.
            </InlineNotice>
          )}

          {/* Form */}
          {!formReady ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5" aria-busy="true">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          ) : layout ? (
            <div id="data-entry-form" className={isReadOnly ? "opacity-75" : ""}>
              {(layout.sections?.length ?? 0) > 0 && (
                <p className="mb-2 px-1 text-xs text-muted-foreground">
                  {layout.sections!.length} section{layout.sections!.length !== 1 ? "s" : ""} in this form
                </p>
              )}
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
            <div className={isReadOnly ? "opacity-75" : ""}>
              <p className="mb-2 px-1 text-xs text-muted-foreground">
                This report doesn&apos;t have a custom layout yet, so it shows as a simple list.
              </p>
              <DataEntryForm reportType={dataset!} values={valuesById} onChange={setIdValue} readOnly={isReadOnly} />
            </div>
          )}

          {/* Action bar — stays in view at the bottom while you scroll the form */}
          {formReady && (
            <div className="sticky bottom-0 z-20 -mx-1 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-[0_-4px_16px_hsl(222_30%_12%/0.06)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  {canExport && (
                    <Button variant="secondary" onClick={handleExportExcel} disabled={exporting}>
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                      )}
                      {exporting ? "Exporting…" : "Export to Excel"}
                    </Button>
                  )}

                  {unsavedCodes.size > 0 && !autoSaving && !isReadOnly && (
                    <Button variant="outline" onClick={performAutoSave}>
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save now
                      <span className="rounded-full bg-primary-soft px-1.5 text-xs font-bold">{unsavedCodes.size}</span>
                    </Button>
                  )}
                </div>

                <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                  <Button variant="secondary" size="lg" onClick={onClear} className="flex-1 sm:flex-none">
                    Close report
                  </Button>
                  <Button
                    size="lg"
                    onClick={submit}
                    disabled={!canSubmit || saving || !hasValues}
                    className="min-w-40 flex-1 sm:flex-none"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Submit report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !loadingLayout ? (
        <section className="rounded-xl border border-border bg-card px-6 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <Illustration name="choose" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Choose what you are reporting on</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the three boxes above. The form opens as soon as all three are chosen.
            </p>
          </div>
          <ol className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              { step: 1, title: "Organisation unit", text: "The region, district or office you are reporting for.", done: !!org },
              { step: 2, title: "Report", text: "The report form you need to fill in.", done: !!dataset },
              { step: 3, title: "Period", text: "The month, quarter or year the data covers.", done: !!period },
            ].map((s) => (
              <li
                key={s.step}
                className="select-card"
                data-selected={s.done ? "true" : undefined}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      s.done
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : "flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/40 text-xs font-bold text-muted-foreground"
                    }
                  >
                    {s.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s.step}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{s.title}</span>
                  {s.done && <span className="sr-only">(chosen)</span>}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}
