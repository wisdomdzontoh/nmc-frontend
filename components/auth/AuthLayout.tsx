import type React from "react"
import Image from "next/image"

interface AuthLayoutProps {
  children: React.ReactNode
  heroImage?: string
}

export default function AuthLayout({ children, heroImage = "/logo.png" }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — dotted canvas, large logo, system name */}
      <section className="login-hero flex flex-col items-center justify-center px-6 py-10 lg:min-h-screen lg:p-12">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto inline-flex rounded-2xl border border-border bg-card px-8 py-6 shadow-[var(--shadow-card)] lg:px-12 lg:py-8">
            <Image
              src={heroImage}
              alt="Ministry of Health and Nursing and Midwifery Council of Ghana"
              width={265}
              height={148}
              className="h-32 w-auto object-contain sm:h-40 lg:h-56"
              priority
            />
          </div>

          <p className="mt-8 text-2xs font-bold tracking-[0.2em] text-primary uppercase">Republic of Ghana</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">IMEMS</h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground lg:text-base">
            Integrated Monitoring &amp; Evaluation Management System
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Nursing and Midwifery Council of Ghana</p>

          <p className="mt-8 hidden text-xs font-medium tracking-widest text-muted-foreground uppercase lg:block">
            Standards &bull; Protection &bull; Service
          </p>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-start justify-center bg-card px-6 pb-10 lg:min-h-screen lg:items-center lg:p-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  )
}
