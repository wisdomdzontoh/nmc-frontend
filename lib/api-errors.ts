import axios from "axios"

export type FriendlyError = {
  title: string
  message: string
}

/** Pull a plain-language message the backend sent (DRF `detail`, `error`, `message` or a field list). */
function backendMessage(data: unknown): string | null {
  if (!data) return null
  if (typeof data === "string") return data.length < 200 && !data.trim().startsWith("<") ? data : null
  if (typeof data !== "object") return null
  const record = data as Record<string, unknown>
  for (const key of ["detail", "error", "message"]) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

/**
 * Turn any thrown error into words a user can act on: what happened + what to do next.
 * Use this instead of showing `error.message` from the server.
 */
export function getFriendlyError(error: unknown, fallback = "Please try again."): FriendlyError {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return {
        title: "We couldn't connect",
        message: "Check your internet connection and try again.",
      }
    }
    const status = error.response.status
    const detail = backendMessage(error.response.data)
    if (status === 401) {
      return {
        title: "You've been signed out",
        message: "Your session ended. Sign in again to continue.",
      }
    }
    if (status === 403) {
      return {
        title: "You don't have access",
        message: detail ?? "If you need this, ask your administrator.",
      }
    }
    if (status === 404) {
      return {
        title: "We couldn't find that",
        message: "It may have been removed or moved. Go back and try again.",
      }
    }
    if (status >= 500) {
      return {
        title: "Something went wrong on our side",
        message: "Please try again in a moment. If it keeps happening, tell your administrator.",
      }
    }
    return {
      title: "That didn't work",
      message: detail ?? "Check the details and try again.",
    }
  }
  if (error instanceof Error && error.message) {
    return { title: "That didn't work", message: error.message }
  }
  if (typeof error === "string" && error.trim()) {
    return { title: "That didn't work", message: error }
  }
  return { title: "That didn't work", message: fallback }
}
