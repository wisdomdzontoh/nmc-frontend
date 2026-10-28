"use client"

import Image from "next/image"

interface LoaderProps {
  message?: string
}

/**
 * PageLoader — full-screen branded loading screen.
 * Use for top-level auth/initialisation loading (before the app shell renders).
 */
export function PageLoader({ message = "Loading…" }: LoaderProps) {
  return (
    <div className="canvas-dots flex min-h-screen flex-col items-center justify-center gap-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-10 py-8 shadow-[var(--shadow-card)]">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/15 border-t-primary [animation-duration:0.85s]" />
          <div className="relative h-12 w-12">
            <Image src="/logo.png" alt="" fill sizes="48px" className="object-contain" priority />
          </div>
        </div>
        <div className="space-y-0.5 text-center">
          <p className="text-sm font-semibold text-foreground">Nursing &amp; Midwifery Council</p>
          <p className="text-xs text-muted-foreground">Republic of Ghana</p>
        </div>
        <div className="relative h-0.5 w-40 overflow-hidden rounded-full bg-muted">
          <div className="loader-shimmer absolute inset-y-0 w-2/5 rounded-full" />
        </div>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

/**
 * SectionLoader — centred loading block used inside a page when the shell is already visible.
 * Prefer a skeleton shaped like the final content where you can.
 */
export function SectionLoader({ message = "Loading…" }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16" role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/15 border-t-primary [animation-duration:0.85s]" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
