"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  LifeBuoy,
  Lightbulb,
  MessageCircleQuestion,
  Search,
  X,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { roleLabel } from "@/components/layout/navConfig"
import { PageCard } from "@/components/layout/PageCard"
import { SectionCard } from "@/components/common/section-card"
import { StatusPill } from "@/components/common/status-pill"
import { EmptyState } from "@/components/common/empty-state"
import { ScreenPreview } from "@/components/resources/ScreenPreview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { SectionLoader } from "@/components/ui/PageLoader"
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  GUIDES,
  guidesFor,
  quickAnswersFor,
  searchGuides,
  searchQuickAnswers,
  type Guide,
  type GuideCategory,
} from "@/lib/guides"
import { cn } from "@/lib/utils"

const DONE_KEY = "nmc_guides_done"

/** Guides this person has marked as done — a per-computer convenience only. */
function useDoneGuides() {
  const [done, setDone] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DONE_KEY)
      if (raw) setDone(new Set(JSON.parse(raw) as string[]))
    } catch {
      // storage blocked — start empty
    }
  }, [])
  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        window.localStorage.setItem(DONE_KEY, JSON.stringify([...next]))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }
  return { done, toggle }
}

const START_HERE: Record<"everyone" | "admin", string[]> = {
  everyone: ["enter-data", "find-reports", "build-pivot-table", "find-your-way"],
  admin: ["enter-data", "design-report-form", "assign-reports", "create-indicator"],
}

function GuideCard({ guide, done }: { guide: Guide; done: boolean }) {
  return (
    <Link
      href={`/resources?guide=${guide.id}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary-border hover:bg-primary-soft/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="icon-chip h-9 w-9">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex flex-wrap justify-end gap-1">
          {guide.audience === "admin" && <StatusPill tone="purple">Administrators</StatusPill>}
          {done && (
            <StatusPill tone="success" icon={CheckCircle2}>
              Done
            </StatusPill>
          )}
        </div>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">{guide.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{guide.summary}</p>
      <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {guide.minutes} min
        </span>
        <span>{guide.steps.length} steps</span>
        <ArrowRight className="ml-auto h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </p>
    </Link>
  )
}

function ContactCard() {
  return (
    <section className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
      <span className="icon-chip h-9 w-9">
        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-sm text-foreground">
        <span className="font-semibold">Still need help?</span> Contact the M&amp;E department for support.
      </p>
    </section>
  )
}

// ── Guide view ─────────────────────────────────────────────────────────────

function GuideView({ guide, visible, done, onToggleDone }: { guide: Guide; visible: Guide[]; done: boolean; onToggleDone: () => void }) {
  const related = (guide.related ?? [])
    .map((id) => visible.find((g) => g.id === id))
    .filter((g): g is Guide => Boolean(g))

  return (
    <div className="space-y-6 pb-10">
      <PageCard
        eyebrow={
          <Link href="/resources" className="inline-flex items-center gap-1 text-sm text-link hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All guides
          </Link>
        }
        title={guide.title}
        description={guide.summary}
        icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
        actions={
          guide.page ? (
            <Button asChild>
              <Link href={guide.page.href}>
                {guide.page.label}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="brand">{CATEGORY_LABELS[guide.category]}</StatusPill>
          <StatusPill tone="neutral" icon={Clock}>{`About ${guide.minutes} min`}</StatusPill>
          <StatusPill tone="neutral">{`${guide.steps.length} steps`}</StatusPill>
          {guide.audience === "admin" && <StatusPill tone="purple">For administrators</StatusPill>}
        </div>
      </PageCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <ol className="space-y-4">
          {guide.steps.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className={cn("grid gap-5", (step.screen || step.image) && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]")}>
                <div className="flex gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-base font-semibold text-foreground">
                      <span className="sr-only">Step {i + 1}: </span>
                      {step.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-foreground/90">{step.body}</p>
                    {step.tip && (
                      <p className="flex items-start gap-2 rounded-lg border border-info-border bg-info-bg px-3 py-2 text-sm text-info">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{step.tip}</span>
                      </p>
                    )}
                  </div>
                </div>
                {step.image ? (
                  <figure className="space-y-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot from /public */}
                    <img src={step.image} alt={step.caption ?? step.title} className="w-full rounded-xl border border-border" />
                    {step.caption && <figcaption className="text-xs text-muted-foreground">{step.caption}</figcaption>}
                  </figure>
                ) : step.screen ? (
                  <ScreenPreview screen={step.screen} caption={step.caption} />
                ) : null}
              </div>
            </li>
          ))}

          <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              {done ? "You've marked this guide as done." : "Finished? Mark this guide as done so it's easy to spot later."}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onToggleDone}>
                {done ? "Mark as not done" : "Mark as done"}
              </Button>
              {guide.page && (
                <Button asChild variant="outline">
                  <Link href={guide.page.href}>{guide.page.label}</Link>
                </Button>
              )}
            </div>
          </li>
        </ol>

        <aside className="space-y-4">
          <SectionCard title="In this guide">
            <ol className="space-y-1.5 text-sm">
              {guide.steps.map((s, i) => (
                <li key={s.title} className="flex gap-2 text-muted-foreground">
                  <span className="font-clinical w-4 shrink-0 text-right">{i + 1}.</span>
                  <span>{s.title}</span>
                </li>
              ))}
            </ol>
          </SectionCard>
          {related.length > 0 && (
            <SectionCard title="Related guides">
              <ul className="space-y-1">
                {related.map((g) => (
                  <li key={g.id}>
                    <Link href={`/resources?guide=${g.id}`} className="flex items-center gap-1.5 rounded-md px-1 py-1 text-sm text-link hover:bg-muted hover:underline">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </aside>
      </div>

      <ContactCard />
    </div>
  )
}

// ── Overview ───────────────────────────────────────────────────────────────

function ResourcesContent() {
  const { djangoUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdmin = Boolean(djangoUser?.is_staff || djangoUser?.is_superuser)
  const { done, toggle } = useDoneGuides()

  const guideId = searchParams.get("guide")
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [category, setCategory] = useState<GuideCategory | "all">("all")

  const visible = useMemo(() => guidesFor(isAdmin), [isAdmin])
  const answers = useMemo(() => quickAnswersFor(isAdmin), [isAdmin])

  // Keep the search in the address so it survives refresh and can be shared
  useEffect(() => {
    if (guideId) return
    const handle = setTimeout(() => {
      const q = query.trim()
      router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false })
    }, 300)
    return () => clearTimeout(handle)
  }, [query, guideId, pathname, router])

  // Scroll the content area back to the top when opening a guide
  useEffect(() => {
    document.getElementById("main-content")?.scrollTo({ top: 0 })
  }, [guideId])

  if (guideId) {
    const guide = visible.find((g) => g.id === guideId)
    if (!guide) {
      const exists = GUIDES.some((g) => g.id === guideId)
      return (
        <div className="space-y-6">
          <PageCard title="Help and resources" description="Step-by-step guides for the parts of the system you use." />
          <section className="rounded-xl border border-border bg-card">
            <EmptyState
              illustration={exists ? "no-access" : "no-results"}
              title={exists ? "This guide is for administrators" : "We couldn't find that guide"}
              description={
                exists
                  ? "It covers a page you don't use. Browse the guides for your work instead."
                  : "The link may be old. Browse or search the guides instead."
              }
              action={{ label: "Browse guides", href: "/resources" }}
            />
          </section>
        </div>
      )
    }
    return <GuideView guide={guide} visible={visible} done={done.has(guide.id)} onToggleDone={() => toggle(guide.id)} />
  }

  const searching = query.trim().length > 0
  const matchedGuides = searchGuides(visible, query).filter((g) => category === "all" || g.category === category)
  const matchedAnswers = searchQuickAnswers(answers, query)
  const categories = CATEGORY_ORDER.filter((c) => visible.some((g) => g.category === c))
  const startHere = START_HERE[isAdmin ? "admin" : "everyone"]
    .map((id) => visible.find((g) => g.id === id))
    .filter((g): g is Guide => Boolean(g))

  return (
    <div className="space-y-6 pb-10">
      <PageCard
        title="Help and resources"
        description="Step-by-step guides for the parts of the system you use. Search for what you want to do, or pick a topic."
        icon={<LifeBuoy className="h-5 w-5" aria-hidden="true" />}
        actions={<StatusPill tone="brand">{`Showing help for: ${roleLabel(djangoUser)}`}</StatusPill>}
      >
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="rounded-lg border border-border bg-surface-subtle p-3"
        >
          <label htmlFor="help-search" className="mb-1.5 block text-sm font-semibold text-foreground">
            What do you need help with?
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="help-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. submit a report, export to Excel, locked form"
              className="h-11 bg-card pr-10 pl-9 text-base"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by topic">
            {(["all", ...categories] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary-border hover:bg-primary-soft"
                )}
              >
                {c === "all" ? "All topics" : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </form>
      </PageCard>

      {!searching && category === "all" && (
        <section aria-labelledby="start-here">
          <h2 id="start-here" className="mb-3 text-base font-semibold text-foreground">
            Start here
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {startHere.map((g) => (
              <GuideCard key={g.id} guide={g} done={done.has(g.id)} />
            ))}
          </div>
        </section>
      )}

      {searching || category !== "all" ? (
        <section aria-live="polite">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            {matchedGuides.length === 0
              ? "No guides found"
              : `${matchedGuides.length} guide${matchedGuides.length === 1 ? "" : "s"}${searching ? ` for "${query.trim()}"` : ""}`}
          </h2>
          {matchedGuides.length === 0 ? (
            <section className="rounded-xl border border-border bg-card">
              <EmptyState
                illustration="no-results"
                title={`Nothing matches "${query.trim()}"`}
                description="Try a shorter word such as “report”, “period” or “export”, or look through the topics."
                action={{ label: "Show all guides", onClick: () => { setQuery(""); setCategory("all") } }}
              />
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {matchedGuides.map((g) => (
                <GuideCard key={g.id} guide={g} done={done.has(g.id)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        categories.map((c) => (
          <section key={c} aria-labelledby={`cat-${c}`}>
            <h2 id={`cat-${c}`} className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              {CATEGORY_LABELS[c]}
              <span className="rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground">
                {visible.filter((g) => g.category === c).length}
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible
                .filter((g) => g.category === c)
                .map((g) => (
                  <GuideCard key={g.id} guide={g} done={done.has(g.id)} />
                ))}
            </div>
          </section>
        ))
      )}

      {matchedAnswers.length > 0 && (
        <SectionCard
          icon={<MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />}
          title="Quick answers"
          description="Short answers to the questions people ask most."
        >
          <Accordion type="single" collapsible className="divide-y divide-border rounded-lg border border-border">
            {matchedAnswers.map((a) => {
              const linked = a.guide ? visible.find((g) => g.id === a.guide) : undefined
              return (
                <AccordionItem key={a.id} value={a.id} className="border-0 px-4">
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
                    {a.question}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{a.answer}</p>
                    {linked && (
                      <Link href={`/resources?guide=${linked.id}`} className="inline-flex items-center gap-1 text-link hover:underline">
                        Read: {linked.title}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </SectionCard>
      )}

      <ContactCard />
    </div>
  )
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<SectionLoader message="Loading help…" />}>
      <ResourcesContent />
    </Suspense>
  )
}
