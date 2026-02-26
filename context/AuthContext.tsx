/**
 * Authentication Context for NMC Project
 * Pure Django JWT-based authentication (no Supabase).
 */

"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import api from "@/lib/api"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DjangoUser {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  is_staff: boolean
  is_superuser: boolean
  is_active: boolean
  org_unit: number | null
  org_unit_name: string | null
  date_joined: string
  last_login: string | null
}

export interface AuthState {
  djangoUser: DjangoUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  clearError: () => void
}

export type AuthContextType = AuthState & AuthActions

// ---------------------------------------------------------------------------
// Context setup
// ---------------------------------------------------------------------------

const defaultAuthContext: AuthContextType = {
  djangoUser: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
  clearError: () => {},
}

const AuthContext = createContext<AuthContextType>(defaultAuthContext)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [djangoUser, setDjangoUser] = useState<DjangoUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = Boolean(djangoUser)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchDjangoUser = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get("/users/me/")
      setDjangoUser(response.data)
      setError(null)
    } catch (err: any) {
      setDjangoUser(null)
      if (err?.response?.status === 401) {
        setError("Session expired. Please log in again.")
      } else if (err?.response?.status === 403) {
        setError("Access denied. Please contact your administrator.")
      } else {
        setError("Failed to load user data. Please try again.")
      }
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setError(null)
      setLoading(true)
      const response = await api.post("/users/auth/login/", { email, password })
      const { access, refresh, user } = response.data
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", access)
        localStorage.setItem("refresh_token", refresh)
      }
      setDjangoUser(user)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed. Please check your credentials.")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
    }
    setDjangoUser(null)
    setError(null)
  }, [])

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      await fetchDjangoUser()
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
      }
      setDjangoUser(null)
      setError("Session expired. Please log in again.")
    }
  }, [fetchDjangoUser])

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        if (typeof window === "undefined") {
          setLoading(false)
          return
        }
        const token = localStorage.getItem("access_token")
        if (!token) {
          setDjangoUser(null)
          return
        }
        await fetchDjangoUser()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [fetchDjangoUser])

  const contextValue: AuthContextType = {
    djangoUser,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    refreshSession,
    clearError,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

