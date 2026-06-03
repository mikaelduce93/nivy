"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Menu,
  X,
  Calendar,
  Users,
  Trophy,
  User,
  LogOut,
  HelpCircle,
  Cake,
  Search,
  ChevronDown,
  Music,
  Palette,
  Dumbbell,
  Star,
  Sparkles,
  Users2,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { SearchModal } from "@/components/search"
import { PandaLogo } from "@/components/brand/panda-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useT } from "@/lib/i18n"

export function Navbar() {
  const t = useT()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.warn("[v0] Auth check failed:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // S'abonner aux SIGNED_IN / SIGNED_OUT : la navbar vit dans le root layout
    // persistant (app/layout.tsx) et ne se re-monte pas pendant les navigations
    // soft du login → sans abonnement, `user` reste figé sur l'état déconnecté
    // jusqu'à un refresh manuel. Garde le mock client (lib/supabase/client.ts)
    // qui n'expose pas onAuthStateChange.
    if (typeof supabase.auth.onAuthStateChange === "function") {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (_event: string, session: { user?: { id: string } } | null) => setUser(session?.user ?? null),
      )
      return () => subscription?.unsubscribe()
    }
  }, [])

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.push("/")
    } catch (error) {
      console.warn("[v0] Logout failed:", error)
    }
  }

  type MenuSubItem = {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }
  type MenuSection = {
    title: string
    items: MenuSubItem[]
  }
  type MenuItem = {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    href: string
    megaMenu?: MenuSection[]
  }

  // Taxonomie lifestyle-first : 4 piliers identiques sur toutes les pages.
  // On entre par CE QU'ON FAIT. Mêmes cibles dans navbar / footer / mobile-dock.
  const menuItems: MenuItem[] = [
    {
      id: "sport-clubs",
      label: "Sport & clubs",
      icon: Dumbbell,
      href: "/clubs",
      megaMenu: [
        {
          title: "Explorer",
          items: [
            { label: "Clubs", href: "/clubs", icon: Trophy },
            { label: "Agenda", href: "/agenda", icon: Calendar },
            { label: "Devenir coach", href: "/devenir-coach", icon: Dumbbell },
          ],
        },
      ],
    },
    {
      id: "etudes",
      label: "Études",
      icon: HelpCircle,
      href: "/aide",
      megaMenu: [
        {
          title: "Explorer",
          items: [
            { label: "Trouver un mentor", href: "/devenir-mentor", icon: Users },
            { label: "Trouver un prof", href: "/devenir-teacher", icon: Star },
            { label: "Centre d'aide", href: "/aide", icon: HelpCircle },
          ],
        },
      ],
    },
    {
      id: "creation",
      label: "Création",
      icon: Palette,
      href: "/galerie",
      megaMenu: [
        {
          title: "Explorer",
          items: [
            { label: "Galerie", href: "/galerie", icon: Palette },
            { label: "DJs", href: "/djs", icon: Music },
            { label: "Devenir créateur", href: "/devenir-createur", icon: Sparkles },
          ],
        },
      ],
    },
    {
      id: "sorties-crew",
      label: "Sorties & crew",
      icon: Calendar,
      href: "/agenda",
      megaMenu: [
        {
          title: "Explorer",
          items: [
            { label: "Agenda", href: "/agenda", icon: Calendar },
            { label: "Anniversaires", href: "/anniversaires", icon: Cake },
            { label: "Communauté", href: "/communaute", icon: Users2 },
          ],
        },
      ],
    },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-paper/90 backdrop-blur-md border-b-2 border-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            aria-label={t("nav.ariaLogo")}
          >
            <PandaLogo variant="icon" size="md" />
            <span className="hidden sm:block">
              <PandaLogo variant="wordmark" size="md" />
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1" role="menubar">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setActiveMenu(item.id)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <Link
                  href={item.href}
                  prefetch={item.href === "/auth/login" || item.href === "/auth/sign-up" || item.href === "/onboarding" || item.href === "/agenda"}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  role="menuitem"
                  aria-haspopup={item.megaMenu ? "true" : undefined}
                  aria-expanded={item.megaMenu ? activeMenu === item.id : undefined}
                  onFocus={() => item.megaMenu && setActiveMenu(item.id)}
                  onBlur={(e) => {
                    // Only close if focus moves outside the menu container
                    const relatedTarget = e.relatedTarget as HTMLElement
                    if (!e.currentTarget.parentElement?.contains(relatedTarget)) {
                      setActiveMenu(null)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (item.megaMenu && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
                      e.preventDefault()
                      setActiveMenu(item.id)
                    }
                    if (e.key === 'Escape') {
                      setActiveMenu(null)
                    }
                  }}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                  {item.megaMenu && <ChevronDown className={cn("w-3 h-3 transition-transform", activeMenu === item.id && "rotate-180")} aria-hidden="true" />}
                </Link>

                {/* Mega Menu */}
                {item.megaMenu && activeMenu === item.id && (
                  <div 
                    className="absolute top-full left-0 mt-2 w-[600px] bg-popover/95  border border-border rounded-xl shadow-2xl p-6 grid grid-cols-2 gap-6 animate-in fade-in-0 zoom-in-95 duration-200"
                    role="menu"
                    aria-label={`${item.label} sous-menu`}
                    onBlur={(e) => {
                      const relatedTarget = e.relatedTarget as HTMLElement
                      if (!e.currentTarget.contains(relatedTarget) && !e.currentTarget.parentElement?.contains(relatedTarget)) {
                        setActiveMenu(null)
                      }
                    }}
                  >
                    {item.megaMenu.map((section) => (
                      <div key={section.title} role="group" aria-label={section.title}>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          {section.title}
                        </h3>
                        <div className="space-y-1">
                          {section.items.map((subItem) => (
                            <Link
                              key={subItem.label}
                              href={subItem.href}
                              prefetch={subItem.href === "/auth/login" || subItem.href === "/auth/sign-up" || subItem.href === "/onboarding" || subItem.href.startsWith("/espace")}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted"
                              role="menuitem"
                              onClick={() => setActiveMenu(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  setActiveMenu(null)
                                }
                              }}
                            >
                              {subItem.icon && (
                                <subItem.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                              )}
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors ml-2"
              aria-label="Rechercher (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
              <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {!user && (
              <>
                <Link href="/auth/login" prefetch={true}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link href="/onboarding" prefetch={true}>
                  <Button size="sm">{t("nav.signup")}</Button>
                </Link>
              </>
            )}
            {user && (
              <>
                <Link href="/espace" prefetch={true}>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <User className="w-4 h-4 mr-2" />
                    Mon espace
                  </Button>
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive/80"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.logout")}
                </Button>
              </>
            )}
            {/* i18n: locale switcher (FR-only in V1; greyed-out for AR/Darija/EN). */}
            <LocaleSwitcher variant="compact" />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label={mobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          role="navigation"
          aria-label="Menu mobile"
          className="lg:hidden border-t-2 border-ink bg-paper/95 backdrop-blur-md max-h-[80vh] overflow-y-auto"
        >
          <div className="px-4 py-6 space-y-4">
            {menuItems.map((item) => (
              <div key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 text-primary" />
                  {item.label}
                </Link>

                {item.megaMenu && (
                  <div className="mt-2 ml-4 space-y-1">
                    {item.megaMenu.map((section) => (
                      <div key={section.title} className="mb-3">
                        <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {section.title}
                        </p>
                        {section.items.map((subItem) => (
                          <Link
                            key={subItem.label}
                            href={subItem.href}
                            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-sm"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {subItem.icon && <subItem.icon className="w-4 h-4" />}
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile User Actions */}
            <div className="pt-4 border-t border-border space-y-2">
              <Button
                onClick={() => {
                  setMobileMenuOpen(false)
                  setSearchOpen(true)
                }}
                variant="outline"
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Rechercher
              </Button>
              {!user ? (
                <>
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link href="/onboarding" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">{t("nav.signup")}</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/espace" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <User className="w-4 h-4 mr-2" />
                      Mon espace
                    </Button>
                  </Link>
                  <Button
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                    variant="outline"
                    className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.logout")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  )
}
