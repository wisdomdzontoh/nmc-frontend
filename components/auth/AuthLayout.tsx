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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-[#1e3a5f] to-[#2c5282] p-6 text-center">
        <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32 bg-white rounded-full p-8 shadow-lg">
            <Image
              src={heroImage || "/logo.png"}
              alt="Nursing and Midwifery Council"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="space-y-2 text-white">
          <h1 className="text-lg font-bold tracking-tight">
            Nursing and Midwifery Council
          </h1>
          <p className="text-sm text-blue-100">
            Republic of Ghana
          </p>
          <p className="text-xs text-blue-200">
            Standards • Protection • Service
          </p>
        </div>
      </div>

      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right side - Hero with Logo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] items-center justify-center p-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 2px, transparent 2px)`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        {/* Logo Display */}
        <div className="relative z-10 text-center max-w-2xl space-y-8">
          {/* Main Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-64 h-64 bg-white rounded-full p-10 shadow-2xl">
              <Image
                src={heroImage || "/logo.png"}
                alt="Nursing and Midwifery Council"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          {/* Organization Info */}
          <div className="space-y-4 text-white">
            <h1 className="text-3xl font-bold tracking-tight">
              Nursing and Midwifery Council
            </h1>
            <p className="text-lg text-blue-100">
              Republic of Ghana
            </p>
            <div className="space-y-2 text-sm text-blue-200">
              <p>Standards • Protection • Service</p>
              <p className="text-xs opacity-80">
                Ministry of Health
              </p>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="flex justify-center space-x-2 mt-8">
            <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
            <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
            <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
