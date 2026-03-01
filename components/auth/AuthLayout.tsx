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
      <div className="lg:hidden p-6 text-center" style={{ background: "linear-gradient(135deg, #8B3020 0%, #C9433B 60%, #D96455 100%)" }}>
        <div className="flex justify-center mb-4">
          <div className="relative w-24 h-24 bg-white rounded-full p-3 shadow-xl ring-4 ring-white/20">
            <Image
              src={heroImage || "/logo.png"}
              alt="Nursing and Midwifery Council"
              fill
              className="object-contain p-1"
              priority
            />
          </div>
        </div>
        <div className="space-y-1 text-white">
          <h1 className="text-lg font-bold tracking-tight">
            Nursing and Midwifery Council
          </h1>
          <p className="text-sm text-red-200">Republic of Ghana</p>
          <p className="text-xs text-red-300">Standards &bull; Protection &bull; Service</p>
        </div>
      </div>

      {/* Left side — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right side — Hero Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12"
        style={{ background: "linear-gradient(145deg, #8B3020 0%, #C9433B 50%, #D96455 100%)" }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 2px, transparent 2px),
                           radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 2px, transparent 2px)`,
          backgroundSize: "50px 50px"
        }} />

        {/* Decorative circles */}
        <div className="absolute top-8 right-8 w-32 h-32 rounded-full border border-white/10" />
        <div className="absolute bottom-12 left-8 w-48 h-48 rounded-full border border-white/10" />
        <div className="absolute top-1/3 left-4 w-16 h-16 rounded-full border border-white/10" />

        <div className="relative z-10 text-center max-w-lg space-y-8">
          {/* Logo — large and prominent */}
          <div className="flex justify-center">
            <div className="relative w-56 h-56 bg-white rounded-full shadow-2xl ring-8 ring-white/20 flex items-center justify-center">
              <Image
                src={heroImage || "/logo.png"}
                alt="Nursing and Midwifery Council of Ghana"
                width={200}
                height={200}
                className="object-contain w-44 h-44"
                priority
              />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3 text-white">
            <h1 className="text-3xl font-bold tracking-tight">
              Nursing and Midwifery Council
            </h1>
            <p className="text-lg font-medium text-red-200">Republic of Ghana</p>
            <div className="w-16 h-0.5 bg-red-400 mx-auto rounded-full" />
            <p className="text-sm text-red-300 font-medium tracking-widest uppercase">
              Standards &bull; Protection &bull; Service
            </p>
            <p className="text-xs text-red-400 mt-2">Ministry of Health</p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3 text-center mt-6">
            {[
              { label: "Data Entry", desc: "Structured reporting" },
              { label: "Analytics", desc: "Real-time insights" },
              { label: "Reporting", desc: "Reporting" },
            ].map((feat) => (
              <div key={feat.label} className="bg-white/10 rounded-xl p-3 border border-white/15">
                <p className="text-xs font-bold text-white">{feat.label}</p>
                <p className="text-[10px] text-red-300 mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
