/**
 * Modern Authentication Context for NMC Project
 * Clean, type-safe, and maintainable authentication system
 */

"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient, type SupabaseClient, type Session, type User as SupabaseUser } from "@supabase/supabase-js"
import api from "@/lib/api"

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions
interface DjangoUser {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  is_staff: boolean
  is_active: boolean
  org_unit: number | null
  org_unit_name: string | null
  date_joined: string
  last_login: string | null
}

interface AuthState {
  supabaseUser: SupabaseUser | null
  djangoUser: DjangoUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  clearError: () => void
}

type AuthContextType = AuthState & AuthActions

// Default context value
const defaultAuthContext: AuthContextType = {
  supabaseUser: null,
  djangoUser: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
  clearError: () => {},
}

// Create context
const AuthContext = createContext<AuthContextType>(defaultAuthContext)

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State management
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [djangoUser, setDjangoUser] = useState<DjangoUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Computed state
  const isAuthenticated = Boolean(supabaseUser && djangoUser)

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Fetch Django user data
  const fetchDjangoUser = useCallback(async (token: string): Promise<void> => {
    try {
      console.log("[AUTH] Fetching Django user data...")
      
      // Store token for API interceptor
      localStorage.setItem("access_token", token)
      
      // Fetch user data from Django backend
      const response = await api.get("/users/me/")
      
      console.log("[AUTH] Django user data fetched successfully")
      setDjangoUser(response.data)
      setError(null)
      
    } catch (error: any) {
      console.error("[AUTH] Failed to fetch Django user:", error)
      
      setDjangoUser(null)
      
      // Handle different error types
      if (error.response?.status === 401) {
        setError("Session expired. Please log in again.")
      } else if (error.response?.status === 403) {
        setError("Access denied. Please contact your administrator.")
      } else if (error.response?.status >= 500) {
        setError("Server error. Please try again later.")
      } else {
        setError("Failed to load user data. Please try again.")
      }
    }
  }, [])

  // Handle session changes
  const handleSessionChange = useCallback(async (session: Session | null): Promise<void> => {
    console.log("[AUTH] Session changed:", session ? "authenticated" : "not authenticated")
    
    if (session?.user) {
      setSupabaseUser(session.user)
      
      // Store tokens
      localStorage.setItem("access_token", session.access_token)
      localStorage.setItem("refresh_token", session.refresh_token)
      
      // Fetch Django user data
      await fetchDjangoUser(session.access_token)
    } else {
      // Clear all auth data
      setSupabaseUser(null)
      setDjangoUser(null)
      setError(null)
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
    }
    
    setLoading(false)
  }, [fetchDjangoUser])

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      console.log("[AUTH] Attempting login for:", email)
      setError(null)
      setLoading(true)
      
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (supabaseError) {
        throw new Error(supabaseError.message)
      }
      
      if (!data.session) {
        throw new Error("No session returned from Supabase")
      }
      
      console.log("[AUTH] Supabase login successful")
      await handleSessionChange(data.session)
      
    } catch (error: any) {
      console.error("[AUTH] Login failed:", error)
      setError(error.message || "Login failed. Please check your credentials.")
      setLoading(false)
      throw error
    }
  }, [handleSessionChange])

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log("[AUTH] Logging out...")
      await supabase.auth.signOut()
      await handleSessionChange(null)
      console.log("[AUTH] Logout successful")
    } catch (error: any) {
      console.error("[AUTH] Logout error:", error)
      // Force clear local state even if Supabase logout fails
      await handleSessionChange(null)
    }
  }, [handleSessionChange])

  // Refresh session function
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      console.log("[AUTH] Refreshing session...")
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        throw new Error(refreshError.message)
      }
      
      if (data.session) {
        await handleSessionChange(data.session)
      } else {
        await handleSessionChange(null)
      }
    } catch (error: any) {
      console.error("[AUTH] Session refresh failed:", error)
      await handleSessionChange(null)
    }
  }, [handleSessionChange])

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("[AUTH] Error getting session:", error)
          if (mounted) {
            setError("Failed to initialize authentication")
            setLoading(false)
          }
          return
        }
        
        if (mounted) {
          await handleSessionChange(session)
        }
      } catch (error) {
        console.error("[AUTH] Auth initialization error:", error)
        if (mounted) {
          setError("Authentication initialization failed")
          setLoading(false)
        }
      }
    }
    
    initializeAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH] Auth state change:", event)
        if (mounted) {
          await handleSessionChange(session)
        }
      }
    )
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [handleSessionChange])

  // Context value
  const contextValue: AuthContextType = {
    supabaseUser,
    djangoUser,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    refreshSession,
    clearError,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  
  return context
}

// Export types for external use
export type { DjangoUser, AuthState, AuthActions, AuthContextType }