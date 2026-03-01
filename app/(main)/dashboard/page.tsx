/**
 * Dashboard – Welcome hub and activity overview
 * No summary stats, no org/period filters, no recent reports list.
 */

"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { ApiClient } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, BarChart3, Sparkles, ArrowRight } from "lucide-react"
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
  LineChart,
  Line,
} from "recharts"

interface DashboardAnalytics {
  reportsByOrgUnit: Array<{ org_unit: string; count: number }>
  reportsByType: Array<{ report_type: string; count: number }>
  reportsOverTime: Array<{ period: string; count: number }>
  userActivity: Array<{ date: string; new_reports: number }>
}

const QUICK_LINKS = [
  { label: "Data Entry", href: "/data-entry", icon: FileText },
]

const DashboardPage: React.FC = () => {
  const { djangoUser: user, loading: authLoading, error: authError } = useAuth()
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)
      const res = await ApiClient.getAnalytics({
        period: "last_30_days",
        org_unit: "all",
      })
      setAnalytics(res.data)
    } catch (err) {
      console.error("Dashboard analytics error:", err)
      setError("Could not load activity data.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: "#1B5E3B" }} />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>You must be logged in to view the dashboard.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const firstName = user.first_name || user.username || "there"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / Welcome */}
      <section className="relative overflow-hidden px-6 pt-6 pb-8">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(27,94,59,0.10), transparent)" }} />
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: "#1B5E3B" }}>
                <Sparkles className="h-4 w-4" />
                Welcome back
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                Hello, {firstName}
              </h1>
              <p className="mt-2 text-gray-500 max-w-lg text-sm">
                Use the links below to submit reports or explore data. Charts show the last 30 days of activity.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                <Button
                  key={href}
                  asChild
                  size="lg"
                  className="gap-2 text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, #1B5E3B, #2E7D52)" }}
                >
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    {label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 pb-10 max-w-6xl mx-auto">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reports over time */}
          <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Reports over time</CardTitle>
              <CardDescription>Submissions by period (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[260px]">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#1B5E3B" }} />
                </div>
              ) : analytics?.reportsOverTime?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics.reportsOverTime}>
                    <defs>
                      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1B5E3B" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#1B5E3B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#1B5E3B"
                      strokeWidth={2}
                      fill="url(#areaFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reports by organization */}
          <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">By organization</CardTitle>
              <CardDescription>Distribution across org units</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[260px]">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#1B5E3B" }} />
                </div>
              ) : analytics?.reportsByOrgUnit?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={analytics.reportsByOrgUnit}
                    layout="vertical"
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="org_unit"
                      width={120}
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="count" fill="#2E7D52" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reports by type */}
          <Card className="border-slate-200/80 shadow-sm overflow-hidden lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">By report type</CardTitle>
              <CardDescription>Count per report type</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[240px]">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#1B5E3B" }} />
                </div>
              ) : analytics?.reportsByType?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={analytics.reportsByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="report_type"
                      angle={-35}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                      formatter={(value: number) => [value, "Count"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#1B5E3B"
                      strokeWidth={2}
                      dot={{ fill: "#1B5E3B", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-slate-500 text-sm">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* User activity */}
          <Card className="border-slate-200/80 shadow-sm overflow-hidden lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Daily activity</CardTitle>
              <CardDescription>New reports submitted per day</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[220px]">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#1B5E3B" }} />
                </div>
              ) : analytics?.userActivity?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                      formatter={(value: number) => [value, "Reports"]}
                    />
                    <Bar dataKey="new_reports" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
