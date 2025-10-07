/**
 * Modern API Client for NMC Project
 * Clean, secure, and maintainable API communication
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from "axios"
import { createClient } from "@supabase/supabase-js"

// Supabase client for token management
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getAccessToken()
    
    if (token) {
      // Check if token is expired
      if (TokenManager.isTokenExpired(token)) {
        console.log("[API] Token expired, attempting refresh...")
        
        const refreshToken = TokenManager.getRefreshToken()
        if (refreshToken) {
          try {
            const { data, error } = await supabase.auth.refreshSession({
              refresh_token: refreshToken,
            })
            
    if (error) {
              console.error("[API] Token refresh failed:", error)
              TokenManager.clearTokens()
              return config
            }
            
            if (data.session) {
              TokenManager.setTokens(data.session.access_token, data.session.refresh_token)
              const headers = new AxiosHeaders(config.headers)
              headers.set("Authorization", `Bearer ${data.session.access_token}`)
              config.headers = headers
              console.log("[API] Token refreshed successfully")
            }
          } catch (error) {
            console.error("[API] Token refresh error:", error)
            TokenManager.clearTokens()
          }
        }
      } else {
        // Token is valid, add to request
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
      // Optionally redirect to login
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
  
  // Organization endpoints
  getOrgUnits: () => api.get("/org/tree/"),
  getOrgUnit: (id: number) => api.get(`/org/units/${id}/`),
  createOrgUnit: (data: unknown) => api.post("/org/units/", data),
  updateOrgUnit: (id: number, data: unknown) => api.patch(`/org/units/${id}/`, data),
  deleteOrgUnit: (id: number) => api.delete(`/org/units/${id}/`),
  
  // Metadata endpoints
  getReportTypes: () => api.get("/metadata/report-types/"),
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
  
  // Analytics endpoints
  getAnalytics: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/", { params }),
  getAnalyticsSummary: () => api.get("/analytics/summary/"),
  getAnalyticsReports: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/reports/", { params }),
  getAnalyticsUsers: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/users/", { params }),
  getAnalyticsOrgUnits: (params?: Record<string, string | number | boolean | null | undefined>) => api.get("/analytics/org-units/", { params }),
  
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