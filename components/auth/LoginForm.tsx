"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { InlineNotice } from "@/components/common/inline-notice"
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import AuthLayout from "./AuthLayout"

// ── Zod schema ───────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email address")
    .email("Enter a valid email address, e.g. name@nmc.gov.gh"),
  password: z
    .string()
    .min(1, "Enter your password"),
})

type LoginFormValues = z.infer<typeof loginSchema>


function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs font-medium text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

const LoginForm: React.FC = () => {
  const { login, loading, error, clearError } = useAuth()
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data: LoginFormValues) => {
    if (error) clearError()
    setIsSubmitting(true)
    try {
      await login(data.email, data.password)
      router.push("/dashboard")
    } catch (err: unknown) {
      console.error("Login error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isSubmitting || loading
  const emailField = register("email")

  return (
    <AuthLayout>
      <div className="login-card rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the email address and password your administrator gave you.
        </p>

        {error && (
          <InlineNotice tone="error" className="mt-5" title="We couldn't sign you in">
            {error}
          </InlineNotice>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. name@nmc.gov.gh"
              {...emailField}
              onChange={(e) => {
                emailField.onChange(e)
                if (error) clearError()
              }}
              className="h-10"
              disabled={busy}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                className="h-10 pr-10"
                disabled={busy}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                disabled={busy}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError id="password-error" message={errors.password?.message} />
          </div>

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-6 border-t border-dashed border-border pt-5 text-center text-sm text-muted-foreground">
          Need an account or forgot your password? Contact the M&amp;E department for support.
        </p>
      </div>
    </AuthLayout>
  )
}

export default LoginForm
