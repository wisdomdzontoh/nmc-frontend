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
      {/* ── Mobile Header ─────────────────────────────────────── */}
      <div
        className="lg:hidden p-6 text-center"
        style={{ background: "linear-gradient(135deg, #C9433B 0%, #D96455 60%, #E8877A 100%)" }}
      >
        <div className="flex justify-center mb-4">
          {/* No white bg disc — mix-blend-mode removes white pixels on the red gradient */}
          <div className="relative w-28 h-28 drop-shadow-lg">
            <Image
              src={heroImage || "/logo.png"}
              alt="Nursing and Midwifery Council"
              fill
              className="object-contain"
              style={{ mixBlendMode: "multiply" }}
              priority
            />
          </div>
        </div>
        <div className="space-y-1 text-white">
          <h1 className="text-lg font-bold tracking-tight">
            Nursing and Midwifery Council
          </h1>
          <p className="text-sm text-white/70">Republic of Ghana</p>
          <p className="text-xs text-white/50 tracking-widest uppercase">
            Standards &bull; Protection &bull; Service
          </p>
        </div>
      </div>

      {/* Left side — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right side — Hero Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12"
        style={{ background: "linear-gradient(145deg, #C9433B 0%, #D96455 50%, #E8877A 100%)" }}
      >
        {/* Dot-pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Decorative rings */}
        <div className="absolute top-8 right-8 w-36 h-36 rounded-full border border-white/10" />
        <div className="absolute bottom-12 left-8 w-52 h-52 rounded-full border border-white/10" />
        <div className="absolute top-1/3 left-4 w-20 h-20 rounded-full border border-white/10" />

        <div className="relative z-10 text-center max-w-lg space-y-8">
          {/* Dual-crest logo — white card makes the white PNG background intentional */}
          <div className="flex justify-center">
            <div
              className="bg-white rounded-2xl px-10 py-6"
              style={{
                boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)",
              }}
            >
              <Image
                src={heroImage || "/logo.png"}
                alt="Ministry of Health & Nursing and Midwifery Council of Ghana"
                width={280}
                height={88}
                className="object-contain"
                style={{ height: "88px", width: "auto", maxWidth: "280px" }}
                priority
              />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3 text-white">
            <p className="text-[10px] font-bold tracking-[0.25em] text-white/50 uppercase">
              Republic of Ghana
            </p>
            <h1 className="text-3xl font-bold tracking-tight leading-snug">
              Nursing and Midwifery<br />Council of Ghana
            </h1>
            <div className="w-16 h-0.5 bg-white/40 mx-auto rounded-full" />
            <p className="text-xs font-semibold text-white/55 tracking-widest uppercase">
              Standards &bull; Protection &bull; Service
            </p>
            <p className="text-xs text-white/40 mt-1">Ministry of Health</p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3 text-center mt-6">
            {[
              { label: "Data Entry", desc: "Structured reporting" },
              { label: "Analytics", desc: "Real-time insights" },
              { label: "Reporting", desc: "Export & share" },
            ].map((feat) => (
              <div
                key={feat.label}
                className="bg-white/10 rounded-xl p-3 border border-white/15 backdrop-blur-sm"
              >
                <p className="text-xs font-bold text-white">{feat.label}</p>
                <p className="text-[10px] text-white/55 mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
