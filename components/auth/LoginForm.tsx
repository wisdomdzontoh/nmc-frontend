"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Eye, EyeOff, Phone, Mail, MapPin, UserCog, X } from "lucide-react"
import AuthLayout from "./AuthLayout"

// ── Zod schema ───────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ── Admin contacts ────────────────────────────────────────────────────────────
const ADMIN_CONTACTS = [
  {
    name: "System Administrator",
    role: "IT Support",
    email: "admin@nmc.gov.gh",
    phone: "+233 30 221 5400",
  },
  {
    name: "NMC Help Desk",
    role: "Technical Support",
    email: "helpdesk@nmc.gov.gh",
    phone: "+233 30 221 5401",
  },
]

const LoginForm: React.FC = () => {
  const { login, loading, error, clearError } = useAuth()
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)

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

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Desktop logo + title */}
        <div className="hidden lg:block text-center space-y-4">
          {/* Dual-crest logo — full landscape width, proper aspect ratio */}
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Ministry of Health & Nursing and Midwifery Council of Ghana"
              width={260}
              height={80}
              className="object-contain"
              style={{ height: "80px", width: "auto" }}
              priority
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#C9433B] uppercase">IMEMS</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 leading-snug">
              Integrated Monitoring &amp; Evaluation<br />Management System
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
              Nursing and Midwifery Council of Ghana
            </p>
          </div>
        </div>

        {/* Welcome text */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-sm text-gray-500">Enter your credentials to access the system</p>
        </div>

        {/* Auth error */}
        {error && (
          <Alert className="border-[#E8877A] bg-[#FEF0EC]">
            <AlertDescription className="text-[#8B3020]">{error}</AlertDescription>
          </Alert>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address <span className="text-[#C9433B]">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              className={`h-11 border-gray-300 focus-visible:ring-[#C9433B] ${errors.email ? "border-[#E8877A] focus-visible:ring-[#C9433B]" : ""}`}
              disabled={isSubmitting}
              autoComplete="email"
              onChange={(e) => { register("email").onChange(e); if (error) clearError() }}
            />
            {errors.email && (
              <p className="text-xs text-[#C9433B] flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-[#C9433B] flex-shrink-0" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password <span className="text-[#C9433B]">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                className={`h-11 pr-10 border-gray-300 focus-visible:ring-[#C9433B] ${errors.password ? "border-[#E8877A] focus-visible:ring-[#C9433B]" : ""}`}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-[#C9433B] flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-[#C9433B] flex-shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full h-11 font-semibold text-white shadow-sm"
            style={{
              background: isSubmitting || loading
                ? "#D96455"
                : "linear-gradient(135deg, #C9433B, #D96455)",
            }}
          >
            {isSubmitting || loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-2 pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500">Need access or forgot your password?</p>
          <button
            type="button"
            onClick={() => setContactModalOpen(true)}
            className="text-sm font-medium text-[#C9433B] hover:text-[#8B3020] underline underline-offset-2 transition-colors"
          >
            Contact Administrator
          </button>
        </div>
      </div>

      {/* Admin Contact Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: "#FCC6BB" }}>
                <UserCog className="h-5 w-5" style={{ color: "#C9433B" }} />
              </div>
              <DialogTitle className="text-gray-900">Contact Administrator</DialogTitle>
            </div>
            <button
              onClick={() => setContactModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              For account access, password resets, or technical issues, contact an administrator below:
            </p>

            <div className="space-y-3">
              {ADMIN_CONTACTS.map((contact) => (
                <div
                  key={contact.email}
                  className="rounded-lg border border-[#FCC6BB] p-4"
                  style={{ background: "#FEF0EC" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #C9433B, #D96455)" }}
                    >
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                      <p className="text-xs text-gray-500 mb-2">{contact.role}</p>
                      <div className="space-y-1">
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-2 text-xs text-[#C9433B] hover:text-[#8B3020] no-underline transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          {contact.email}
                        </a>
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-2 text-xs text-[#C9433B] hover:text-[#8B3020] no-underline transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800">NMC Head Office</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Nursing and Midwifery Council of Ghana<br />
                  P.O. Box GP 3405, Accra, Ghana
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Office hours: Monday &ndash; Friday, 8:00 AM &ndash; 5:00 PM GMT
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  )
}

export default LoginForm
