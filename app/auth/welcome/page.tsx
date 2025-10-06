"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AuthLayout from "@/components/auth/AuthLayout"
import Image from "next/image"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function WelcomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      if (!user) {
        setError("Your session is not active. Please use the latest email link.")
        setLoading(false)
        return
      }
      const flag = Boolean((user.user_metadata as Record<string, unknown>)?.password_set === false)
      setNeedsPassword(flag)
      setLoading(false)
    })()
  }, [])

  const handleSetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setIsSubmitting(true)
    const { error } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    })
    setIsSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    window.location.assign("/")
  }

  if (loading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Preparing your account…</div>
  }

  if (!needsPassword) {
    if (typeof window !== "undefined") window.location.replace("/")
    return null
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative w-10 h-10">
            <Image 
              src="/logo.png" 
              alt="NMC Logo" 
              fill 
              className="object-contain" 
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Nursing and Midwifery Council
            </h1>
            <p className="text-sm text-muted-foreground">
              Reporting System
            </p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Set Your Password</h2>
          <p className="text-sm text-muted-foreground">
            You’re signed in from the email link. Create a password so you can log in next time.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Set Password Form */}
        <form onSubmit={handleSetPassword} className="space-y-4">
          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              New Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-11"
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
          </div>
          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm font-medium">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="h-11"
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
          </div>
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {isSubmitting ? "Saving..." : "Save password & continue"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
