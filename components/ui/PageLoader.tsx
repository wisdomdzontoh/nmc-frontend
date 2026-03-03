"use client"

import Image from "next/image"

interface LoaderProps {
  message?: string
}

/**
 * PageLoader — full-screen branded loading screen.
 * Use for top-level auth/initialization loading (before layout renders).
 */
export function PageLoader({ message = "Loading…" }: LoaderProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-white">
      <div className="flex flex-col items-center gap-5">
        {/* Logo + dual-ring spinner */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Outer slow counter-rotating ring */}
          <div
            className="absolute rounded-full animate-spin"
            style={{
              inset: "-10px",
              border: "1.5px solid rgba(201,67,59,0.07)",
              borderTopColor: "rgba(201,67,59,0.22)",
              animationDuration: "2.4s",
              animationDirection: "reverse",
            }}
          />
          {/* Inner fast ring */}
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: "2.5px solid rgba(201,67,59,0.10)",
              borderTopColor: "#C9433B",
              animationDuration: "0.85s",
            }}
          />
          {/* Logo */}
          <div className="relative w-16 h-16">
            <Image
              src="/logo.png"
              alt="NMC Ghana"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Org name */}
        <div className="text-center space-y-0.5">
          <p className="text-sm font-semibold text-gray-700 tracking-tight">
            Nursing &amp; Midwifery Council
          </p>
          <p className="text-xs text-gray-400">Republic of Ghana</p>
        </div>
      </div>

      {/* Indeterminate shimmer bar */}
      <div className="w-44 h-[2px] rounded-full bg-gray-100 overflow-hidden relative">
        <div
          className="absolute inset-y-0 w-2/5 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, #C9433B, transparent)",
            animation: "nmc-shimmer 1.5s ease-in-out infinite",
          }}
        />
      </div>

      <p className="text-xs text-gray-400 tracking-wide">{message}</p>
    </div>
  )
}

/**
 * SectionLoader — centered loading block used within page sections.
 * Use when the dashboard layout (header + sidebar) is already visible.
 */
export function SectionLoader({ message = "Loading…" }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      {/* Logo + spinner ring */}
      <div className="relative flex items-center justify-center w-16 h-16">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: "2px solid rgba(201,67,59,0.10)",
            borderTopColor: "#C9433B",
            animationDuration: "0.85s",
          }}
        />
        <div className="relative w-10 h-10">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
