import type React from "react"
import Image from "next/image"

interface AuthLayoutProps {
  children: React.ReactNode
  heroImage?: string
}

export default function AuthLayout({
  children,
  heroImage = "/logo.png",
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1e3a5f] items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={heroImage || "/placeholder.svg"}
            alt="Nursing and Midwifery Council"
            fill
            className="object-cover opacity-90"
            priority
          />
        </div>
        <div className="relative z-10 text-center max-w-2xl">
        </div>
      </div>
    </div>
  )
}
