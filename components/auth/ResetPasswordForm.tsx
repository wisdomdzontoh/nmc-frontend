"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import AuthLayout from "./AuthLayout"

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(false)
    setMessage(
      "Password reset is now handled by the system administrator. Please contact your administrator to update your password."
    )
    setError(null)
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16 bg-card rounded-full p-3 shadow-lg border border-border">
              <Image 
                src="/logo.png" 
                alt="NMC Logo" 
                fill 
                className="object-contain" 
              />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Nursing and Midwifery Council
            </h1>
            <p className="text-sm text-muted-foreground">
              Republic of Ghana • Reporting System
            </p>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below</p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && <div className="p-3 text-sm text-error bg-error-bg rounded-md border border-error-border">{error}</div>}

          {message && (
            <div className="p-3 text-sm text-success bg-success-bg rounded-md border border-success-border">
              {message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              New Password <span className="text-error">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm Password <span className="text-error">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-11 border-border"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-black hover:bg-black/90 text-white font-medium rounded-md"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-foreground font-medium hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
