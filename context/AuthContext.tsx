"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient, type SupabaseClient, type Session, type User as SupabaseUser } from "@supabase/supabase-js"
import api from "@/lib/api"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

interface DjangoUser {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_active: boolean
  org_unit: number | null
  org_unit_name: string | null
}

interface AuthContextType {
  supabaseUser: SupabaseUser | null
  djangoUser: DjangoUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  supabaseUser: null,
  djangoUser: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [djangoUser, setDjangoUser] = useState<DjangoUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDjangoUser = useCallback(async (token: string) => {
    try {
      console.log("[v0] Fetching Django user with token")
      console.log("[v0] Token length:", token.length)
      console.log("[v0] Token starts with:", token.substring(0, 20) + "...")

      // Store token in localStorage first so the API interceptor can use it
      localStorage.setItem("access_token", token)
      
      const { data } = await api.get("/users/me/")

      console.log("[v0] Django user fetched successfully:", data)
      setDjangoUser(data)
      setError(null)
    } catch (error: any) {
      console.error("[v0] Failed to fetch Django user:", error)
      console.error("[v0] Error response:", error.response?.data)
      console.error("[v0] Error status:", error.response?.status)
      setDjangoUser(null)

      if (error.response?.status === 403) {
        const errorDetail = error.response?.data?.detail || "Unknown error"
        console.error("[v0] 403 Error detail:", errorDetail)

        setError(
          `Authentication failed: ${errorDetail}. Please check your Django SUPABASE_JWT_SECRET environment variable.`,
        )
      } else {
        setError("Failed to connect to backend. Please try again later.")
      }
    }
  }, [])

  const handleSessionChange = useCallback(
    async (session: Session | null) => {
      if (session) {
        setSupabaseUser(session.user)
        localStorage.setItem("access_token", session.access_token)
        localStorage.setItem("refresh_token", session.refresh_token)
        await fetchDjangoUser(session.access_token)
      } else {
        setSupabaseUser(null)
        setDjangoUser(null)
        setError(null)
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
      }
      setLoading(false)
    },
    [fetchDjangoUser],
  )

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionChange(session)
    })

    supabase.auth.getSession().then(({ data }) => {
      handleSessionChange(data.session)
    })

    return () => subscription.subscription.unsubscribe()
  }, [handleSessionChange])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(error.message)
    }
    await handleSessionChange(data.session)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    await handleSessionChange(null)
  }

  return (
    <AuthContext.Provider value={{ supabaseUser, djangoUser, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
