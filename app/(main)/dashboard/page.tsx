"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { ApiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  ArrowRight,
  Building2,
  Tags,
  TrendingUp,
  RefreshCw,
  Calendar,
  ChevronRight,
} from "lucide-react"
import { SectionLoader } from "@/components/ui/PageLoader"
import { PageCard } from "@/components/layout/PageCard"
import { SectionCard } from "@/components/common/section-card"
import { StatCard } from "@/components/common/stat-card"
import { StatusPill } from "@/components/common/status-pill"
import { EmptyState } from "@/components/common/empty-state"
import { InlineNotice } from "@/components/common/inline-notice"
import { TableSkeleton } from "@/components/common/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { reportStatus } from "@/lib/status-labels"
import { CHART_AXIS, CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE, chartColor } from "@/lib/chart-theme"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardAnalytics {
  reportsByOrgUnit: Array<{ org_unit: string; count: number }>
  reportsByType: Array<{ report_type: string; count: number }>
  reportsOverTime: Array<{ period: string; count: number }>
  userActivity: Array<{ date: string; new_reports: number }>
}

interface RecentReport {
  id: number
  report_type_name?: string
  org_unit_name?: string
  period_name?: string
  status?: string
  created_at?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "Last 7 days",    value: "last_7_days" },
  { label: "Last 30 days",   value: "last_30_days" },
  { label: "Last 90 days",   value: "last_90_days" },
  { label: "Last 12 months", value: "last_12_months" },
  { label: "This year",      value: "this_year" },
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

// ── Chart card ───────────────────────────────────────────────────────────────

function ChartCard({
  title,
  description,
  loading,
  empty,
  height = 220,
  children,
}: {
  title: string
  description: string
  loading: boolean
  empty: boolean
  height?: number
  children: React.ReactNode
}) {
  return (
    <SectionCard title={title} description={description}>
      {loading ? (
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      ) : empty ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <EmptyState
            illustration="empty-list"
            title="No reports in this period"
            description="Try a longer period, or check back after reports are submitted."
            className="py-0"
          />
        </div>
      ) : (
        children
      )}
    </SectionCard>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { djangoUser: user, loading: authLoading, error: authError } = useAuth()
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [period, setPeriod] = useState("last_30_days")
  const [orgFilter, setOrgFilter] = useState<string>("all")

  const isStaff = Boolean(user?.is_staff)
  const isSuperuser = Boolean(user?.is_superuser)
  const canFilterOrg = isStaff || isSuperuser

  // Lock regular users to their org unit
  useEffect(() => {
    if (user && !canFilterOrg && user.org_unit) {
      setOrgFilter(String(user.org_unit))
    }
  }, [user, canFilterOrg])

  const loadDashboard = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      const analyticsParams: Record<string, string> = { period }
      if (orgFilter !== "all") analyticsParams.org_unit = orgFilter

      const reportsParams: Record<string, string | number> = {
        page_size: 6,
        ordering: "-created_at",
      }
      if (orgFilter !== "all") reportsParams.org_unit = orgFilter

      const [analyticsRes, reportsRes] = await Promise.allSettled([
        ApiClient.getAnalytics(analyticsParams),
        ApiClient.getReports(reportsParams),
      ])

      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value.data)
      if (reportsRes.status === "fulfilled") {
        setRecentReports(reportsRes.value.data?.results ?? [])
      }

      if (analyticsRes.status === "rejected") {
        setError("Could not load analytics data.")
      }
    } catch (err) {
      console.error("Dashboard load error:", err)
      setError("Could not load activity data.")
    } finally {
      setLoading(false)
    }
  }, [user, period, orgFilter])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Derived stats
  const totalReports = useMemo(
    () => analytics?.reportsOverTime?.reduce((s, r) => s + r.count, 0) ?? 0,
    [analytics]
  )
  const activeOrgUnits = analytics?.reportsByOrgUnit?.length ?? 0
  const reportTypeCount = analytics?.reportsByType?.length ?? 0
  const dailyAvg = useMemo(() => {
    const days = analytics?.userActivity?.length
    if (!days || !totalReports) return "0"
    return (totalReports / days).toFixed(1)
  }, [analytics, totalReports])

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period

  if (authLoading) return <SectionLoader />
  if (authError)
    return <InlineNotice tone="error" title="We couldn't load your account">{authError}</InlineNotice>
  if (!user)
    return <InlineNotice tone="info">Sign in to see the dashboard.</InlineNotice>

  const firstName = user.first_name || user.username || "there"
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const scopeLabel = orgFilter === "all" ? "all organisation units" : user.org_unit_name || "your unit"

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page card: greeting, date, main actions ─────────────────── */}
      <PageCard
        title={`${getGreeting()}, ${firstName}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {today}
            </span>
            {user.org_unit_name && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {user.org_unit_name}
                </span>
              </>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={loadDashboard} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button asChild>
              <Link href="/data-entry">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Enter data
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        }
      >
        {/* Filter band */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-border bg-surface-subtle px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            Period
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 w-44 bg-card" aria-label="Period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            Organisation unit
            {canFilterOrg ? (
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="h-9 w-48 bg-card" aria-label="Organisation unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All units</SelectItem>
                  {user.org_unit && (
                    <SelectItem value={String(user.org_unit)}>{user.org_unit_name || "My unit"}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <StatusPill tone="brand" icon={Building2}>
                {user.org_unit_name || "My unit"}
              </StatusPill>
            )}
          </div>

          <p className="text-xs text-muted-foreground sm:ml-auto">
            Showing <span className="font-semibold text-foreground">{periodLabel.toLowerCase()}</span> for{" "}
            <span className="font-semibold text-foreground">{scopeLabel}</span>
          </p>
        </div>
      </PageCard>

      {error && (
        <InlineNotice
          tone="error"
          title="Some numbers didn't load"
          action={
            <Button size="sm" variant="secondary" onClick={loadDashboard}>
              Try again
            </Button>
          }
        >
          Check your internet connection, then try again.
        </InlineNotice>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reports submitted"
          value={loading ? "—" : totalReports.toLocaleString()}
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          tint="red"
          hint={periodLabel}
          href="/reports"
        />
        <StatCard
          label="Units reporting"
          value={loading ? "—" : activeOrgUnits}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          tint="blue"
          hint="Organisation units with at least one report"
        />
        <StatCard
          label="Report types used"
          value={loading ? "—" : reportTypeCount}
          icon={<Tags className="h-5 w-5" aria-hidden="true" />}
          tint="teal"
          hint="Different report types submitted"
        />
        <StatCard
          label="Daily average"
          value={loading ? "—" : dailyAvg}
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          tint="violet"
          hint="Reports submitted per day"
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Reports over time"
          description={`Reports submitted in each period · ${periodLabel}`}
          loading={loading}
          empty={!analytics?.reportsOverTime?.length}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics?.reportsOverTime ?? []} margin={{ left: -12, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor(0)} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={chartColor(0)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="period" tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} />
              <YAxis tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ fontWeight: 600 }} />
              <Area type="monotone" dataKey="count" stroke={chartColor(0)} strokeWidth={2} fill="url(#areaFill)" name="Reports" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="By organisation unit"
          description="Which units submitted the most reports"
          loading={loading}
          empty={!analytics?.reportsByOrgUnit?.length}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.reportsByOrgUnit ?? []} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="org_unit" width={120} tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="count" fill={chartColor(1)} radius={[0, 4, 4, 0]} name="Reports" maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="By report type"
          description="How many of each report type were submitted"
          loading={loading}
          empty={!analytics?.reportsByType?.length}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.reportsByType ?? []} margin={{ left: -12, right: 12, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="report_type" angle={-30} textAnchor="end" height={68} interval={0} tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} />
              <YAxis tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="count" fill={chartColor(0)} radius={[4, 4, 0, 0]} name="Reports" maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Daily activity"
          description="Reports submitted each day"
          loading={loading}
          empty={!analytics?.userActivity?.length}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.userActivity ?? []} margin={{ left: -12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="date" tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} />
              <YAxis tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                cursor={{ fill: "hsl(var(--muted))" }}
                formatter={(v: number) => [v, "Reports"]}
              />
              <Bar dataKey="new_reports" fill={chartColor(2)} radius={[4, 4, 0, 0]} name="Reports" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Recent submissions ────────────────────────────────────────── */}
      <SectionCard
        flush
        title="Recent submissions"
        description={`The latest reports from ${scopeLabel}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">
              See all reports
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton rows={4} columns={3} />
        ) : recentReports.length === 0 ? (
          <EmptyState
            illustration="report"
            title="No reports submitted yet"
            description="Reports you and your team submit will appear here."
            action={{ label: "Enter data", href: "/data-entry" }}
          />
        ) : (
          <ul className="divide-y divide-border">
            {recentReports.map((report) => {
              const status = report.status ? reportStatus(report.status) : null
              return (
                <li key={report.id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-muted/60">
                  <span className="icon-chip h-9 w-9">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {report.report_type_name || `Report #${report.id}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[report.org_unit_name, report.period_name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {status && (
                      <StatusPill tone={status.tone} icon={status.icon}>
                        {status.label}
                      </StatusPill>
                    )}
                    {report.created_at && (
                      <span className="font-clinical hidden text-xs text-muted-foreground sm:inline">
                        {new Date(report.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

export default DashboardPage
