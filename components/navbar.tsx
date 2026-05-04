"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Menu,
  X,
  Calendar,
  Users,
  Trophy,
  Ticket,
  User,
  LogOut,
  Settings,
  Gift,
  Award,
  ShieldCheck,
  HelpCircle,
  Cake,
  CreditCard,
  Search,
  ChevronDown,
  Music,
  Gamepad2,
  Palette,
  Dumbbell,
  Theater,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Heart,
  Sparkles,
  Handshake,
  Zap,
  Target,
  Users2,
  Coins,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SearchModal } from "@/components/search"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === "/"

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

  const fullMenuItems = [
    {
      id: "evenements",
      label: "Agenda",
      icon: Calendar,
      href: "/agenda",
      megaMenu: [
        {
          title: "Explorer",
          items: [
            { label: "Tous les événements", href: "/agenda", icon: Calendar },
            { label: "Ce weekend", href: "/agenda?filter=weekend", icon: Clock },
            { label: "Événements populaires", href: "/agenda?sort=popular", icon: Star },
          ],
        },
        {
          title: "Par ville",
          items: [
            { label: "Casablanca", href: "/agenda?city=casablanca", icon: MapPin },
            { label: "Marrakech", href: "/agenda?city=marrakech", icon: MapPin },
            { label: "Rabat", href: "/agenda?city=rabat", icon: MapPin },
            { label: "Tanger", href: "/agenda?city=tanger", icon: MapPin },
          ],
        },
        {
          title: "Par type",
          items: [
            { label: "Soirées", href: "/agenda?type=party", icon: Sparkles },
            { label: "Gaming", href: "/agenda?type=gaming", icon: Gamepad2 },
            { label: "Sport", href: "/agenda?type=sport", icon: Dumbbell },
            { label: "Culture", href: "/agenda?type=culture", icon: Theater },
          ],
        },
      ],
    },
    {
      id: "anniversaires",
      label: "Anniversaires",
      icon: Cake,
      href: "/anniversaires",
      megaMenu: [
        {
          title: "Formules",
          items: [
            { label: "Pack Essential", href: "/anniversaires#essential", icon: Cake },
            { label: "Pack Gold", href: "/anniversaires#gold", icon: Award },
            { label: "Pack Platinum", href: "/anniversaires#platinum", icon: Star },
            { label: "Pack Diamond", href: "/anniversaires#diamond", icon: Sparkles },
          ],
        },
        {
          title: "Services",
          items: [
            { label: "Configurateur", href: "/anniversaires", icon: Settings },
            { label: "Galerie photos", href: "/anniversaires#galerie", icon: MapPin },
            { label: "Témoignages", href: "/anniversaires#temoignages", icon: Heart },
            { label: "FAQ Anniversaires", href: "/anniversaires#faq", icon: HelpCircle },
          ],
        },
      ],
    },
    {
      id: "clubs",
      label: "Clubs",
      icon: Trophy,
      href: "/clubs",
      megaMenu: [
        {
          title: "Nos clubs",
          items: [
            { label: "Club Danse", href: "/clubs?category=dance", icon: Music },
            { label: "Club Gaming", href: "/clubs?category=gaming", icon: Gamepad2 },
            { label: "Club Créatif", href: "/clubs?category=creative", icon: Palette },
            { label: "Club Sport", href: "/clubs?category=sport", icon: Dumbbell },
          ],
        },
        {
          title: "Inscription",
          items: [
            { label: "Essai gratuit", href: "/clubs#trial", icon: Gift },
            { label: "Abonnements", href: "/clubs#pricing", icon: DollarSign },
            { label: "Planning", href: "/clubs#planning", icon: Calendar },
          ],
        },
      ],
    },
    {
      id: "programmes",
      label: "Programmes",
      icon: Sparkles,
      href: "/gamification",
      megaMenu: [
        {
          title: "Level Up",
          items: [
            { label: "Mon niveau", href: "/gamification", icon: Zap },
            { label: "Missions du jour", href: "/gamification/missions", icon: Target },
            { label: "Mes badges", href: "/gamification/badges", icon: Award },
            { label: "Ma collection", href: "/gamification/collections", icon: Gift },
          ],
        },
        {
          title: "Carte VIP",
          items: [
            { label: "Silver (Gratuit)", href: "/carte-vip#silver", icon: Award },
            { label: "Gold (299dh/an)", href: "/carte-vip#gold", icon: Star },
            { label: "Platinum (599dh/an)", href: "/carte-vip#platinum", icon: Sparkles },
            { label: "Récompenses", href: "/carte-vip/recompenses", icon: Gift },
            { label: "Partenaires", href: "/carte-vip#partenaires", icon: Handshake },
            { label: "Parrainage", href: "/carte-vip#parrainage", icon: Heart },
          ],
        },
      ],
    },
    {
      id: "opportunites",
      label: "Opportunités",
      icon: Handshake,
      href: "/devenir-partenaire",
      megaMenu: [
        {
          title: "Collabore avec nous",
          items: [
            { label: "Devenir Ambassadeur", href: "/devenir-ambassadeur", icon: Award },
            { label: "Devenir Partenaire", href: "/devenir-partenaire", icon: Handshake },
            { label: "Devenir Influenceur", href: "/devenir-influenceur", icon: Sparkles },
          ],
        },
      ],
    },
    {
      id: "mon-espace",
      label: "Mon Espace",
      icon: User,
      href: user ? "/espace" : "/auth/login",
      megaMenu: user
        ? [
            {
              title: "Mon espace",
              items: [
                { label: "Tableau de bord", href: "/espace", icon: User },
                { label: "Mes réservations", href: "/espace", icon: Ticket },
                { label: "Mes clubs", href: "/espace", icon: Trophy },
              ],
            },
            {
              title: "Compte",
              items: [
                { label: "Mon profil", href: "/espace", icon: Settings },
                { label: "Aide", href: "/aide", icon: HelpCircle },
              ],
            },
          ]
        : [
            {
              title: "Connexion",
              items: [
                { label: "Se connecter", href: "/auth/login", icon: User },
                { label: "S'inscrire", href: "/auth/sign-up", icon: Sparkles },
              ],
            },
          ],
    },
  ]

  const homeMenuItems = [
    {
      id: "agenda",
      label: "Agenda",
      icon: Calendar,
      href: "/agenda",
    },
    {
      id: "anniversaires",
      label: "Anniversaires",
      icon: Cake,
      href: "/anniversaires",
    },
    {
      id: "clubs",
      label: "Clubs",
      icon: Trophy,
      href: "/clubs",
    },
    {
      id: "parents",
      label: "Parents",
      icon: ShieldCheck,
      href: "/guide-parents",
    },
  ]

  const menuItems = isHome ? homeMenuItems : fullMenuItems

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-chart-4 to-accent flex items-center justify-center font-bold text-xl text-primary-foreground">
              TP
            </div>
            <span className="font-bold text-xl hidden sm:block">
              <span className="text-gradient">Teens Party</span>
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
                    className="absolute top-full left-0 mt-2 w-[600px] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-6 grid grid-cols-2 gap-6 animate-in fade-in-0 zoom-in-95 duration-200"
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
                              key={subItem.href}
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

            {!isHome && (
              <>
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
              </>
            )}
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
                    Connexion
                  </Button>
                </Link>
                <Link href="/auth/sign-up" prefetch={true}>
                  <Button size="sm">Inscription</Button>
                </Link>
              </>
            )}
            {user && (
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive/80"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
          className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl max-h-[80vh] overflow-y-auto"
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
                            key={subItem.href}
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
              {!user ? (
                <>
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Inscription</Button>
                  </Link>
                </>
              ) : (
                <Button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  variant="outline"
                  className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
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
