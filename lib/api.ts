/**
 * API client for NMC Project
 * Django backend + JWT authentication (no Supabase).
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from "axios"

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://nmc-backend-mr7q.onrender.com/api"

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 100000, // 100 seconds
  headers: {
    "Content-Type": "application/json",
  },
})

// Token management utilities
const TokenManager = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("refresh_token")
  },
  
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === "undefined") return
    localStorage.setItem("access_token", accessToken)
    localStorage.setItem("refresh_token", refreshToken)
  },
  
  clearTokens: (): void => {
    if (typeof window === "undefined") return
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
  },
  
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      return payload.exp < currentTime
    } catch {
      return true
    }
  },
}

// Request interceptor: attach JWT and refresh when expired
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getAccessToken()

    if (token) {
      if (TokenManager.isTokenExpired(token)) {
        console.log("[API] Access token expired, attempting refresh...")
        const refreshToken = TokenManager.getRefreshToken()
        if (refreshToken) {
          try {
            const refreshResponse = await axios.post(
              `${API_BASE_URL}/users/auth/refresh/`,
              { refresh: refreshToken },
              { headers: { "Content-Type": "application/json" } }
            )
            const newAccess = refreshResponse.data?.access as string
            if (newAccess) {
              TokenManager.setTokens(newAccess, refreshToken)
              const headers = new AxiosHeaders(config.headers)
              headers.set("Authorization", `Bearer ${newAccess}`)
              config.headers = headers
            } else {
              TokenManager.clearTokens()
            }
          } catch (err) {
            console.error("[API] Token refresh error:", err)
            TokenManager.clearTokens()
          }
        } else {
          TokenManager.clearTokens()
        }
      } else {
        const headers = new AxiosHeaders(config.headers)
        headers.set("Authorization", `Bearer ${token}`)
        config.headers = headers
      }
    }

    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error("[API] Request error:", error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API] ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error("[API] Response error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    })
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      console.log("[API] Unauthorized, clearing tokens")
      TokenManager.clearTokens()
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login"
      }
    }
    
    return Promise.reject(error)
  }
)

// API methods with proper typing
export const ApiClient = {
  // User endpoints
  getCurrentUser: () => api.get("/users/me/"),
  getUserProfile: () => api.get("/users/profile/"),
  
  // Admin endpoints
  getUsers: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/users/", { params }),
  getUser: (id: number) => api.get(`/users/${id}/`),
  createUser: (data: unknown) => api.post("/users/", data),
  updateUser: (id: number, data: unknown) => api.patch(`/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}/`),
  resetUserPassword: (id: number, data: { new_password: string }) => api.post(`/users/${id}/reset-password/`, data),
  
  // Organization endpoints
  getOrgUnits: () => api.get("/org/tree/"),
  getOrgUnit: (id: number) => api.get(`/org/units/${id}/`),
  createOrgUnit: (data: unknown) => api.post("/org/units/", data),
  updateOrgUnit: (id: number, data: unknown) => api.patch(`/org/units/${id}/`, data),
  deleteOrgUnit: (id: number) => api.delete(`/org/units/${id}/`),
  
  // Metadata endpoints
  getReportTypes: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/metadata/report-types/", { params }),
  getReportType: (id: number) => api.get(`/metadata/report-types/${id}/`),
  createReportType: (data: unknown) => api.post("/metadata/report-types/", data),
  updateReportType: (id: number, data: unknown) => api.patch(`/metadata/report-types/${id}/`, data),
  deleteReportType: (id: number) => api.delete(`/metadata/report-types/${id}/`),
  
  getReportPeriods: () => api.get("/metadata/report-periods/"),
  getReportPeriod: (id: number) => api.get(`/metadata/report-periods/${id}/`),
  createReportPeriod: (data: unknown) => api.post("/metadata/report-periods/", data),
  updateReportPeriod: (id: number, data: unknown) => api.patch(`/metadata/report-periods/${id}/`, data),
  deleteReportPeriod: (id: number) => api.delete(`/metadata/report-periods/${id}/`),
  
  // Reporting endpoints
  getReports: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/reporting/reports/", { params }),
  getReport: (id: number) => api.get(`/reporting/reports/${id}/`),
  createReport: (data: unknown) => api.post("/reporting/reports/", data),
  updateReport: (id: number, data: unknown) => api.patch(`/reporting/reports/${id}/`, data),
  deleteReport: (id: number) => api.delete(`/reporting/reports/${id}/`),
  exportReport: (id: number, format: string = "pdf") => api.get(`/reporting/reports/${id}/export/`, { 
    params: { format },
    responseType: "blob"
  }),
  
  // Data entry endpoint
  submitDataEntry: (data: unknown) => api.post("/reporting/data-entry/", data),

  // Aggregated report (period-range aggregation for report generation)
  getAggregatedReport: (params: {
    report_type: number
    org_unit: number
    period_start: string
    period_end: string
  }) => api.get("/reporting/aggregated-report/", { params }),

  getReportingRateSummary: (params: {
    period_type: "monthly" | "quarterly" | "yearly"
    year: number | string
    period?: string
    org_unit?: string | number
  }) => api.get("/reporting/reporting-rate-summary/", { params }),
  
  // Analytics endpoints
  getAnalytics: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/", { params }),
  getAnalyticsSummary: () => api.get("/analytics/summary/"),
  getAnalyticsReports: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/reports/", { params }),
  getAnalyticsUsers: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/users/", { params }),
  getAnalyticsOrgUnits: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/org-units/", { params }),
  getPivotData: (body: {
    org_units: "all" | number[];
    data_elements: number[];
    indicators?: number[];
    period_type: string;
    start_date: string;
    end_date: string;
  }) => api.post("/analytics/pivot/", body),

  // Data Elements endpoints
  getDataElements: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/metadata/data-elements/", { params }),
  getDataElement: (id: number) => api.get(`/metadata/data-elements/${id}/`),
  createDataElement: (data: unknown) => api.post("/metadata/data-elements/", data),
  updateDataElement: (id: number, data: unknown) => api.patch(`/metadata/data-elements/${id}/`, data),
  deleteDataElement: (id: number) => api.delete(`/metadata/data-elements/${id}/`),
  
  // Indicators endpoints
  getIndicators: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/metadata/indicators/", { params }),
  getIndicator: (id: number) => api.get(`/metadata/indicators/${id}/`),
  createIndicator: (data: unknown) => api.post("/metadata/indicators/", data),
  updateIndicator: (id: number, data: unknown) => api.patch(`/metadata/indicators/${id}/`, data),
  deleteIndicator: (id: number) => api.delete(`/metadata/indicators/${id}/`),
  
  // Enhanced calculation endpoints
  evaluateIndicator: (data: { indicator_id: number; values: Record<string, number> }) => api.post("/metadata/indicators/evaluate/", data),
  validateFormula: (data: { formula: string; data_elements: string[] }) => api.post("/metadata/formulas/validate/", data),
  getIndicatorStatistics: () => api.get("/metadata/indicators/statistics/"),
  
  // Report type assignment endpoints
  getReportTypeAssignments: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/metadata/report-type-assignments/", { params }),
  getReportTypeAssignment: (id: number) => api.get(`/metadata/report-type-assignments/${id}/`),
  createReportTypeAssignment: (data: unknown) => api.post("/metadata/report-type-assignments/", data),
  updateReportTypeAssignment: (id: number, data: unknown) => api.patch(`/metadata/report-type-assignments/${id}/`, data),
  deleteReportTypeAssignment: (id: number) => api.delete(`/metadata/report-type-assignments/${id}/`),
  getAvailableReportTypes: () => api.get("/metadata/available-report-types/"),
  getAvailableReportTypesForEntry: () => api.get("/metadata/available-report-types-for-entry/"),
  getOrgUnitAssignments: (orgUnitId: number) => api.get(`/metadata/org-units/${orgUnitId}/assignments/`),
  
  // Export endpoints
  exportData: (type: string, format: string = "csv", params?: Record<string, string | number | boolean | null | undefined>) => api.get(`/exports/${type}/`, {
    params: { format, ...params },
    responseType: "blob"
  }),
}

// Export the configured axios instance
export default api

// Export types for external use
export type { AxiosRequestConfig, AxiosResponse }