import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #FFF5F3 0%, #ffffff 100%)" }}>
      {/* Header bar */}
      <div className="w-full border-b border-[#C9433B] shadow-md" style={{ background: "linear-gradient(135deg, #C9433B 0%, #D96455 50%, #E8877A 100%)" }}>
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #F4A99E, #D96455, #F4A99E)" }} />
        <div className="h-16 flex items-center gap-3 px-6">
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="NMC Logo"
              width={40}
              height={40}
              className="object-contain"
              style={{ mixBlendMode: "multiply" }}
              priority
            />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight tracking-tight">Nursing &amp; Midwifery Council</h1>
            <p className="text-xs text-white/65">Republic of Ghana</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* 404 graphic */}
          <div className="relative">
            <div
              className="text-[10rem] font-black leading-none select-none"
              style={{
                background: "linear-gradient(135deg, #C9433B, #E8877A, #F4A99E)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white shadow-lg ring-4 ring-[#FCC6BB] flex items-center justify-center" style={{ marginTop: "1rem" }}>
                <Image src="/logo.png" alt="NMC" width={64} height={64} className="object-contain w-16 h-16" />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3 pt-4">
            <h2 className="text-2xl font-bold text-gray-900">Page Not Found</h2>
            <p className="text-gray-500 leading-relaxed">
              The page you&apos;re looking for does not exist or has been moved.
              Please verify the URL or navigate to one of the pages below.
            </p>
          </div>

          {/* Official notice */}
          <div className="rounded-xl border border-[#FCC6BB] p-4 text-left" style={{ background: "#FFF5F3" }}>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#D96455" }} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Official Notice</p>
                <p className="text-xs text-gray-600 mt-1">
                  This is an official system of the Nursing and Midwifery Council of Ghana.
                  Unauthorized access is prohibited under the Electronic Transactions Act, 2008.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg text-white font-semibold text-sm shadow-sm transition-all hover:shadow-md hover:opacity-90 no-underline"
              style={{ background: "linear-gradient(135deg, #D96455, #E8877A)" }}
            >
              Go to Dashboard
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg font-semibold text-sm border border-[#F4A99E] text-[#C9433B] bg-white hover:bg-[#FFF5F3] transition-all no-underline"
            >
              Back to Login
            </Link>
          </div>

          {/* Quick links */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Links</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { href: "/data-entry", label: "Data Entry" },
                { href: "/indicators", label: "Indicators" },
                { href: "/reports", label: "Reports" },
                { href: "/settings", label: "Settings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-[#D96455] hover:text-[#C9433B] underline underline-offset-2 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Nursing and Midwifery Council of Ghana &bull; Ministry of Health
          </p>
        </div>
      </div>
    </div>
  )
}
