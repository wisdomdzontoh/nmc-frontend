"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import AuthLayout from "./AuthLayout"

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage("Password reset link sent to your email.")
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative w-10 h-10">
            <Image src="/logo.png" alt="Nursing and Midwifery Council Logo" fill className="object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight">Nursing and Midwifery Council</span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">{error}</div>}

          {message && (
            <div className="p-3 text-sm text-emerald-600 bg-emerald-50 rounded-md border border-emerald-200">
              {message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border-gray-300"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-black hover:bg-black/90 text-white font-medium rounded-md"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-foreground font-medium hover:underline">
            Back to Login
          </Link>
        </div>

        <div className="pt-4 text-center text-sm text-muted-foreground">
          Don't have the code?{" "}
          <Link href="/contact" className="text-foreground font-medium hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
