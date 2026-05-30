"use client"

/**
 * DemoAccountSwitcher — dev/staging only
 *
 * Renders a collapsible panel with 1-click sign-in buttons for the 15 seeded
 * test accounts (see scripts/seed-all-test-accounts.ts + docs/TEST_ACCOUNTS.md).
 * Mounted on the login page so the founder/QA can switch roles without retyping.
 *
 * Self-gates on NODE_ENV !== 'production'. Returns null in prod.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Loader2, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = "parent" | "teen" | "ambassador" | "admin" | "partner" | "mentor"

interface DemoAccount {
  email: string
  label: string
  hint?: string
}

const PASSWORD = "Test123!"

const ACCOUNTS: Record<Role, DemoAccount[]> = {
  parent: [
    { email: "parent.test@teenclub.ma", label: "Parent Free", hint: "Tier de base" },
    { email: "parent.silver@teenclub.ma", label: "Parent Silver", hint: "−10%" },
    { email: "parent.gold@teenclub.ma", label: "Parent Gold", hint: "−20%" },
    { email: "parent.platinum@teenclub.ma", label: "Parent Platinum", hint: "−30%" },
  ],
  teen: [
    { email: "teen.amine@teenclub.ma", label: "Amine", hint: "Niv. 1 Rookie" },
    { email: "teen.sara@teenclub.ma", label: "Sara", hint: "Niv. 50 Champion" },
  ],
  admin: [
    { email: "admin.test@teenclub.ma", label: "Admin", hint: "Full access" },
    { email: "moderator.test@teenclub.ma", label: "Moderator", hint: "Modération" },
    { email: "support.test@teenclub.ma", label: "Support", hint: "Tickets" },
  ],
  partner: [
    { email: "retail.partner@teenclub.ma", label: "TechStore", hint: "Retail" },
    { email: "venue.partner@teenclub.ma", label: "Le Rooftop", hint: "Venue" },
    { email: "club.partner@teenclub.ma", label: "Fitness Academy", hint: "Club" },
    { email: "education.partner@teenclub.ma", label: "Code Academy", hint: "Education" },
  ],
  ambassador: [{ email: "ambassador.test@teenclub.ma", label: "Ambassador", hint: "15% commission" }],
  mentor: [{ email: "mentor.test@teenclub.ma", label: "Mentor", hint: "Sessions" }],
}

const ROLE_META: Record<Role, { title: string; emoji: string; ring: string }> = {
  parent: { title: "Parents", emoji: "👨‍👩‍👧", ring: "ring-teal/40" },
  teen: { title: "Teens", emoji: "🧑", ring: "ring-teal/40" },
  admin: { title: "Admins", emoji: "🛡️", ring: "ring-gold/40" },
  partner: { title: "Partners", emoji: "🏪", ring: "ring-pink/40" },
  ambassador: { title: "Ambassadors", emoji: "🎯", ring: "ring-lime/40" },
  mentor: { title: "Mentors", emoji: "🧭", ring: "ring-pink/40" },
}

export function DemoAccountSwitcher() {
  const [open, setOpen] = useState(false)
  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  if (process.env.NODE_ENV === "production") return null

  const signInAs = async (email: string) => {
    setBusyEmail(email)
    setError(null)
    try {
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
      if (signErr) throw signErr
      startTransition(() => {
        router.push("/auth/redirect")
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed")
      setBusyEmail(null)
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/5 p-3 text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-gold hover:text-gold"
        aria-expanded={open}
        aria-controls="demo-accounts-panel"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Mode démo — accès rapide ({sumAccounts()} comptes)
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id="demo-accounts-panel" className="mt-3 space-y-3">
          <p className="text-xs text-gold/80">
            Mot de passe universel : <code className="rounded bg-gold/20 px-1 py-0.5 font-mono">{PASSWORD}</code>{" "}
            · Click un compte = connexion auto.
          </p>

          {(Object.keys(ACCOUNTS) as Role[]).map((role) => {
            const meta = ROLE_META[role]
            const list = ACCOUNTS[role]
            return (
              <div key={role}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-mute">
                  <span className="mr-1">{meta.emoji}</span>
                  {meta.title}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {list.map((acc) => {
                    const busy = busyEmail === acc.email
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => signInAs(acc.email)}
                        disabled={busyEmail !== null}
                        className={`group relative flex flex-col items-start rounded-lg border border-ink bg-card px-2.5 py-1.5 text-left text-xs transition hover:border-line hover:bg-card focus-visible:outline-none focus-visible:ring-2 ${meta.ring} disabled:opacity-50`}
                      >
                        <span className="font-semibold text-ink-2">
                          {busy ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              Connexion…
                            </span>
                          ) : (
                            acc.label
                          )}
                        </span>
                        {acc.hint && !busy && (
                          <span className="text-[10px] text-mute">{acc.hint}</span>
                        )}
                        <span className="mt-0.5 truncate text-[10px] text-mute" title={acc.email}>
                          {acc.email.split("@")[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {error && (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <p className="text-[10px] text-mute">
            Visible uniquement en développement. Reseed : <code>npx tsx scripts/seed-all-test-accounts.ts</code>
          </p>
        </div>
      )}
    </div>
  )
}

function sumAccounts() {
  return Object.values(ACCOUNTS).reduce((n, list) => n + list.length, 0)
}
