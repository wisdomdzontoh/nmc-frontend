import Link from "next/link"
import Image from "next/image"
import { Compass, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

const QUICK_LINKS = [
  { href: "/data-entry", label: "Data Entry" },
  { href: "/reports", label: "Reports" },
  { href: "/visualizations", label: "Visualizations" },
  { href: "/settings", label: "Settings" },
]

export default function NotFound() {
  return (
    <div className="canvas-dots flex min-h-screen flex-col">
      <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-6">
        <span className="relative h-9 w-16 shrink-0">
          <Image src="/logo.png" alt="" fill sizes="64px" className="object-contain" priority />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">Nursing &amp; Midwifery Council</p>
          <p className="text-xs text-muted-foreground">Republic of Ghana</p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Compass className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">Error 404</p>
            <h1 className="text-2xl font-bold text-foreground">We couldn&apos;t find that page</h1>
            <p className="text-sm text-muted-foreground">
              The link may be old or mistyped. Go to the dashboard, or pick one of the pages below.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
          </div>

          <div className="border-t border-dashed border-border pt-5">
            <p className="stat-card-label">Quick links</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {QUICK_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-link hover:underline">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-surface-subtle p-3 text-left text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              This is an official system of the Nursing and Midwifery Council of Ghana. Unauthorised access is
              prohibited under the Electronic Transactions Act, 2008.
            </p>
          </div>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Nursing and Midwifery Council of Ghana &bull; Ministry of Health
      </footer>
    </div>
  )
}
