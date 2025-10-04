import axios from "axios"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
})

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("access_token")
  const refresh_token = localStorage.getItem("refresh_token")

  console.log("[v0] API request to:", config.url)
  console.log("[v0] Token exists:", !!token)

  if (token) {
    // Decode token to inspect payload (without verification)
    try {
      const base64Url = token.split(".")[1]
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      const payload = JSON.parse(window.atob(base64))
      console.log("[v0] Token payload:", {
        email: payload.email,
        exp: new Date(payload.exp * 1000).toISOString(),
        iat: new Date(payload.iat * 1000).toISOString(),
        iss: payload.iss,
        sub: payload.sub,
      })
      console.log("[v0] Token expired?", payload.exp * 1000 < Date.now())
    } catch (e) {
      console.error("[v0] Failed to decode token:", e)
    }
  }

  // Refresh token if expired
  if (!token && refresh_token) {
    console.log("[v0] Attempting token refresh")
    const { data, error } = await supabase.auth.refreshSession({ refresh_token })
    if (error) {
      console.error("[v0] Token refresh failed:", error.message)
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
    } else if (data.session) {
      token = data.session.access_token
      localStorage.setItem("access_token", token)
      localStorage.setItem("refresh_token", data.session.refresh_token)
      console.log("[v0] Token refreshed successfully")
    }
  }

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`
    console.log("[v0] Authorization header set")
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[v0] API Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    })
    return Promise.reject(error)
  },
)

export default api
