"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { ApiClient } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  MapPin,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { SectionLoader } from "@/components/ui/PageLoader"
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
  if (h < 12) return "Morning"
  if (h < 17) return "Afternoon"
  return "Evening"
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  accent: string
  sub?: string
}) {
  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              {label}
            </p>
            <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${accent}1a` }}
          >
            <Icon className="h-5 w-5" style={{ color: accent }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Chart card ───────────────────────────────────────────────────────────────

function ChartCard({
  title,
  description,
  loading,
  empty,
  height = 220,
  children,
  className,
  headerRight,
}: {
  title: string
  description: string
  loading: boolean
  empty: boolean
  height?: number
  children: React.ReactNode
  className?: string
  headerRight?: React.ReactNode
}) {
  return (
    <Card className={`border-gray-200 shadow-sm bg-white overflow-hidden ${className ?? ""}`}>
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-gray-900">{title}</CardTitle>
            <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
          </div>
          {headerRight}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#C9433B" }} />
          </div>
        ) : empty ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-slate-400"
            style={{ height }}
          >
            <FileText className="h-8 w-8 text-gray-200" />
            <p className="text-xs">No data for this period</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
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
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      </div>
    )
  if (!user)
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>You must be logged in to view the dashboard.</AlertDescription>
        </Alert>
      </div>
    )

  const firstName = user.first_name || user.username || "there"

  return (
    <div className="space-y-5 pb-10">
      {/* ── Welcome header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C9433B] mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {firstName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-xs text-gray-500">
            {user.org_unit_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {user.org_unit_name}
              </span>
            )}
            {user.org_unit_name && <span className="text-gray-300">·</span>}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={loading}
            className="gap-1.5 text-gray-600 border-gray-200 h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            asChild
            size="sm"
            className="gap-1.5 text-white shadow-sm h-8 text-xs"
            style={{ background: "linear-gradient(135deg, #C9433B, #D96455)" }}
          >
            <Link href="/data-entry">
              <FileText className="h-3.5 w-3.5" />
              Data Entry
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Period */}
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">Period</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-40 text-xs border-gray-200 focus:ring-[#C9433B]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Org unit */}
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">Org unit</span>
          {canFilterOrg ? (
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="h-8 w-36 text-xs border-gray-200 focus:ring-[#C9433B]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All units</SelectItem>
                {user.org_unit && (
                  <SelectItem value={String(user.org_unit)} className="text-xs">
                    {user.org_unit_name || "My unit"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : (
            <Badge
              variant="outline"
              className="h-8 px-3 text-xs font-medium border-gray-200 text-gray-700 bg-gray-50"
            >
              {user.org_unit_name || "My unit"}
            </Badge>
          )}
        </div>

        {/* Active filter summary */}
        <div className="ml-auto text-[11px] text-gray-400 hidden sm:block">
          Showing{" "}
          <span className="font-medium text-gray-600">{periodLabel}</span>
          {orgFilter !== "all" && user.org_unit_name && (
            <>
              {" "}for{" "}
              <span className="font-medium text-gray-600">{user.org_unit_name}</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Reports"
          value={loading ? "—" : totalReports.toLocaleString()}
          icon={FileText}
          accent="#C9433B"
          sub={periodLabel}
        />
        <StatCard
          label="Active Org Units"
          value={loading ? "—" : activeOrgUnits}
          icon={Building2}
          accent="#D96455"
          sub="with submissions"
        />
        <StatCard
          label="Report Types"
          value={loading ? "—" : reportTypeCount}
          icon={Tags}
          accent="#8B3020"
          sub="distinct types used"
        />
        <StatCard
          label="Daily Average"
          value={loading ? "—" : dailyAvg}
          icon={TrendingUp}
          accent="#E8877A"
          sub="submissions / day"
        />
      </div>

      {/* ── Charts row 1 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Reports over time */}
        <ChartCard
          title="Reports over time"
          description={`Submissions by period · ${periodLabel}`}
          loading={loading}
          empty={!analytics?.reportsOverTime?.length}
          height={220}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics?.reportsOverTime ?? []}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C9433B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#C9433B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#e5e7eb" tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="#e5e7eb" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#C9433B"
                strokeWidth={2}
                fill="url(#areaFill)"
                name="Reports"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* By organization */}
        <ChartCard
          title="By organization"
          description="Report distribution across org units"
          loading={loading}
          empty={!analytics?.reportsByOrgUnit?.length}
          height={220}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={analytics?.reportsByOrgUnit ?? []}
              layout="vertical"
              margin={{ left: 4, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#e5e7eb" tickLine={false} />
              <YAxis
                type="category"
                dataKey="org_unit"
                width={115}
                tick={{ fontSize: 10 }}
                stroke="#e5e7eb"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#D96455" radius={[0, 4, 4, 0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts row 2 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By report type */}
        <ChartCard
          title="By report type"
          description="Submission count per report type"
          loading={loading}
          empty={!analytics?.reportsByType?.length}
          height={220}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={analytics?.reportsByType ?? []}
              margin={{ left: 4, right: 12, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="report_type"
                angle={-30}
                textAnchor="end"
                height={68}
                interval={0}
                tick={{ fontSize: 10 }}
                stroke="#e5e7eb"
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10 }} stroke="#e5e7eb" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#C9433B" radius={[4, 4, 0, 0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily activity */}
        <ChartCard
          title="Daily activity"
          description="Reports submitted per day"
          loading={loading}
          empty={!analytics?.userActivity?.length}
          height={220}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.userActivity ?? []} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#e5e7eb" tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="#e5e7eb" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                formatter={(v: number) => [v, "Reports"]}
              />
              <Bar dataKey="new_reports" fill="#E8877A" radius={[4, 4, 0, 0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Recent submissions ────────────────────────────────────────── */}
      {(loading || recentReports.length > 0) && (
        <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pt-5 pb-2 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Recent submissions
                </CardTitle>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Latest reports from{" "}
                  {orgFilter === "all"
                    ? "all units"
                    : user.org_unit_name || "your unit"}
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-[#C9433B] hover:text-[#8B3020] hover:bg-[#FEF0EC] gap-1 text-xs h-8"
              >
                <Link href="/data-entry">
                  Go to Data Entry
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#C9433B" }} />
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/70 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "#FEF0EC" }}
                    >
                      <FileText className="h-4 w-4" style={{ color: "#C9433B" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {report.report_type_name || `Report #${report.id}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {[report.org_unit_name, report.period_name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {report.status && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 h-5 capitalize font-medium"
                          style={
                            report.status === "submitted"
                              ? {
                                  borderColor: "#FCC6BB",
                                  color: "#C9433B",
                                  background: "#FEF0EC",
                                }
                              : { borderColor: "#e5e7eb", color: "#9ca3af" }
                          }
                        >
                          {report.status}
                        </Badge>
                      )}
                      {report.created_at && (
                        <span className="text-[11px] text-gray-400 tabular-nums">
                          {new Date(report.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DashboardPage
